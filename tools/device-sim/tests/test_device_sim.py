import json
from collections.abc import Iterator
from datetime import date
from pathlib import Path
from typing import Any

import boto3
import pytest
from moto import mock_aws
from suryasaathi_core.schemas import errors
from suryasaathi_core.store import Store
from suryasaathi_core.testing import create_tables
from suryasaathi_device_sim.aws import CERT_SECRET, fetch_certificate
from suryasaathi_device_sim.cli import main
from suryasaathi_device_sim.plan import default_first_date, messages_for_day, simulated_systems

FIRST = date(2026, 10, 1)


@pytest.fixture
def aws(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-south-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    with mock_aws():
        yield


class FakePublisher:
    def __init__(self) -> None:
        self.sent: list[tuple[str, dict[str, Any]]] = []
        self.closed = False

    def publish(self, topic: str, payload: dict[str, Any]) -> None:
        self.sent.append((topic, payload))

    def close(self) -> None:
        self.closed = True


def test_systems_take_the_scenarios_round_robin() -> None:
    systems = simulated_systems(7)
    assert [s.system_id for s in systems[:2]] == ["SS-SIM-0001", "SS-SIM-0002"]
    assert [s.scenario.scenario for s in systems] == [
        "dust", "smog-day", "fault", "rain", "vendor-misses-deadline", "dust", "smog-day",
    ]  # fmt: skip


def test_messages_are_schema_valid_readings_on_shifted_dates() -> None:
    systems = simulated_systems(5)
    for day in (0, 12, 29):
        for m in messages_for_day(systems, day, FIRST):
            assert errors("reading", m.reading) == []
            assert m.topic == f"suryasaathi/readings/{m.reading['systemId']}"
    fault = messages_for_day(systems, 12, FIRST)[2].reading
    assert fault["date"] == "2026-10-13"
    assert fault["receivedAt"] == "2026-10-13T13:00:00.000Z"
    assert fault["faultCode"] == "E-07"
    # values come from the fixture, only identity and dates change
    assert fault["energyKwh"] == systems[2].scenario.days[12].reading["energyKwh"]


def test_registered_systems_record_their_scenario() -> None:
    record = simulated_systems(2)[1].record(FIRST)
    assert errors("system", record) == []
    assert record["simulation"] == {"scenario": "smog-day", "firstDate": "2026-10-01"}


def test_default_first_date_ends_today() -> None:
    assert default_first_date(30, today=date(2026, 10, 30)) == FIRST


def test_run_registers_then_publishes_every_day(aws: None) -> None:
    store = Store(create_tables(boto3.resource("dynamodb")))
    fake = FakePublisher()
    waits: list[float] = []
    code = main(
        ["--systems", "3", "--days", "4", "--speed", "2", "--first-date", "2026-10-01"],
        publisher_factory=lambda _: fake,
        sleep=waits.append,
    )
    assert code == 0
    assert len(fake.sent) == 12 and fake.closed
    assert [p["date"] for _, p in fake.sent[::3]] == [
        "2026-10-01",
        "2026-10-02",
        "2026-10-03",
        "2026-10-04",
    ]
    assert waits == [2, 2, 2]
    assert store.get_system("SS-SIM-0003")["simulation"]["scenario"] == "fault"  # type: ignore[index]


def test_dry_run_prints_without_aws(capsys: pytest.CaptureFixture[str]) -> None:
    assert (
        main(
            [
                "--systems",
                "1",
                "--days",
                "2",
                "--speed",
                "0",
                "--dry-run",
                "--first-date",
                "2026-10-01",
            ]
        )
        == 0
    )
    lines = [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    assert [line["payload"]["date"] for line in lines] == ["2026-10-01", "2026-10-02"]


def test_days_beyond_the_fixtures_are_rejected() -> None:
    assert main(["--days", "31", "--dry-run"]) == 2


def test_fetch_cert_writes_the_pem_files(aws: None, tmp_path: Path) -> None:
    boto3.client("secretsmanager").create_secret(
        Name=CERT_SECRET,
        SecretString=json.dumps({"certificatePem": "CERT", "privateKey": "KEY"}),
    )
    cert, key = fetch_certificate(tmp_path / "certs")
    assert cert.read_text() == "CERT" and key.read_text() == "KEY"
    assert key.stat().st_mode & 0o777 == 0o600
