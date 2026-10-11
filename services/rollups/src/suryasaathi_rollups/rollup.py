"""Builds the console's summary items from the systems, readings and cases tables.

Reads each system's readings for the window by key (never a scan of the readings table),
computes every figure with ``suryasaathi_core.console`` and returns the items described in
``suryasaathi_core.summaries``.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from typing import Any

from suryasaathi_core import console as c
from suryasaathi_core.config import Settings
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import FLEET, LATEST, SYSTEM, VENDOR, ZONE, day_sk, series_pk

Row = dict[str, Any]


def default_as_of(now: datetime | None = None) -> str:
    """Yesterday (UTC): the last day whose readings are all in when the job runs at night."""
    return ((now or datetime.now(UTC)) - timedelta(days=1)).date().isoformat()


def latest_as_of(store: Store) -> str:
    """The newest reading date across the fleet: for demo runs, where simulated readings
    carry the scenario's dates rather than yesterday's."""
    dates = [store.latest_reading_date(str(s["systemId"])) for s in store.list_systems()]
    return max((d for d in dates if d), default=default_as_of())


def load_fleet(store: Store, settings: Settings, as_of: str) -> Row:
    """The fleet as of ``as_of``, in the shape of the TypeScript ``Fleet``."""
    first = c.window_start(as_of, settings.window_days)
    systems = [
        c.fleet_system(
            item,
            [c.reading_row(r) for r in store.readings_between(item["systemId"], first, as_of)],
        )
        for item in sorted(store.list_systems(), key=lambda s: str(s["systemId"]))
    ]
    cases = c.cases_as_of(store.list_cases(), as_of)
    return {
        "asOf": as_of,
        "tariffInr": settings.tariff_inr,
        "windowDays": settings.window_days,
        "vendors": [],
        "systems": systems,
        "cases": cases,
    }


def summary_items(fleet: Mapping[str, Any]) -> list[Row]:
    as_of: str = fleet["asOf"]
    window: int = fleet["windowDays"]
    names = {v["vendorId"]: v["name"] for v in fleet["vendors"]}
    systems: list[Row] = fleet["systems"]
    cases: list[Row] = fleet["cases"]
    simulated = any(s["simulated"] for s in systems)
    zones = {s["systemId"]: s["location"]["zone"] for s in systems}

    def summarize_case(k: Row) -> Row:
        vendor = c.vendor_name(k["vendorId"], names)
        return c.case_summary(k, as_of, zones.get(k["systemId"], ""), vendor)

    case_rows = [summarize_case(k) for k in cases]
    system_rows = {
        s["systemId"]: c.system_summary(
            s,
            [k["caseId"] for k in cases if k["systemId"] == s["systemId"] and c.is_open(k)],
            as_of,
            window,
            names,
        )
        for s in systems
    }

    def group_tally(members: list[Row]) -> Row:
        ids = {s["systemId"] for s in members}
        return c.tally(
            [system_rows[s["systemId"]] for s in members],
            [k for k in case_rows if k["systemId"] in ids],
        )

    def series(pk: str, members: list[Row]) -> list[Row]:
        return [
            {"pk": pk, "sk": day_sk(p["date"]), **p} for p in c.fleet_series(members, as_of, window)
        ]

    totals = group_tally(systems)
    lost = c.lost_by_cause(systems, cases, as_of, window)
    items: list[Row] = [
        {
            "pk": FLEET,
            "sk": LATEST,
            "asOf": as_of,
            "simulated": simulated,
            "tariffInr": fleet["tariffInr"],
            "windowDays": window,
            "systemsWatched": totals["systems"],
            "underperforming": totals["underperforming"],
            "openCases": totals["openCases"],
            "pastDeadline": totals["pastDeadline"],
            "energyLostKwh": totals["energyLostKwh"],
            "moneyLostInr": c.math_round(totals["energyLostKwh"] * fleet["tariffInr"]),
            "causes": c.cause_rows(lost, cases),
            "vendorNames": names,
        },
        *series(FLEET, systems),
    ]

    for vendor_id in sorted({s["vendorId"] for s in systems}):
        members = [s for s in systems if s["vendorId"] == vendor_id]
        ids = {s["systemId"] for s in members}
        row = c.vendor_row(
            vendor_id,
            [system_rows[s["systemId"]] for s in members],
            [k for k in case_rows if k["systemId"] in ids],
            names,
        )
        items += [
            {"pk": VENDOR, "sk": vendor_id, **row},
            *series(series_pk(VENDOR, vendor_id), members),
        ]

    for zone in sorted({s["location"]["zone"] for s in systems}):
        members = [s for s in systems if s["location"]["zone"] == zone]
        items += [
            {"pk": ZONE, "sk": zone, "zone": zone, **group_tally(members)},
            *series(series_pk(ZONE, zone), members),
        ]

    for s in systems:
        extra: Row = {"location": s["location"]}
        for key in ("installedOn", "consentRecordedAt"):
            if s.get(key):
                extra[key] = s[key]
        items.append({"pk": SYSTEM, "sk": s["systemId"], **system_rows[s["systemId"]], **extra})
    return items
