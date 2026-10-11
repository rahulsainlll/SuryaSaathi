"""What the site's "Live from AWS" page shows, read from the deployed backend.

Only the simulated demo roofs are ever returned: a system counts as a demo roof when
its summary row carries ``simulated``. Nothing here scans a table. The fleet row and
the per-system rows come from the rollup summaries; readings and cases are read with
key queries, a bounded number of them, so the page costs the same whatever the fleet
grows to.

There is no personal data in the response: no names, no addresses, no contact details.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, timedelta
from typing import Any

from suryasaathi_core.config import Settings
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import FLEET, LATEST, SYSTEM, Summaries

#: Days of history behind each roof's chart.
WINDOW_DAYS = 30
#: How many agent decisions the feed shows.
DECISION_LIMIT = 15
#: Diagnoses that mean nothing happened that day.
ROUTINE = (None, "healthy")
#: Never query more roofs than this, however many are marked simulated.
MAX_SYSTEMS = 12
#: Fields copied straight from a case. Everything else stays out of a public response.
CASE_FIELDS = ("caseId", "systemId", "cause", "status", "familyMessage")


class NotReady(Exception):
    """No rollup has run yet, so there are no summaries to read."""


def _back(day: str, days: int) -> str:
    return (date.fromisoformat(day) - timedelta(days=days)).isoformat()


def _num(value: Any, places: int = 2) -> float | None:
    """A JSON number rounded for display, or None. DynamoDB hands back Decimals."""
    return None if value is None else round(float(value), places)


def _system_card(row: Mapping[str, Any], readings: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """One roof: who it is, how it is doing, and the series behind its chart."""
    latest = readings[-1] if readings else {}
    return {
        "systemId": row["systemId"],
        "zone": row.get("zone"),
        "dataSource": row.get("dataSource"),
        "capacityKw": _num(row.get("capacityKw"), 1),
        "latestReadingDate": latest.get("date"),
        "latestReadingAt": latest.get("receivedAt"),
        "actualKwh": _num(latest.get("energyKwh")),
        "expectedKwh": _num(latest.get("expectedKwh")),
        "performance": _num(latest.get("performance"), 4),
        "diagnosis": latest.get("diagnosis"),
        "status": row.get("status"),
        "series": [
            {
                "date": r["date"],
                "actualKwh": _num(r.get("energyKwh")),
                "expectedKwh": _num(r.get("expectedKwh")),
            }
            for r in readings
            if r.get("expectedKwh") is not None
        ],
    }


def _decision(reading: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "systemId": reading["systemId"],
        "date": reading["date"],
        "at": reading.get("receivedAt"),
        "diagnosis": reading.get("diagnosis"),
        "action": reading.get("action"),
        "reason": reading.get("reason"),
        "reasonSource": reading.get("reasonSource"),
        "caseId": reading.get("caseId"),
    }


def _eventful(decision: Mapping[str, Any]) -> bool:
    """True when the agent found something that day, rather than a routine reading."""
    return decision.get("diagnosis") not in ROUTINE or decision.get("action") not in (None, "none")


def _case(item: Mapping[str, Any]) -> dict[str, Any]:
    out = {k: item.get(k) for k in CASE_FIELDS}
    out["vendorDeadline"] = item.get("deadlineDate") or item.get("vendorDeadline")
    out["openedAt"] = item.get("openedAt")
    out["verifiedAt"] = item.get("verifiedAt")
    out["resolvedBy"] = item.get("resolvedBy")
    return out


def live(store: Store, summaries: Summaries, settings: Settings) -> dict[str, Any]:
    """The whole payload behind GET /public/live."""
    fleet = summaries.get(FLEET, LATEST)
    if not fleet:
        raise NotReady("No summaries yet: the rollup has not run.")
    as_of = str(fleet["asOf"])
    first = _back(as_of, WINDOW_DAYS)

    rows = [r for r in summaries.query(SYSTEM) if r.get("simulated")]
    rows.sort(key=lambda r: str(r.get("systemId")))
    rows = rows[:MAX_SYSTEMS]

    systems: list[dict[str, Any]] = []
    decisions: list[dict[str, Any]] = []
    cases: list[dict[str, Any]] = []
    for row in rows:
        system_id = str(row["systemId"])
        readings = store.readings_between(system_id, first, as_of)
        systems.append(_system_card(row, readings))
        decisions += [_decision(r) for r in readings if r.get("diagnosis")]
        cases += [_case(c) for c in store.cases_for_system(system_id)]

    decisions.sort(key=lambda d: (str(d["date"]), str(d["systemId"])), reverse=True)
    # Newest first, but a day where something happened outranks a routine one. On a
    # healthy stretch a strict "most recent 15" is fifteen rows of "No action", which
    # hides every reason the model actually wrote. Both tiers stay in date order.
    feed = [d for d in decisions if _eventful(d)][:DECISION_LIMIT]
    feed += [d for d in decisions if not _eventful(d)][: DECISION_LIMIT - len(feed)]
    cases.sort(key=lambda c: str(c.get("openedAt") or ""), reverse=True)
    agent_written = sum(1 for d in decisions if d["reasonSource"] == "agent")

    return {
        "asOf": as_of,
        "simulated": True,
        "windowDays": WINDOW_DAYS,
        "systems": systems,
        "decisions": feed,
        "cases": cases,
        "counters": {
            "systems": len(systems),
            "readings": sum(len(s["series"]) for s in systems),
            "decisions": len(decisions),
            "agentDecisions": agent_written,
            "casesOpened": len(cases),
            "casesVerified": sum(1 for c in cases if c["status"] == "verified"),
            "casesEscalated": sum(1 for c in cases if c["status"] == "escalated"),
        },
        "model": {
            "provider": settings.model_provider,
            "modelId": (
                settings.anthropic_model_id
                if settings.model_provider == "anthropic"
                else settings.bedrock_model_id
            ),
        },
    }
