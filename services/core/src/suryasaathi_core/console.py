"""Console figures, computed the same way as packages/console-data/src/summarize.ts.

services/rollups computes the nightly summary items with these functions and
services/console-api assembles responses with them; the console-fleet fixture
(packages/schemas/fixtures/console) checks both agree with the TypeScript.

Definitions (keep in step with summarize.ts):

- Open case: status is anything but "verified".
- Past deadline: escalated, or still filed after the deadline. A "fixed" case is waiting
  for verification, not on the vendor.
- Underperforming system: an open case, or latest performance below 90%.
- Energy lost: sum of max(0, expected - actual) over the window, kWh; rupees at the tariff.
- Average fix time: mean days from filing to verification, over cases a vendor or the
  DISCOM fixed (rain closures excluded).
- Cause of a day's shortfall: the cause of the system's case open that day, else "other".

A *fleet* is a dict shaped like the TypeScript ``Fleet``: ``asOf``, ``tariffInr``,
``windowDays``, ``vendors``, ``systems`` (each with ``readings``, oldest first) and
``cases``.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from functools import cmp_to_key
from typing import Any

UNDERPERFORMING_BELOW = 0.9
CAUSES = ("dust", "fault", "other")

Row = dict[str, Any]


def js_round(x: float, digits: int) -> float:
    """``Number(x.toFixed(digits))`` for x >= 0: half up on the exact binary value."""
    q = Decimal(x).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
    return float(q)


def math_round(x: float) -> int:
    """JavaScript's ``Math.round``."""
    return math.floor(x + 0.5)


def days_between(first: str, last: str) -> int:
    return (date.fromisoformat(last) - date.fromisoformat(first)).days


def add_days(day: str, n: int) -> str:
    return (date.fromisoformat(day) + timedelta(days=n)).isoformat()


def is_open(case: Mapping[str, Any]) -> bool:
    return bool(case["status"] != "verified")


def shortfall(reading: Mapping[str, Any]) -> float:
    expected = reading.get("expectedKwh")
    return 0.0 if expected is None else max(0.0, expected - reading["energyKwh"])


def vendor_name(vendor_id: str, names: Mapping[str, str] | None = None) -> str:
    return (names or {}).get(vendor_id) or f"Vendor {vendor_id}"


def window_start(as_of: str, window_days: int) -> str:
    return add_days(as_of, -(window_days - 1))


def windowed(readings: Iterable[Row], as_of: str, window_days: int) -> list[Row]:
    first = window_start(as_of, window_days)
    return [r for r in readings if first <= r["date"] <= as_of]


# --- cases ----------------------------------------------------------------------------------


def case_summary(case: Mapping[str, Any], as_of: str, zone: str, vendor: str) -> Row:
    past = case["status"] == "escalated" or (
        case["status"] == "filed" and as_of > case["deadlineDate"]
    )
    out: Row = {
        "caseId": case["caseId"],
        "systemId": case["systemId"],
        "vendorId": case["vendorId"],
        "vendorName": vendor,
        "zone": zone,
        "cause": case["cause"],
        "status": case["status"],
        "openedDate": case["openedDate"],
        "deadlineDate": case["deadlineDate"],
    }
    for key in ("escalatedDate", "fixedDate", "verifiedDate", "resolvedBy"):
        if case.get(key):
            out[key] = case[key]
    out["pastDeadline"] = past
    out["daysOverdue"] = max(0, days_between(case["deadlineDate"], as_of)) if past else 0
    out["daysOpen"] = days_between(case["openedDate"], case.get("verifiedDate") or as_of)
    return out


def _compare_cases(a: Row, b: Row) -> int:
    def urgent(c: Row) -> int:
        return 1 if c["status"] == "escalated" or c["pastDeadline"] else 0

    def cmp(x: str, y: str) -> int:
        return (x > y) - (x < y)

    return (
        urgent(b) - urgent(a)
        or b["daysOverdue"] - a["daysOverdue"]
        or int(is_open(b)) - int(is_open(a))
        or cmp(b["openedDate"], a["openedDate"])
        or cmp(a["caseId"], b["caseId"])
    )


