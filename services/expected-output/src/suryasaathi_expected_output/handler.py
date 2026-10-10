"""Lambda entry point.

- ``{"systemId": "...", "date": "YYYY-MM-DD"}``: the record for one system and day (the
  agent invokes this on a cache miss).
- An EventBridge scheduled event, or ``{"date": "YYYY-MM-DD"}`` alone: compute every
  registered system for that day (default: yesterday in India), warming the cache.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from aws_lambda_powertools.utilities.typing import LambdaContext
from suryasaathi_core.logs import log_event, logger
from suryasaathi_core.store import Store

from .service import expected_for

_store: Store | None = None


def store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store


def yesterday_in_india() -> str:
    return (datetime.now(ZoneInfo("Asia/Kolkata")).date() - timedelta(days=1)).isoformat()


@logger.inject_lambda_context(clear_state=True)
def handler(event: dict[str, Any], context: LambdaContext) -> dict[str, Any]:
    return handle(event, store())


def handle(event: dict[str, Any], db: Store) -> dict[str, Any]:
    if system_id := event.get("systemId"):
        system = db.get_system(system_id)
        if system is None:
            return {"error": "unknown_system", "systemId": system_id}
        return expected_for(system, event["date"], db)

    day = event.get("date") or yesterday_in_india()
    systems = db.list_systems()
    for system in systems:
        expected_for(system, day, db)
    log_event("expected_output_daily_run", date=day, systems=len(systems))
    return {"date": day, "systems": len(systems)}
