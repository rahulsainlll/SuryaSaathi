"""Golden scenario fixtures exported from packages/engine."""

import json
from dataclasses import dataclass
from datetime import date
from functools import cache
from typing import Any

from .paths import schemas_package
from .rules import CaseEngine, Diagnosis, Observation


@dataclass(frozen=True)
class FixtureDay:
    day: int
    date: str
    reading: dict[str, Any]
    actual_kwh: float
    expected_kwh: float
    clear_sky_kwh: float
    rained: bool
    vendor_fixes_on_time: bool
    diagnosis: Diagnosis | None
    case: dict[str, Any] | None

    def observation(self, *, from_reading: bool = False) -> Observation:
        """The day as the agent sees it: unrounded, or as the device reported it (2 dp)."""
        actual = float(self.reading["energyKwh"]) if from_reading else self.actual_kwh
        return Observation(
            expected_kwh=self.expected_kwh,
            actual_kwh=actual,
            clear_sky_kwh=self.clear_sky_kwh,
            rained=self.rained,
            fault_code=self.reading.get("faultCode"),
        )


@dataclass(frozen=True)
class Fixture:
    scenario: str
    description: str
    config: dict[str, Any]
    days: tuple[FixtureDay, ...]
    cases: tuple[dict[str, Any], ...]
    decisions: tuple[dict[str, Any], ...]

    @property
    def start_date(self) -> date:
        return date.fromisoformat(self.config["startDate"])

    def engine(self) -> CaseEngine:
        """A fresh Python case engine configured like this fixture's simulation."""
        return CaseEngine(
            start_date=self.start_date,
            vendor_name=self.config["vendorName"],
            first_case_number=self.config["firstCaseNumber"],
            deadline_days=self.config["deadlineDays"],
        )


def fixture_names() -> list[str]:
    return sorted(p.stem for p in (schemas_package() / "fixtures").glob("*.json"))


@cache
def load_fixture(name: str) -> Fixture:
    raw = json.loads((schemas_package() / "fixtures" / f"{name}.json").read_text())
    days = tuple(
        FixtureDay(
            day=d["day"],
            date=d["date"],
            reading=d["reading"],
            actual_kwh=d["actualKwh"],
            expected_kwh=d["expectedKwh"],
            clear_sky_kwh=d["clearSkyKwh"],
            rained=d["rained"],
            vendor_fixes_on_time=d["vendorFixesOnTime"],
            diagnosis=d["diagnosis"],
            case=d["case"],
        )
        for d in raw["days"]
    )
    return Fixture(
        scenario=raw["scenario"],
        description=raw["description"],
        config=raw["config"],
        days=days,
        cases=tuple(raw["cases"]),
        decisions=tuple(raw["decisions"]),
    )