def sort_cases(cases: Iterable[Row]) -> list[Row]:
    """Escalation queue first (escalated or past deadline, most overdue first), then newest."""
    return sorted(cases, key=cmp_to_key(_compare_cases))


def matches_filters(case: Mapping[str, Any], filters: Mapping[str, str | None]) -> bool:
    status = filters.get("status")
    if status == "open":
        if not is_open(case):
            return False
    elif status and case["status"] != status:
        return False
    return all(
        not filters.get(key) or case[key] == filters[key] for key in ("cause", "vendorId", "zone")
    )


def case_readings(case: Mapping[str, Any], as_of: str) -> tuple[str, str]:
    """The reading dates a case's detail page shows: a week before filing to just after."""
    first = add_days(case["openedDate"], -7)
    last = add_days(case["verifiedDate"], 2) if case.get("verifiedDate") else as_of
    return first, last


def timeline(case: Mapping[str, Any], as_of: str, vendor: str) -> list[Row]:
    work = "repair" if case["cause"] == "fault" else "cleaning"
    deadline: Row = {
        "date": case["deadlineDate"],
        "kind": "deadline",
        "label": "Vendor deadline",
        "detail": "3 days to fix before escalation.",
    }
    if is_open(case) and as_of <= case["deadlineDate"]:
        deadline["upcoming"] = True
    events: list[Row] = [
        {
            "date": case["openedDate"],
            "kind": "filed",
            "label": "Case filed",
            "detail": case.get("reason", ""),
        },
        {
            "date": case["openedDate"],
            "kind": "vendor_notified",
            "label": "Vendor notified",
            "detail": f"Free {work} requested from {vendor} under the 5-year O&M obligation, with readings as evidence.",
        },
        deadline,
    ]
    if case.get("escalatedDate"):
        events += [
            {
                "date": case["escalatedDate"],
                "kind": "escalated",
                "label": "Escalated to the DISCOM",
                "detail": "The vendor missed the deadline.",
            },
            {
                "date": case["escalatedDate"],
                "kind": "discom_notified",
                "label": "DISCOM notified",
                "detail": "Readings, chart and evidence sent to the monitoring cell.",
            },
        ]
    if case.get("fixedDate") and case.get("resolvedBy") != "rain":
        fixed = "repaired the inverter" if case["cause"] == "fault" else "cleaned the panels"
        events.append(
            {
                "date": case["fixedDate"],
                "kind": "fixed",
                "label": "Fixed after DISCOM escalation"
                if case.get("resolvedBy") == "discom"
                else "Vendor visited",
                "detail": f"{vendor} {fixed}.",
            }
        )
    if case.get("verifiedDate"):
        if case.get("resolvedBy") == "rain":
            events.append(
                {
                    "date": case["verifiedDate"],
                    "kind": "closed_by_rain",
                    "label": "Closed by rain",
                    "detail": "Overnight rain cleaned the panels; no visit needed.",
                }
            )
        else:
            events.append(
                {
                    "date": case["verifiedDate"],
                    "kind": "verified",
                    "label": "Fix verified",
                    "detail": "Performance back above 93% in the next reading.",
                }
            )
    return sorted(events, key=lambda e: str(e["date"]))


def case_detail(
    case: Mapping[str, Any], summary: Row, readings: list[Row], as_of: str, simulated: bool
) -> Row:
    out: Row = {
        "asOf": as_of,
        "simulated": simulated,
        "case": summary,
        "reason": case.get("reason", ""),
    }
    if case.get("familyMessage"):
        out["familyMessage"] = case["familyMessage"]
    out["timeline"] = timeline(case, as_of, summary["vendorName"])
    out["readings"] = readings
    return out


# --- systems --------------------------------------------------------------------------------


