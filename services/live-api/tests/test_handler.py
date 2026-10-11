from typing import Any

import pytest
from suryasaathi_core.config import Settings
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import SYSTEM, Summaries
from suryasaathi_live_api import handler as handler_module
from suryasaathi_live_api.handler import CACHE_SECONDS, PATH, payload, reset_cache, route
from suryasaathi_live_api.live import DECISION_LIMIT, NotReady, live


def event(path: str = PATH, method: str = "GET") -> dict[str, Any]:
    return {"rawPath": path, "requestContext": {"http": {"method": method}}}


@pytest.fixture(autouse=True)
def _clean_cache() -> Any:
    reset_cache()
    yield
    reset_cache()


# --- the payload ----------------------------------------------------------------------


def test_it_returns_only_the_simulated_roofs(
    rolled_up: tuple[Store, Summaries], settings: Settings
) -> None:
    """A real household's roof must never appear on a public page."""
    store, summaries = rolled_up
    simulated = {str(r["systemId"]) for r in summaries.query(SYSTEM) if r.get("simulated")}
    assert simulated, "the fixture should have simulated roofs"

    # The console fixture is simulated throughout, so plant a real one to filter out.
    summaries.table.put_item(
        Item={
            "pk": SYSTEM,
            "sk": "SS-REAL-0001",
            "systemId": "SS-REAL-0001",
            "zone": "Rohini",
            "dataSource": "data_logger",
            "simulated": False,
            "status": "healthy",
        }
    )
    store.put_reading(
        {
            "systemId": "SS-REAL-0001",
            "date": "2026-10-10",
            "source": "data_logger",
            "energyKwh": 9.0,
            "receivedAt": "2026-10-10T18:30:00Z",
            "expectedKwh": 10.0,
            "performance": 0.9,
            "diagnosis": "healthy",
            "reason": "A real roof that must stay private.",
            "reasonSource": "rules",
        }
    )

    body = live(store, summaries, settings)

    assert {s["systemId"] for s in body["systems"]} == simulated
    assert "SS-REAL-0001" not in {s["systemId"] for s in body["systems"]}
    assert "SS-REAL-0001" not in {d["systemId"] for d in body["decisions"]}
    assert "SS-REAL-0001" not in {c["systemId"] for c in body["cases"]}
    assert body["simulated"] is True
    assert {c["systemId"] for c in body["cases"]} <= simulated
    assert {d["systemId"] for d in body["decisions"]} <= simulated


def test_a_roof_carries_its_figures_and_a_series(
    rolled_up: tuple[Store, Summaries], settings: Settings
) -> None:
    body = live(*rolled_up, settings)
    system = body["systems"][0]
    assert set(system) >= {
        "systemId",
        "zone",
        "dataSource",
        "latestReadingDate",
        "actualKwh",
        "expectedKwh",
        "performance",
        "diagnosis",
        "series",
    }
    assert system["series"], "the chart needs points"
    assert all(p["expectedKwh"] is not None for p in system["series"])
    assert [p["date"] for p in system["series"]] == sorted(p["date"] for p in system["series"])
    # Numbers must be JSON-serialisable floats, not DynamoDB Decimals.
    assert isinstance(system["series"][0]["actualKwh"], float | int | type(None))


def test_the_decision_feed_leads_with_the_days_something_happened(
    rolled_up: tuple[Store, Summaries], settings: Settings
) -> None:
    """A healthy stretch must not push every interesting decision off the page."""
    body = live(*rolled_up, settings)
    decisions = body["decisions"]
    assert 0 < len(decisions) <= DECISION_LIMIT
    assert all(d["diagnosis"] for d in decisions)
    assert all(d["reasonSource"] in (None, "agent", "rules") for d in decisions)

    eventful = [d["diagnosis"] not in (None, "healthy") for d in decisions]
    # Every eventful decision comes before every routine one...
    assert eventful == sorted(eventful, reverse=True)
    # ...and each tier is newest first.
    for tier in (True, False):
        dates = [d["date"] for d, e in zip(decisions, eventful, strict=True) if e is tier]
        assert dates == sorted(dates, reverse=True)


def test_routine_days_fill_the_feed_only_when_there_is_room(
    rolled_up: tuple[Store, Summaries], settings: Settings
) -> None:
    store, summaries = rolled_up
    body = live(store, summaries, settings)
    interesting = [d for d in body["decisions"] if d["diagnosis"] not in (None, "healthy")]
    # The console fixture has plenty of smog, dust and fault days; if the feed were a
    # plain "most recent 15" they would all be crowded out by the healthy tail.
    assert interesting, "the feed should surface the days the agent found something"


