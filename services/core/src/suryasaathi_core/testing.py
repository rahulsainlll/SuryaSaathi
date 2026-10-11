"""Helpers for tests: create the DynamoDB tables (in moto) with the deployed key schema."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from .config import Settings
from .paths import schemas_package
from .schemas import validate
from .store import CASES_BY_SYSTEM, Store

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource


def create_tables(db: DynamoDBServiceResource, settings: Settings | None = None) -> Settings:
    s = settings or Settings()

    def table(name: str, keys: list[tuple[str, str]], **extra: Any) -> None:
        db.create_table(
            TableName=name,
            KeySchema=[
                {"AttributeName": k, "KeyType": "HASH" if i == 0 else "RANGE"}
                for i, (k, _) in enumerate(keys)
            ],
            AttributeDefinitions=[
                {"AttributeName": k, "AttributeType": "S"}
                for k in sorted({k for k, _ in keys} | set(extra.pop("extra_attributes", [])))
            ],
            BillingMode="PAY_PER_REQUEST",
            **extra,
        )

    table(s.systems_table, [("systemId", "S")])
    table(
        s.readings_table,
        [("systemId", "S"), ("date", "S")],
        StreamSpecification={"StreamEnabled": True, "StreamViewType": "NEW_IMAGE"},
    )
    table(
        s.cases_table,
        [("caseId", "S")],
        extra_attributes=["systemId", "openedAt"],
        GlobalSecondaryIndexes=[
            {
                "IndexName": CASES_BY_SYSTEM,
                "KeySchema": [
                    {"AttributeName": "systemId", "KeyType": "HASH"},
                    {"AttributeName": "openedAt", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
    )
    table(s.expected_table, [("systemId", "S"), ("date", "S")])
    table(s.summaries_table, [("pk", "S"), ("sk", "S")])
    return s


def system_record(system_id: str = "SS-SIM-0001", **overrides: Any) -> dict[str, Any]:
    """A valid system.schema.json record for tests and the simulator."""
    record: dict[str, Any] = {
        "systemId": system_id,
        "capacityKw": 3,
        "location": {"lat": 28.5921, "lon": 77.046, "zone": "dwarka"},
        "vendorId": "VND-DL-0042",
        "discomId": "DISCOM-DL",
        "dataSource": "data_logger",
        "installedOn": "2026-04-01",
        "consent": {"granted": True, "recordedAt": "2026-04-01T10:00:00Z"},
    }
    record.update(overrides)
    return record


def console_fixture() -> tuple[dict[str, Any], dict[str, Any]]:
    """The console-fleet fixture: the fleet, and every response the TypeScript computes."""
    folder = schemas_package() / "fixtures" / "console"
    fleet = json.loads((folder / "fleet.json").read_text())
    expected = json.loads((folder / "expected.json").read_text())
    return fleet, expected


def load_console_fleet(store: Store, fleet: dict[str, Any]) -> None:
    """Writes a console fleet into the tables the way ingest and the agents store it."""
    for s in fleet["systems"]:
        consent: dict[str, Any] = {"granted": s["consent"]}
        if s.get("consentRecordedAt"):
            consent["recordedAt"] = s["consentRecordedAt"]
        system = {
            "systemId": s["systemId"],
            "dsain": s.get("dsain"),
            "capacityKw": s["capacityKw"],
            "location": s["location"],
            "vendorId": s["vendorId"],
            "discomId": "DISCOM-DL",
            "dataSource": s["dataSource"],
            "installedOn": s.get("installedOn"),
            "consent": consent,
        }
        if s["simulated"]:
            system["simulation"] = {
                "scenario": "console-fleet",
                "firstDate": s["readings"][0]["date"],
            }
        validate("system", to_plain(system))
        store.put_system(system)
        for r in s["readings"]:
            reason = r["reasons"][-1] if r["reasons"] else None
            store.put_reading(
                {
                    "systemId": s["systemId"],
                    "date": r["date"],
                    "source": s["dataSource"],
                    "energyKwh": r["energyKwh"],
                    "faultCode": r.get("faultCode"),
                    "receivedAt": f"{r['date']}T18:30:00Z",
                    "expectedKwh": r["expectedKwh"],
                    "performance": r["performance"],
                    "rained": r["rained"],
                    "diagnosis": r["diagnosis"],
                    "action": r["action"],
                    "reason": reason and reason["text"],
                    "reasonSource": reason and reason["source"],
                }
            )
    for k in fleet["cases"]:
        store.create_case(
            {
                **k,
                "openedAt": f"{k['openedDate']}T06:00:00Z",
                "vendorDeadline": f"{k['deadlineDate']}T06:00:00Z",
            }
        )


def to_plain(value: Any) -> Any:
    """Drops None values, recursively (schemas reject nulls where a field is optional)."""
    if isinstance(value, dict):
        return {k: to_plain(v) for k, v in value.items() if v is not None}
    return value
