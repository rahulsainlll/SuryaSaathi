"""GET /public/live — the unauthenticated endpoint behind the site's Live page.

Anyone on the internet can call this, so it is deliberately small: one route, read-only,
simulated roofs only, and a response cached in the container for a few seconds. The
route is throttled at the API and the function is capped by reserved concurrency, so a
burst of traffic cannot run up a bill.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

from suryasaathi_core.config import Settings
from suryasaathi_core.logs import log_event, logger
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import Summaries

from .live import NotReady, live

#: Seconds a built payload is reused, in the container and by the browser.
CACHE_SECONDS = 15
PATH = "/public/live"

#: (expires_at, payload) from the last build, shared by every call this container serves.
_cache: tuple[float, dict[str, Any]] | None = None


def _origin() -> str:
    """Who may read this. A public, credential-free GET, so "*" unless pinned."""
    return os.environ.get("ALLOWED_ORIGIN") or "*"


def response(status: int, body: Any, max_age: int = 0) -> dict[str, Any]:
    cache = f"public, max-age={max_age}" if max_age else "no-store"
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": cache,
            "Access-Control-Allow-Origin": _origin(),
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def payload(now: float | None = None) -> dict[str, Any]:
    """The live payload, rebuilt at most once every CACHE_SECONDS per container."""
    global _cache
    now = time.monotonic() if now is None else now
    if _cache and _cache[0] > now:
        return _cache[1]
    settings = Settings.from_env()
    built = live(Store(settings), Summaries(settings), settings)
    _cache = (now + CACHE_SECONDS, built)
    return built


def reset_cache() -> None:
    """Drop the cached payload. For tests."""
    global _cache
    _cache = None


def route(event: dict[str, Any]) -> dict[str, Any]:
    method = str(event.get("requestContext", {}).get("http", {}).get("method", "GET")).upper()
    if method not in ("GET", "HEAD"):
        return response(405, {"message": "Read only"})
    path = str(event.get("rawPath") or "/").rstrip("/") or "/"
    if path != PATH:
        return response(404, {"message": "No such route"})
    try:
        return response(200, payload(), max_age=CACHE_SECONDS)
    except NotReady as err:
        return response(503, {"message": str(err)})


@logger.inject_lambda_context(clear_state=True)
def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    result = route(event)
    log_event("live_request", path=event.get("rawPath"), status=result["statusCode"])
    return result
