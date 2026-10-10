"""Helpers for tests: create the DynamoDB tables (in moto) with the deployed key schema."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .config import Settings
from .store import CASES_BY_SYSTEM

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
