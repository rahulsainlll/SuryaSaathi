"""AWS Lambda entry point: the nightly EventBridge rule runs the console rollup.

The event may carry ``{"asOf": "YYYY-MM-DD"}`` to rebuild a past day; otherwise the rollup
is as of yesterday (UTC).
"""

from __future__ import annotations

from typing import Any

from suryasaathi_core.config import Settings
from suryasaathi_core.logs import log_event, logger
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import Summaries

from .rollup import default_as_of, load_fleet, summary_items

SERVICE_NAME = "rollups"


def run(store: Store, summaries: Summaries, settings: Settings, as_of: str) -> dict[str, Any]:
    fleet = load_fleet(store, settings, as_of)
    result = summaries.replace(summary_items(fleet))
    stats = {
        "asOf": as_of,
        "systems": len(fleet["systems"]),
        "cases": len(fleet["cases"]),
        **result,
    }
    log_event("rollup_done", **stats)
    return stats


@logger.inject_lambda_context(clear_state=True)
def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    settings = Settings.from_env()
    as_of = str(event.get("asOf") or default_as_of())
    return run(Store(settings), Summaries(settings), settings, as_of)
