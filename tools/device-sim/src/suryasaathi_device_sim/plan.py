"""Which reading each simulated system sends on each day."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from suryasaathi_core.fixtures import Fixture, load_fixture
from suryasaathi_core.testing import system_record

DEFAULT_SCENARIOS = ["dust", "smog-day", "fault", "rain", "vendor-misses-deadline"]
TOPIC_PREFIX = "suryasaathi/readings"


@dataclass(frozen=True)
class SimSystem:
    system_id: str
    scenario: Fixture

    def record(self, first_date: date) -> dict[str, Any]:
        """The system.schema.json record, marked as replaying this scenario."""
        cfg = self.scenario.config
        return system_record(
            self.system_id,
            capacityKw=cfg["capacityKw"],
            vendorId=cfg["vendorId"],
            simulation={"scenario": self.scenario.scenario, "firstDate": first_date.isoformat()},
        )


@dataclass(frozen=True)
class Message:
    day: int
    topic: str
    reading: dict[str, Any]


def simulated_systems(count: int, scenarios: list[str] | None = None) -> list[SimSystem]:
    """``count`` systems SS-SIM-0001…, assigned to the scenarios round-robin."""
    names = scenarios or DEFAULT_SCENARIOS
    return [
        SimSystem(f"SS-SIM-{i + 1:04d}", load_fixture(names[i % len(names)])) for i in range(count)
    ]


def default_first_date(days: int, today: date | None = None) -> date:
    """Start so the last simulated day is today."""
    return (today or date.today()) - timedelta(days=days - 1)


def messages_for_day(
    systems: list[SimSystem], day: int, first_date: date, topic_prefix: str = TOPIC_PREFIX
) -> list[Message]:
    """The reading every system sends for fixture day ``day``, dated from ``first_date``."""
    when = (first_date + timedelta(days=day)).isoformat()
    out = []
    for s in systems:
        reading = dict(s.scenario.days[day].reading)
        reading.update(systemId=s.system_id, date=when, receivedAt=f"{when}T13:00:00.000Z")
        out.append(Message(day, f"{topic_prefix}/{s.system_id}", reading))
    return out
