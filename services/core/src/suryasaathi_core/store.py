"""DynamoDB access for systems, readings, cases and the expected-output cache.

Table keys (infra/lib/stacks/data-stack.ts creates them to match):

- systems:  systemId
- readings: systemId + date (stream: new images, read by the agent)
- cases:    caseId, with index ``bySystem`` on systemId + openedAt
- expected: systemId + date
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING, Any

import boto3
from boto3.dynamodb.conditions import Key

from .config import Settings

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource

CASES_BY_SYSTEM = "bySystem"


def to_item(value: Any) -> Any:
    """Converts floats to Decimal (DynamoDB rejects floats), recursively."""
    if isinstance(value, float):
        return Decimal(repr(value))
    if isinstance(value, Mapping):
        return {k: to_item(v) for k, v in value.items() if v is not None}
    if isinstance(value, list | tuple):
        return [to_item(v) for v in value]
    return value


def from_item(value: Any) -> Any:
    """Converts DynamoDB Decimals back to int or float, recursively."""
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, Mapping):
        return {k: from_item(v) for k, v in value.items()}
    if isinstance(value, list):
        return [from_item(v) for v in value]
    return value


class Store:
    def __init__(
        self, settings: Settings | None = None, resource: DynamoDBServiceResource | None = None
    ) -> None:
        self.settings = settings or Settings.from_env()
        db = resource or boto3.resource("dynamodb")
        self.systems = db.Table(self.settings.systems_table)
        self.readings = db.Table(self.settings.readings_table)
        self.cases = db.Table(self.settings.cases_table)
        self.expected = db.Table(self.settings.expected_table)

    # systems
    def get_system(self, system_id: str) -> dict[str, Any] | None:
        item = self.systems.get_item(Key={"systemId": system_id}).get("Item")
        return from_item(item) if item else None

    def put_system(self, system: Mapping[str, Any]) -> None:
        self.systems.put_item(Item=to_item(system))

    def list_systems(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        kwargs: dict[str, Any] = {}
        while True:
            page = self.systems.scan(**kwargs)
            items += [from_item(i) for i in page.get("Items", [])]
            if "LastEvaluatedKey" not in page:
                return items
            kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]

    # readings
    def put_reading(self, reading: Mapping[str, Any]) -> None:
        self.readings.put_item(Item=to_item(reading))

    def get_reading(self, system_id: str, day: str) -> dict[str, Any] | None:
        item = self.readings.get_item(Key={"systemId": system_id, "date": day}).get("Item")
        return from_item(item) if item else None

    def readings_between(self, system_id: str, first: str, last: str) -> list[dict[str, Any]]:
        """Readings with first <= date <= last, oldest first."""
        page = self.readings.query(
            KeyConditionExpression=Key("systemId").eq(system_id) & Key("date").between(first, last)
        )
        return [from_item(i) for i in page.get("Items", [])]

    def recent_readings(self, system_id: str, day: str, days: int) -> list[dict[str, Any]]:
        """The ``days`` days up to and including ``day``."""
        first = (date.fromisoformat(day) - timedelta(days=days - 1)).isoformat()
        return self.readings_between(system_id, first, day)

    def annotate_reading(self, system_id: str, day: str, fields: Mapping[str, Any]) -> None:
        """Adds the agent's findings to a stored reading (ignored by the agent's stream filter)."""
        values = {k: v for k, v in fields.items() if v is not None}
        if not values:
            return
        names = {f"#{k}": k for k in values}
        self.readings.update_item(
            Key={"systemId": system_id, "date": day},
            UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in values),
            ExpressionAttributeNames=names,
            ExpressionAttributeValues={f":{k}": to_item(v) for k, v in values.items()},
        )

    # expected output cache
    def get_expected(self, system_id: str, day: str) -> dict[str, Any] | None:
        item = self.expected.get_item(Key={"systemId": system_id, "date": day}).get("Item")
        return from_item(item) if item else None

    def put_expected(self, record: Mapping[str, Any]) -> None:
        self.expected.put_item(Item=to_item(record))

    # cases
    def create_case(self, case: Mapping[str, Any]) -> bool:
        """Stores a new case; False if one with the same id already exists."""
        try:
            self.cases.put_item(
                Item=to_item(case), ConditionExpression="attribute_not_exists(caseId)"
            )
        except self.cases.meta.client.exceptions.ConditionalCheckFailedException:
            return False
        return True

    def get_case(self, case_id: str) -> dict[str, Any] | None:
        item = self.cases.get_item(Key={"caseId": case_id}).get("Item")
        return from_item(item) if item else None

    def update_case(self, case_id: str, fields: Mapping[str, Any]) -> dict[str, Any]:
        names = {f"#{k}": k for k in fields}
        result = self.cases.update_item(
            Key={"caseId": case_id},
            UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in fields),
            ExpressionAttributeNames=names,
            ExpressionAttributeValues={f":{k}": to_item(v) for k, v in fields.items()},
            ReturnValues="ALL_NEW",
        )
        updated: dict[str, Any] = from_item(result["Attributes"])
        return updated

    def open_case(self, system_id: str) -> dict[str, Any] | None:
        """The system's newest case that isn't verified yet, if any."""
        page = self.cases.query(
            IndexName=CASES_BY_SYSTEM,
            KeyConditionExpression=Key("systemId").eq(system_id),
            ScanIndexForward=False,
            Limit=5,
        )
        for item in page.get("Items", []):
            if item.get("status") != "verified":
                case: dict[str, Any] = from_item(item)
                return case
        return None
