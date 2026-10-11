"""The console's queries, answered from the summary items and the cases table.

Raw readings are only ever read by key for one system (a case's or a system's detail
page); the fleet-wide figures come from the nightly summaries.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from suryasaathi_core import console as c
from suryasaathi_core.config import Settings
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import (
    FLEET,
    LATEST,
    SYSTEM,
    VENDOR,
    ZONE,
    Summaries,
    series_pk,
)

Row = dict[str, Any]

CASE_STATUSES = {"open", "filed", "escalated", "fixed", "verified"}
CASE_CAUSES = {"dust", "fault"}
#: Fields of a SYSTEM summary item that aren't part of a SystemSummary.
SYSTEM_EXTRAS = ("location", "installedOn", "consentRecordedAt")


class NotReady(Exception):
    """The rollup hasn't run yet, so there is nothing to serve."""


class BadRequest(ValueError):
    pass


class ConsoleQueries:
    def __init__(self, store: Store, summaries: Summaries, settings: Settings) -> None:
        self.store = store
        self.summaries = summaries
        self.settings = settings
        self._latest: Row | None = None

    # --- shared lookups ---------------------------------------------------------------------

    @property
    def latest(self) -> Row:
        if self._latest is None:
            self._latest = self.summaries.get(FLEET, LATEST)
            if self._latest is None:
                raise NotReady("No console summaries yet: run the rollups function.")
        return self._latest

    @property
    def as_of(self) -> str:
        return str(self.latest["asOf"])

    @property
    def names(self) -> Mapping[str, str]:
        names: Mapping[str, str] = self.latest.get("vendorNames") or {}
        return names

    def meta(self) -> Row:
        return {"asOf": self.as_of, "simulated": bool(self.latest["simulated"])}

    def window(self) -> tuple[str, str]:
        days = int(self.latest.get("windowDays", self.settings.window_days))
        return c.window_start(self.as_of, days), self.as_of

    def system_rows(self) -> list[Row]:
        rows: list[Row] = self.summaries.query(SYSTEM)
        return rows

    @staticmethod
    def system_summary(row: Mapping[str, Any]) -> Row:
        return {k: v for k, v in row.items() if k not in SYSTEM_EXTRAS}

    def summarize_cases(self, items: list[Row], zones: Mapping[str, str]) -> list[Row]:
        return [
            c.case_summary(
                k,
                self.as_of,
                zones.get(k["systemId"], ""),
                c.vendor_name(k["vendorId"], self.names),
            )
            for k in c.cases_as_of(items, self.as_of)
        ]

    def all_cases(self) -> list[Row]:
        """Every case filed by asOf, summarized, in case-id order."""
        zones = {r["systemId"]: r["zone"] for r in self.system_rows()}
        return self.summarize_cases(self.store.list_cases(), zones)

    def readings(self, system_id: str, first: str, last: str) -> list[Row]:
        last = min(last, self.as_of)
        return [c.reading_row(r) for r in self.store.readings_between(system_id, first, last)]

    # --- responses --------------------------------------------------------------------------

    def overview(self) -> Row:
        t = self.latest
        keys = ("systemsWatched", "underperforming", "openCases", "pastDeadline",
                "energyLostKwh", "moneyLostInr", "tariffInr", "windowDays")  # fmt: skip
        return {
            **self.meta(),
            **{k: t[k] for k in keys},
            "fleet": self.summaries.days(FLEET, *self.window()),
        }

    def vendors(self) -> Row:
        return {**self.meta(), "vendors": c.sort_vendors(self.summaries.query(VENDOR))}

    def vendor(self, vendor_id: str) -> Row | None:
        row = self.summaries.get(VENDOR, vendor_id)
        if row is None:
            return None
        systems = [self.system_summary(s) for s in self.system_rows() if s["vendorId"] == vendor_id]
        return {
            **self.meta(),
            "vendor": row,
            "systems": systems,
            "cases": c.sort_cases(k for k in self.all_cases() if k["vendorId"] == vendor_id),
            "fleet": self.summaries.days(series_pk(VENDOR, vendor_id), *self.window()),
        }

    def cases(self, filters: Mapping[str, str | None]) -> Row:
        if filters.get("status") and filters["status"] not in CASE_STATUSES:
            raise BadRequest(f"status must be one of {sorted(CASE_STATUSES)}")
        if filters.get("cause") and filters["cause"] not in CASE_CAUSES:
            raise BadRequest(f"cause must be one of {sorted(CASE_CAUSES)}")
        cases = [k for k in self.all_cases() if c.matches_filters(k, filters)]
        return {**self.meta(), "cases": c.sort_cases(cases)}

    def case(self, case_id: str) -> Row | None:
        item = self.store.get_case(case_id)
        if item is None:
            return None
        case = c.fleet_case(item)
        if case["openedDate"] > self.as_of:
            return None
        system = self.summaries.get(SYSTEM, case["systemId"])
        zone = system["zone"] if system else ""
        summary = self.summarize_cases([case], {case["systemId"]: zone})[0]
        first, last = c.case_readings(case, self.as_of)
        readings = self.readings(case["systemId"], first, last)
        return c.case_detail(case, summary, readings, self.as_of, self.meta()["simulated"])

    def systems(self, query: str | None) -> Row:
        systems = [self.system_summary(s) for s in self.system_rows()]
        return {**self.meta(), "systems": [s for s in systems if c.matches_query(s, query)]}

    def system(self, system_id: str) -> Row | None:
        row = self.summaries.get(SYSTEM, system_id)
        if row is None:
            return None
        cases = self.summarize_cases(
            self.store.cases_for_system(system_id), {system_id: row["zone"]}
        )
        out: Row = {**self.meta(), "system": self.system_summary(row), "location": row["location"]}
        for key in ("installedOn", "consentRecordedAt"):
            if row.get(key):
                out[key] = row[key]
        out["readings"] = self.readings(system_id, *self.window())
        out["cases"] = c.sort_cases(cases)
        return out

    def breakdown(self) -> Row:
        return {**self.meta(), "causes": self.latest["causes"], "zones": self.summaries.query(ZONE)}

    def search(self) -> Row:
        systems = [self.system_summary(s) for s in self.system_rows()]
        vendor_ids = [s["vendorId"] for s in systems]
        return {
            **self.meta(),
            "items": c.search_items(systems, vendor_ids, self.all_cases(), self.names),
        }