def test_counters_match_the_body(rolled_up: tuple[Store, Summaries], settings: Settings) -> None:
    body = live(*rolled_up, settings)
    counters = body["counters"]
    assert counters["systems"] == len(body["systems"])
    assert counters["casesOpened"] == len(body["cases"])
    assert counters["casesVerified"] == sum(1 for c in body["cases"] if c["status"] == "verified")
    assert counters["readings"] == sum(len(s["series"]) for s in body["systems"])
    assert counters["agentDecisions"] <= counters["decisions"]


def _keys(value: Any) -> set[str]:
    """Every key anywhere in a nested structure."""
    if isinstance(value, dict):
        return set(value) | {k for v in value.values() for k in _keys(v)}
    if isinstance(value, list):
        return {k for v in value for k in _keys(v)}
    return set()


def test_no_personal_data_leaves_the_endpoint(
    rolled_up: tuple[Store, Summaries], settings: Settings
) -> None:
    """Coordinates, consent records, install dates and vendor identity stay private.

    Matching on keys, not on the serialised text: "lat" is a substring of
    "latestReadingDate", which made an earlier version of this test pass for the
    wrong reason.
    """
    body = live(*rolled_up, settings)
    forbidden = {
        "location",
        "lat",
        "lon",
        "consent",
        "consentRecordedAt",
        "installedOn",
        "vendorId",
        "vendorName",
        "dsain",
        "evidence",
    }
    assert _keys(body) & forbidden == set()


def test_it_reads_no_table_in_full(
    rolled_up: tuple[Store, Summaries], settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A scan on readings or cases would not survive a real fleet."""
    store, summaries = rolled_up

    def forbidden(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError("scan is not allowed in the public endpoint")

    monkeypatch.setattr(store.readings, "scan", forbidden)
    monkeypatch.setattr(store.cases, "scan", forbidden)
    monkeypatch.setattr(store.systems, "scan", forbidden)
    live(store, summaries, settings)


def test_it_raises_before_the_first_rollup(
    loaded: tuple[Store, Summaries], settings: Settings
) -> None:
    with pytest.raises(NotReady):
        live(*loaded, settings)


# --- the route ------------------------------------------------------------------------


def test_the_route_answers_with_a_cache_header(
    rolled_up: tuple[Store, Summaries], settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    import json

    monkeypatch.setattr(handler_module, "Store", lambda s: rolled_up[0])
    monkeypatch.setattr(handler_module, "Summaries", lambda s: rolled_up[1])
    result = route(event())
    assert result["statusCode"] == 200
    assert result["headers"]["Cache-Control"] == f"public, max-age={CACHE_SECONDS}"
    assert result["headers"]["Access-Control-Allow-Origin"] == "*"
    assert json.loads(result["body"])["simulated"] is True


def test_503_before_the_first_rollup(
    loaded: tuple[Store, Summaries], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(handler_module, "Store", lambda s: loaded[0])
    monkeypatch.setattr(handler_module, "Summaries", lambda s: loaded[1])
    result = route(event())
    assert result["statusCode"] == 503
    assert result["headers"]["Cache-Control"] == "no-store"


def test_only_get_and_only_that_path(
    rolled_up: tuple[Store, Summaries], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(handler_module, "Store", lambda s: rolled_up[0])
    monkeypatch.setattr(handler_module, "Summaries", lambda s: rolled_up[1])
    assert route(event(method="POST"))["statusCode"] == 405
    assert route(event(method="DELETE"))["statusCode"] == 405
    assert route(event(path="/public/other"))["statusCode"] == 404
    assert route(event(path="/overview"))["statusCode"] == 404
    # A trailing slash is the same route.
    assert route(event(path=f"{PATH}/"))["statusCode"] == 200


def test_the_payload_is_built_once_per_cache_window(
    rolled_up: tuple[Store, Summaries], monkeypatch: pytest.MonkeyPatch
) -> None:
    builds = []

    def counted(store: Any, summaries: Any, settings: Any) -> dict[str, Any]:
        builds.append(1)
        return {"asOf": "2026-10-10"}

    monkeypatch.setattr(handler_module, "Store", lambda s: rolled_up[0])
    monkeypatch.setattr(handler_module, "Summaries", lambda s: rolled_up[1])
    monkeypatch.setattr(handler_module, "live", counted)

    payload(now=1000.0)
    payload(now=1000.0 + CACHE_SECONDS - 1)
    assert len(builds) == 1, "a second call inside the window must reuse the payload"
    payload(now=1000.0 + CACHE_SECONDS + 1)
    assert len(builds) == 2, "the payload must be rebuilt once the window passes"


def test_the_allowed_origin_can_be_pinned(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGIN", "https://example.org")
    assert handler_module.response(200, {})["headers"]["Access-Control-Allow-Origin"] == (
        "https://example.org"
    )
