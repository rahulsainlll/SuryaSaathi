"""AWS Lambda entry point behind the console's API Gateway HTTP API (payload v2).

API Gateway's JWT authorizer has already checked the Cognito access token; this handler
also requires the caller to be in the admin group (``cognito:groups``). Every route is a
GET and every response is a console.schema.json shape.

==========================  =================================================
GET /overview               Overview
GET /vendors                VendorList
GET /vendors/{vendorId}     VendorDetail
GET /cases                  CaseList (?status=&cause=&vendorId=&zone=)
GET /cases/{caseId}         CaseDetail
GET /systems                SystemList (?q=)
GET /systems/{systemId}     SystemDetail
GET /breakdown              Breakdown
GET /search                 SearchIndex
==========================  =================================================
"""

from __future__ import annotations

import json
import os
import re
from collections.abc import Callable
from typing import Any
from urllib.parse import unquote

from suryasaathi_core.config import Settings
from suryasaathi_core.logs import log_event, logger
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import Summaries

from .queries import BadRequest, ConsoleQueries, NotReady

SERVICE_NAME = "console-api"

Route = Callable[[ConsoleQueries, dict[str, str], re.Match[str]], dict[str, Any] | None]

ROUTES: list[tuple[re.Pattern[str], Route]] = [
    (re.compile(r"/overview"), lambda q, p, m: q.overview()),
    (re.compile(r"/vendors"), lambda q, p, m: q.vendors()),
    (re.compile(r"/vendors/([^/]+)"), lambda q, p, m: q.vendor(unquote(m[1]))),
    (
        re.compile(r"/cases"),
        lambda q, p, m: q.cases({k: p.get(k) for k in ("status", "cause", "vendorId", "zone")}),
    ),
    (re.compile(r"/cases/([^/]+)"), lambda q, p, m: q.case(unquote(m[1]))),
    (re.compile(r"/systems"), lambda q, p, m: q.systems(p.get("q"))),
    (re.compile(r"/systems/([^/]+)"), lambda q, p, m: q.system(unquote(m[1]))),
    (re.compile(r"/breakdown"), lambda q, p, m: q.breakdown()),
    (re.compile(r"/search"), lambda q, p, m: q.search()),
]


def response(status: int, body: Any) -> dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Cache-Control": "no-store"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def groups(event: dict[str, Any]) -> set[str]:
    """The caller's Cognito groups. HTTP APIs pass the claim as a string like ``[admin x]``."""
    claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    raw = claims.get("cognito:groups", [])
    if isinstance(raw, str):
        raw = re.split(r"[\s,]+", raw.strip("[]"))
    return {str(g).strip('"') for g in raw if g}


def route(event: dict[str, Any], queries: ConsoleQueries, admin_group: str) -> dict[str, Any]:
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    if method != "GET":
        return response(405, {"message": "Read only"})
    if admin_group not in groups(event):
        return response(403, {"message": f"Only members of the {admin_group} group"})
    path = (event.get("rawPath") or "/").rstrip("/") or "/"
    params = event.get("queryStringParameters") or {}
    for pattern, handle in ROUTES:
        match = pattern.fullmatch(path)
        if match:
            try:
                body = handle(queries, params, match)
            except BadRequest as e:
                return response(400, {"message": str(e)})
            except NotReady as e:
                return response(503, {"message": str(e)})
            return response(404, {"message": "Not found"}) if body is None else response(200, body)
    return response(404, {"message": "No such route"})


@logger.inject_lambda_context(clear_state=True)
def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    settings = Settings.from_env()
    queries = ConsoleQueries(Store(settings), Summaries(settings), settings)
    result = route(event, queries, os.environ.get("ADMIN_GROUP") or "admin")
    log_event("console_request", path=event.get("rawPath"), status=result["statusCode"])
    return result
