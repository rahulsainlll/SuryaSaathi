from collections.abc import Callable, Iterator
from datetime import date
from typing import Any

import boto3
import pytest
from moto import mock_aws
from suryasaathi_core.config import Settings
from suryasaathi_core.fixtures import Fixture
from suryasaathi_core.store import Store
from suryasaathi_core.testing import create_tables, system_record

FIRST = date(2026, 10, 1)


@pytest.fixture
def aws(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-south-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    with mock_aws():
        yield


@pytest.fixture
def store(aws: None) -> Store:
    db = boto3.resource("dynamodb")
    settings = Settings(agent_enabled=False)
    return Store(create_tables(db, settings), db)


def fixture_lookup(fixture: Fixture) -> Callable[[str, str], dict[str, Any]]:
    """Expected output as the expected-output service serves it for a simulated system."""

    def lookup(system_id: str, day: str) -> dict[str, Any]:
        d = fixture.days[(date.fromisoformat(day) - FIRST).days]
        return {
            "systemId": system_id,
            "date": day,
            "expectedKwh": d.expected_kwh,
            "clearSkyKwh": d.clear_sky_kwh,
            "rained": d.rained,
            "source": "fixture",
        }

    return lookup


def reading_for(fixture: Fixture, day: int, system_id: str = "SS-SIM-0001") -> dict[str, Any]:
    r = dict(fixture.days[day].reading)
    when = date.fromordinal(FIRST.toordinal() + day).isoformat()
    r.update(systemId=system_id, date=when, receivedAt=f"{when}T13:00:00.000Z")
    return r


def register(store: Store, fixture: Fixture, system_id: str = "SS-SIM-0001") -> None:
    store.put_system(
        system_record(
            system_id, simulation={"scenario": fixture.scenario, "firstDate": FIRST.isoformat()}
        )
    )
