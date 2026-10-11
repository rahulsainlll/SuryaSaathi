from datetime import UTC, datetime
from typing import Any

import pytest
from suryasaathi_core.config import Settings
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import FLEET, LATEST, SYSTEM, VENDOR, ZONE, Summaries, series_pk
from suryasaathi_rollups.handler import handler, run
from suryasaathi_rollups.rollup import default_as_of

Fixture = tuple[dict[str, Any], dict[str, Any]]
AS_OF = "2026-10-10"


def test_default_as_of_is_yesterday_utc() -> None:
    assert default_as_of(datetime(2026, 10, 11, 0, 30, tzinfo=UTC)) == "2026-10-10"


def test_rollup_matches_the_typescript_summaries(
    loaded: tuple[Store, Summaries], settings: Settings, fixture: Fixture
) -> None:
    store, summaries = loaded
    fleet, expected = fixture
    stats = run(store, summaries, settings, AS_OF)
    assert stats["systems"] == len(fleet["systems"])
    assert stats["cases"] == len(fleet["cases"])

    latest = summaries.get(FLEET, LATEST)
    assert latest is not None
    overview = expected["overview"]
    for key in ("asOf", "simulated", "systemsWatched", "underperforming", "openCases",
                "pastDeadline", "energyLostKwh", "moneyLostInr", "tariffInr", "windowDays"):  # fmt: skip
        assert latest[key] == overview[key], key
    assert latest["causes"] == expected["breakdown"]["causes"]
    assert summaries.days(FLEET, "2026-09-11", AS_OF) == overview["fleet"]

    vendors = {v["vendorId"]: v for v in summaries.query(VENDOR)}
    assert vendors == {v["vendorId"]: v for v in expected["vendors"]["vendors"]}
    for vendor_id, detail in expected["vendor"].items():
        assert summaries.days(series_pk(VENDOR, vendor_id), "2026-09-11", AS_OF) == detail["fleet"]

    assert summaries.query(ZONE) == expected["breakdown"]["zones"]

    systems = summaries.query(SYSTEM)
    extra = {"location", "installedOn", "consentRecordedAt"}
    assert [{k: v for k, v in s.items() if k not in extra} for s in systems] == expected["systems"][
        0
    ]["response"]["systems"]
    first = expected["system"][systems[0]["systemId"]]
    assert systems[0]["location"] == first["location"]
    assert systems[0]["installedOn"] == first["installedOn"]


def test_rollup_removes_rows_of_systems_that_are_gone(
    loaded: tuple[Store, Summaries], settings: Settings
) -> None:
    store, summaries = loaded
    run(store, summaries, settings, AS_OF)
    gone = "SS-DL-001012"
    store.systems.delete_item(Key={"systemId": gone})
    stats = run(store, summaries, settings, AS_OF)
    assert stats["deleted"] == 1
    assert summaries.get(SYSTEM, gone) is None
    assert summaries.get(FLEET, LATEST)["systemsWatched"] == 11  # type: ignore[index]


def test_rollup_ignores_cases_filed_after_as_of(
    loaded: tuple[Store, Summaries], settings: Settings, fixture: Fixture
) -> None:
    store, summaries = loaded
    stats = run(store, summaries, settings, "2026-10-01")
    later = [k for k in fixture[0]["cases"] if k["openedDate"] > "2026-10-01"]
    assert later
    assert stats["cases"] == len(fixture[0]["cases"]) - len(later)


def test_handler_reads_settings_from_the_environment(
    loaded: tuple[Store, Summaries], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("WINDOW_DAYS", "7")

    class Context:
        function_name = "rollups"
        memory_limit_in_mb = 512
        invoked_function_arn = "arn:aws:lambda:ap-south-1:123456789012:function:rollups"
        aws_request_id = "test"

    result = handler({"asOf": "latest"}, Context())
    assert result["asOf"] == AS_OF
    assert result["systems"] == 12
    assert len(loaded[1].days(FLEET, "2026-09-01", AS_OF)) == 7