def system_summary(
    system: Mapping[str, Any],
    open_case_ids: list[str],
    as_of: str,
    window_days: int,
    names: Mapping[str, str] | None = None,
) -> Row:
    readings = system["readings"]
    latest = readings[-1].get("performance") if readings else None
    if open_case_ids:
        status = "open_case"
    elif latest is not None and latest < UNDERPERFORMING_BELOW:
        status = "underperforming"
    else:
        status = "healthy"
    lost = 0.0
    for r in windowed(readings, as_of, window_days):
        lost += shortfall(r)
    out: Row = {"systemId": system["systemId"]}
    if system.get("dsain"):
        out["dsain"] = system["dsain"]
    out |= {
        "vendorId": system["vendorId"],
        "vendorName": vendor_name(system["vendorId"], names),
        "zone": system["location"]["zone"],
        "dataSource": system["dataSource"],
        "consent": system["consent"],
        "capacityKw": system["capacityKw"],
        "latestPerformance": latest,
        "status": status,
    }
    if open_case_ids:
        out["openCaseId"] = open_case_ids[0]
    out["energyLostKwh"] = js_round(lost, 2)
    out["simulated"] = system["simulated"]
    return out


def matches_query(summary: Mapping[str, Any], query: str | None) -> bool:
    q = (query or "").strip().lower()
    if not q:
        return True
    fields = ("systemId", "dsain", "vendorName", "vendorId", "zone")
    return any(q in str(summary.get(f) or "").lower() for f in fields)


# --- fleet totals ---------------------------------------------------------------------------


def fleet_series(systems: Iterable[Mapping[str, Any]], as_of: str, window_days: int) -> list[Row]:
    by_date: dict[str, list[float]] = {}
    for s in systems:
        for r in windowed(s["readings"], as_of, window_days):
            if r.get("expectedKwh") is None:
                continue
            p = by_date.setdefault(r["date"], [0.0, 0.0, 0])
            p[0] += r["expectedKwh"]
            p[1] += r["energyKwh"]
            perf = r.get("performance")
            if perf is not None and perf < UNDERPERFORMING_BELOW:
                p[2] += 1
    return [
        {
            "date": d,
            "expectedKwh": js_round(e, 2),
            "actualKwh": js_round(a, 2),
            "performance": js_round(a / e, 4) if e > 0 else None,
            "underperforming": int(u),
        }
        for d, (e, a, u) in sorted(by_date.items())
    ]


def tally(summaries: list[Row], cases: list[Row]) -> Row:
    """Totals for a set of systems from their summaries and their cases' summaries."""
    lost = 0.0
    for s in summaries:
        lost += s["energyLostKwh"]
    return {
        "systems": len(summaries),
        "underperforming": sum(1 for s in summaries if s["status"] != "healthy"),
        "openCases": sum(1 for c in cases if is_open(c)),
        "pastDeadline": sum(1 for c in cases if c["pastDeadline"]),
        "energyLostKwh": js_round(lost, 2),
    }


def vendor_row(
    vendor_id: str, summaries: list[Row], cases: list[Row], names: Mapping[str, str] | None = None
) -> Row:
    t = tally(summaries, cases)
    fixes = [
        days_between(c["openedDate"], c["verifiedDate"])
        for c in cases
        if c.get("verifiedDate") and c.get("resolvedBy") != "rain"
    ]
    return {
        "vendorId": vendor_id,
        "name": vendor_name(vendor_id, names),
        "systems": t["systems"],
        "underperforming": t["underperforming"],
        "underperformingPct": js_round(100 * t["underperforming"] / t["systems"], 1)
        if t["systems"]
        else 0,
        "openCases": t["openCases"],
        "pastDeadline": t["pastDeadline"],
        "avgFixDays": js_round(sum(fixes) / len(fixes), 1) if fixes else None,
        "energyLostKwh": t["energyLostKwh"],
    }


def sort_vendors(rows: Iterable[Row]) -> list[Row]:
    return sorted(rows, key=lambda v: (-v["pastDeadline"], -v["underperformingPct"], v["vendorId"]))


def lost_by_cause(
    systems: Iterable[Mapping[str, Any]], cases: list[Row], as_of: str, window_days: int
) -> dict[str, float]:
    lost = dict.fromkeys(CAUSES, 0.0)
    for s in systems:
        own = [c for c in cases if c["systemId"] == s["systemId"]]
        for r in windowed(s["readings"], as_of, window_days):
            active = next(
                (
                    c
                    for c in own
                    if c["openedDate"] <= r["date"] <= (c.get("verifiedDate") or as_of)
                ),
                None,
            )
            lost[active["cause"] if active else "other"] += shortfall(r)
    return lost


