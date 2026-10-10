from collections.abc import Iterator
from typing import Any

import boto3
import pytest
from moto import mock_aws
from suryasaathi_core.fixtures import load_fixture
from suryasaathi_core.store import Store
from suryasaathi_core.testing import create_tables, system_record
from suryasaathi_ingest.handler import ingest


@pytest.fixture
def db(monkeypatch: pytest.MonkeyPatch) -> Iterator[Store]:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-south-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    with mock_aws():
        resource = boto3.resource("dynamodb")
        store = Store(create_tables(resource), resource)
        store.put_system(system_record("SS-SIM-0001"))
        yield store


def reading(**overrides: Any) -> dict[str, Any]:
    r = dict(load_fixture("fault").days[12].reading)
    r.update({"systemId": "SS-SIM-0001", **overrides})
    return r


def test_stores_a_valid_reading(db: Store) -> None:
    result = ingest({**reading(), "topicSystemId": "SS-SIM-0001"}, db)
    assert result == {"status": "stored", "systemId": "SS-SIM-0001", "date": "2026-10-11"}
    stored = db.get_reading("SS-SIM-0001", "2026-10-11")
    assert stored is not None
    assert stored["faultCode"] == "E-07"
    assert "topicSystemId" not in stored


def test_rejects_readings_that_break_the_schema(db: Store) -> None:
    assert ingest(reading(energyKwh=-1), db) == {"status": "rejected", "reason": "invalid_reading"}
    assert ingest({**reading(), "extra": 1}, db)["reason"] == "invalid_reading"


def test_rejects_unknown_systems_and_topic_mismatches(db: Store) -> None:
    assert ingest(reading(systemId="SS-OTHER"), db)["reason"] == "unknown_system"
    assert ingest({**reading(), "topicSystemId": "SS-SIM-0002"}, db)["reason"] == "topic_mismatch"


def test_rejects_systems_without_consent(db: Store) -> None:
    db.put_system(
        system_record(
            "SS-SIM-0001", consent={"granted": False, "recordedAt": "2026-04-01T10:00:00Z"}
        )
    )
    assert ingest(reading(), db)["reason"] == "no_consent"
    assert db.get_reading("SS-SIM-0001", "2026-10-11") is None
