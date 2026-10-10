"""Turns stored readings and expected output into the rules' observations."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import date, timedelta
from typing import Any

import boto3
from suryasaathi_core.config import Settings
from suryasaathi_core.rules import DUST_MIN_HISTORY, Observation
from suryasaathi_core.store import Store

ExpectedLookup = Callable[[str, str], dict[str, Any]]

#: Days of history the rules need: dust looks back DUST_MIN_HISTORY days.
WINDOW_DAYS = DUST_MIN_HISTORY + 1


def lambda_expected_lookup(store: Store, settings: Settings) -> ExpectedLookup:
    """Reads the expected-output cache, invoking the expected-output Lambda on a miss."""
    client = boto3.client("lambda") if settings.expected_function else None

    def lookup(system_id: str, day: str) -> dict[str, Any]:
        if cached := store.get_expected(system_id, day):
            return cached
        if client is None or settings.expected_function is None:
            raise RuntimeError("expected output not cached and EXPECTED_FUNCTION is not set")
        response = client.invoke(
            FunctionName=settings.expected_function,
            Payload=json.dumps({"systemId": system_id, "date": day}).encode(),
        )
        record: dict[str, Any] = json.loads(response["Payload"].read())
        if "expectedKwh" not in record:
            raise RuntimeError(f"expected-output failed for {system_id} {day}: {record}")
        return record

    return lookup


def observation(reading: dict[str, Any], expected: dict[str, Any]) -> Observation:
    return Observation(
        expected_kwh=float(expected["expectedKwh"]),
        actual_kwh=float(reading["energyKwh"]),
        clear_sky_kwh=float(expected["clearSkyKwh"]),
        rained=bool(expected.get("rained", False)),
        fault_code=reading.get("faultCode"),
    )


class History:
    """The consecutive days of readings ending on ``day``, joined with expected output."""

    def __init__(
        self,
        store: Store,
        expected: ExpectedLookup,
        system_id: str,
        day: str,
        window: int = WINDOW_DAYS,
    ) -> None:
        self.system_id = system_id
        self.day = day
        readings = {r["date"]: r for r in store.recent_readings(system_id, day, window)}
        self.dates: list[str] = []
        self.readings: list[dict[str, Any]] = []
        self.expected: list[dict[str, Any]] = []
        d = date.fromisoformat(day)
        # walk back from today while readings are consecutive
        while (key := d.isoformat()) in readings and len(self.dates) < window:
            self.dates.insert(0, key)
            self.readings.insert(0, readings[key])
            self.expected.insert(0, expected(system_id, key))
            d -= timedelta(days=1)
        if not self.dates or self.dates[-1] != day:
            raise LookupError(f"No reading for {system_id} on {day}")
        self.observations = [
            observation(r, e) for r, e in zip(self.readings, self.expected, strict=True)
        ]

    @property
    def today(self) -> Observation:
        return self.observations[-1]

    @property
    def index(self) -> int:
        return len(self.observations) - 1

    def summary(self) -> list[dict[str, Any]]:
        """The window as plain data, for the agent and the logs."""
        return [
            {
                "date": d,
                "energyKwh": r["energyKwh"],
                "expectedKwh": round(o.expected_kwh, 2),
                "clearSkyKwh": round(o.clear_sky_kwh, 2),
                "performancePct": round(o.performance * 100, 1),
                "rainedOvernight": o.rained,
                **({"faultCode": o.fault_code} if o.fault_code else {}),
            }
            for d, r, o in zip(self.dates, self.readings, self.observations, strict=True)
        ]
