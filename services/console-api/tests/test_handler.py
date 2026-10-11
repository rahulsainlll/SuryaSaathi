import json
from typing import Any
from urllib.parse import quote

import pytest
from suryasaathi_console_api.handler import groups, handler, route
from suryasaathi_console_api.queries import ConsoleQueries
from suryasaathi_core.config import Settings
from suryasaathi_core.schemas import validate_console
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import Summaries

Fixture = tuple[dict[str, Any], dict[str, Any]]


def event(path: str, params: dict[str, str] | None = None, groups: Any = "[admin]",
          method: str = "GET") -> dict[str, Any]:  # fmt: skip
    claims = {"sub": "user", "cognito:groups": groups} if groups is not None else {"sub": "user"}
    return {
        "version": "2.0",
        "rawPath": path,
        "queryStringParameters": params,
        "requestContext": {"http": {"method": method}, "authorizer": {"jwt": {"claims": claims}}},
    }


@pytest.fixture
def call(rolled_up: tuple[Store, Summaries], settings: Settings) -> Any:
    def call(path: str, params: dict[str, str] | None = None, **kw: Any) -> tuple[int, Any]:
        result = route(event(path, params, **kw), ConsoleQueries(*rolled_up, settings), "admin")
        return result["statusCode"], json.loads(result["body"])

    return call


def ok(call: Any, definition: str, path: str, params: dict[str, str] | None = None) -> Any:
    status, body = call(path, params)
    assert status == 200, body
    validate_console(definition, body)
    return body


def test_fleet_wide_routes_match_the_typescript(call: Any, fixture: Fixture) -> None:
    expected = fixture[1]
    assert ok(call, "Overview", "/overview") == expected["overview"]
    assert ok(call, "VendorList", "/vendors") == expected["vendors"]
    assert ok(call, "Breakdown", "/breakdown") == expected["breakdown"]
    assert ok(call, "SearchIndex", "/search") == expected["search"]


def test_case_lists_match_with_every_filter(call: Any, fixture: Fixture) -> None:
    for entry in fixture[1]["cases"]:
        params = {k: v for k, v in entry["filters"].items()}
        assert ok(call, "CaseList", "/cases", params or None) == entry["response"], params


def test_system_search_matches(call: Any, fixture: Fixture) -> None:
    for entry in fixture[1]["systems"]:
        params = {"q": entry["q"]} if entry["q"] else None
        assert ok(call, "SystemList", "/systems", params) == entry["response"], entry["q"]


def test_every_detail_page_matches(call: Any, fixture: Fixture) -> None:
    expected = fixture[1]
    for vendor_id, body in expected["vendor"].items():
        assert ok(call, "VendorDetail", f"/vendors/{vendor_id}") == body, vendor_id
    for case_id, body in expected["case"].items():
        assert ok(call, "CaseDetail", f"/cases/{quote(case_id)}") == body, case_id
    for system_id, body in expected["system"].items():
        assert ok(call, "SystemDetail", f"/systems/{system_id}/") == body, system_id


def test_missing_items_and_routes_are_404(call: Any) -> None:
    for path in ("/cases/SS-NOPE-20261001", "/vendors/VND-XX", "/systems/SS-NOPE", "/nope", "/"):
        assert call(path)[0] == 404, path


def test_bad_filters_are_400(call: Any) -> None:
    assert call("/cases", {"status": "lost"})[0] == 400
    assert call("/cases", {"cause": "smog"})[0] == 400


def test_only_admins_may_read(call: Any) -> None:
    assert call("/overview", groups=None)[0] == 403
    assert call("/overview", groups="[viewers]")[0] == 403
    assert call("/overview", groups=["admin"])[0] == 200
    assert call("/overview", method="POST")[0] == 405


def test_groups_claim_formats() -> None:
    assert groups(event("/", groups="[admin viewers]")) == {"admin", "viewers"}
    assert groups(event("/", groups='["admin","viewers"]')) == {"admin", "viewers"}
    assert groups(event("/", groups="admin")) == {"admin"}
    assert groups(event("/", groups=None)) == set()


def test_503_before_the_first_rollup(loaded: tuple[Store, Summaries], settings: Settings) -> None:
    result = route(event("/overview"), ConsoleQueries(*loaded, settings), "admin")
    assert result["statusCode"] == 503


def test_handler_uses_the_environment(
    rolled_up: tuple[Store, Summaries], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ADMIN_GROUP", "discom-admins")

    class Context:
        function_name = "console-api"
        memory_limit_in_mb = 512
        invoked_function_arn = "arn:aws:lambda:ap-south-1:123456789012:function:console-api"
        aws_request_id = "test"

    assert handler(event("/overview"), Context())["statusCode"] == 403
    allowed = handler(event("/overview", groups="[discom-admins]"), Context())
    assert allowed["statusCode"] == 200
    assert json.loads(allowed["body"])["systemsWatched"] == 12