def cause_rows(lost: Mapping[str, float], cases: list[Row]) -> list[Row]:
    rows = []
    for cause in CAUSES:
        own = [] if cause == "other" else [c for c in cases if c["cause"] == cause]
        rows.append(
            {
                "cause": cause,
                "cases": len(own),
                "openCases": sum(1 for c in own if is_open(c)),
                "energyLostKwh": js_round(lost[cause], 2),
            }
        )
    return rows


def search_items(
    systems: Iterable[Mapping[str, Any]],
    vendor_ids: Iterable[str],
    cases: Iterable[Mapping[str, Any]],
    names: Mapping[str, str] | None = None,
) -> list[Row]:
    """Vendors, then systems, then cases. ``systems`` are system summaries."""
    vendors = [
        {"type": "vendor", "id": v, "label": vendor_name(v, names), "hint": v}
        for v in sorted(set(vendor_ids))
    ]
    systems_ = [
        {
            "type": "system",
            "id": s["systemId"],
            "label": f"{s['systemId']} · {s['dsain']}" if s.get("dsain") else s["systemId"],
            "hint": f"{s['zone']} · {s['vendorName']}",
        }
        for s in systems
    ]
    cases_ = [
        {
            "type": "case",
            "id": c["caseId"],
            "label": c["caseId"],
            "hint": f"{c['cause']} · {c['status']}",
        }
        for c in cases
    ]
    return vendors + systems_ + cases_


# --- stored items to console shapes -----------------------------------------------------------


def reading_row(item: Mapping[str, Any]) -> Row:
    """A readings-table item (with the agent's annotations) as a console ReadingRow."""
    row: Row = {
        "date": item["date"],
        "energyKwh": item["energyKwh"],
        "expectedKwh": item.get("expectedKwh"),
        "performance": item.get("performance"),
        "rained": bool(item.get("rained", False)),
        "diagnosis": item.get("diagnosis"),
        "action": item.get("action"),
    }
    if item.get("faultCode"):
        row["faultCode"] = item["faultCode"]
    row["reasons"] = (
        [{"text": item["reason"], "source": item.get("reasonSource", "rules")}]
        if item.get("reason")
        else []
    )
    return row


def fleet_case(item: Mapping[str, Any]) -> Row:
    """A cases-table item with its day fields filled from the timestamps where missing."""
    out = dict(item)
    for day, at in (
        ("openedDate", "openedAt"),
        ("deadlineDate", "vendorDeadline"),
        ("escalatedDate", "escalatedAt"),
        ("fixedDate", "fixedAt"),
        ("verifiedDate", "verifiedAt"),
    ):
        if not out.get(day) and out.get(at):
            out[day] = str(out[at])[:10]
    return out


def cases_as_of(items: Iterable[Mapping[str, Any]], as_of: str) -> list[Row]:
    """Cases-table items as fleet cases, those filed by ``as_of`` only, in case-id order."""
    cases = (fleet_case(i) for i in items)
    return sorted((k for k in cases if k["openedDate"] <= as_of), key=lambda k: str(k["caseId"]))


def fleet_system(item: Mapping[str, Any], readings: list[Row]) -> Row:
    """A systems-table item (system.schema.json) in the fleet shape, with its readings."""
    consent = item.get("consent") or {}
    out: Row = {
        "systemId": item["systemId"],
        "vendorId": item["vendorId"],
        "dataSource": item["dataSource"],
        "consent": bool(consent.get("granted", False)),
        "capacityKw": item["capacityKw"],
        "location": item["location"],
        "simulated": "simulation" in item,
        "readings": readings,
    }
    if item.get("dsain"):
        out["dsain"] = item["dsain"]
    if consent.get("recordedAt"):
        out["consentRecordedAt"] = consent["recordedAt"]
    if item.get("installedOn"):
        out["installedOn"] = item["installedOn"]
    return out
