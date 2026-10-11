"""The console's summary items: written nightly by services/rollups, read by
services/console-api, so the console never scans raw readings.

One table, key ``pk`` + ``sk``:

==================  ==================  =================================================
pk                  sk                  item
==================  ==================  =================================================
``FLEET``           ``LATEST``          asOf, totals, energy lost by cause, simulated
``FLEET``           ``DAY#<date>``      fleet daily totals (a console FleetPoint)
``VENDOR``          ``<vendorId>``      a VendorRow
``VENDOR#<id>``     ``DAY#<date>``      the vendor's daily totals
``ZONE``            ``<zone>``          a ZoneRow
``ZONE#<zone>``     ``DAY#<date>``      the zone's daily totals
``SYSTEM``          ``<systemId>``      a SystemSummary plus location, install and consent
==================  ==================  =================================================

Day items are kept, so the history outlives the readings window; the rows under
``VENDOR``, ``ZONE`` and ``SYSTEM`` are replaced on every run.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from decimal import Decimal
from typing import TYPE_CHECKING, Any

import boto3
from boto3.dynamodb.conditions import ConditionBase, Key

from .config import Settings
from .store import from_item

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource

FLEET = "FLEET"
LATEST = "LATEST"
VENDOR = "VENDOR"
ZONE = "ZONE"
SYSTEM = "SYSTEM"
#: Partitions whose rows are replaced wholesale by each run.
ROW_PARTITIONS = (VENDOR, ZONE, SYSTEM)
KEYS = ("pk", "sk")


def day_sk(day: str) -> str:
    return f"DAY#{day}"


def series_pk(kind: str, key: str) -> str:
    """Partition of a vendor's or zone's day items, e.g. ``VENDOR#VND-DL-0042``."""
    return f"{kind}#{key}"


def to_summary_item(value: Any) -> Any:
    """Like ``store.to_item`` but keeps nulls: the console's shapes have nullable fields."""
    if isinstance(value, float):
        return Decimal(repr(value))
    if isinstance(value, Mapping):
        return {k: to_summary_item(v) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [to_summary_item(v) for v in value]
    return value


def strip_keys(item: Mapping[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in item.items() if k not in KEYS}


class Summaries:
    def __init__(
        self, settings: Settings | None = None, resource: DynamoDBServiceResource | None = None
    ) -> None:
        self.settings = settings or Settings.from_env()
        db = resource or boto3.resource("dynamodb")
        self.table = db.Table(self.settings.summaries_table)

    def get(self, pk: str, sk: str) -> dict[str, Any] | None:
        item = self.table.get_item(Key={"pk": pk, "sk": sk}).get("Item")
        return strip_keys(from_item(item)) if item else None

    def query(self, pk: str, first_sk: str | None = None, last_sk: str | None = None) -> list[Any]:
        """Items of one partition in sort-key order, optionally with first <= sk <= last."""
        condition: ConditionBase = Key("pk").eq(pk)
        if first_sk is not None and last_sk is not None:
            condition = condition & Key("sk").between(first_sk, last_sk)
        items: list[dict[str, Any]] = []
        kwargs: dict[str, Any] = {"KeyConditionExpression": condition}
        while True:
            page = self.table.query(**kwargs)
            items += [strip_keys(from_item(i)) for i in page.get("Items", [])]
            if "LastEvaluatedKey" not in page:
                return items
            kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]

    def days(self, pk: str, first: str, last: str) -> list[dict[str, Any]]:
        return self.query(pk, day_sk(first), day_sk(last))

    def keys(self, pk: str) -> set[str]:
        keys: set[str] = set()
        kwargs: dict[str, Any] = {
            "KeyConditionExpression": Key("pk").eq(pk),
            "ProjectionExpression": "sk",
        }
        while True:
            page = self.table.query(**kwargs)
            keys |= {str(i["sk"]) for i in page.get("Items", [])}
            if "LastEvaluatedKey" not in page:
                return keys
            kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]

    def replace(self, items: Iterable[Mapping[str, Any]]) -> dict[str, int]:
        """Writes ``items`` and deletes rows under ROW_PARTITIONS that weren't written."""
        items = list(items)
        written: dict[str, set[str]] = {pk: set() for pk in ROW_PARTITIONS}
        with self.table.batch_writer(overwrite_by_pkeys=list(KEYS)) as batch:
            for item in items:
                batch.put_item(Item=to_summary_item(item))
                if item["pk"] in written:
                    written[item["pk"]].add(item["sk"])
        stale = [(pk, sk) for pk in ROW_PARTITIONS for sk in self.keys(pk) - written[pk]]
        with self.table.batch_writer() as batch:
            for pk, sk in stale:
                batch.delete_item(Key={"pk": pk, "sk": sk})
        return {"written": len(items), "deleted": len(stale)}
