import json

import pytest
from suryasaathi_core.logs import AgentDecision, log_decision, logger
from suryasaathi_core.schemas import errors
from suryasaathi_core.store import Store, from_item, to_item
from suryasaathi_core.testing import system_record


def test_decimal_round_trip() -> None:
    value = {"a": 1.25, "b": [2, 0.1], "c": None, "d": {"e": 3.0}}
    assert from_item(to_item(value)) == {"a": 1.25, "b": [2, 0.1], "d": {"e": 3}}


def test_system_record_matches_the_schema() -> None:
    assert errors("system", system_record()) == []


def test_readings_are_kept_in_date_order_and_annotated(store: Store) -> None:
    for day, kwh in [("2026-10-03", 11.1), ("2026-10-01", 11.4), ("2026-10-02", 11.2)]:
        store.put_reading({"systemId": "S1", "date": day, "energyKwh": kwh})
    store.annotate_reading("S1", "2026-10-02", {"diagnosis": "healthy", "performance": 0.97})
    recent = store.recent_readings("S1", "2026-10-03", 2)
    assert [r["date"] for r in recent] == ["2026-10-02", "2026-10-03"]
    assert recent[0]["diagnosis"] == "healthy"
    assert recent[0]["performance"] == 0.97


def test_cases_are_created_once_and_found_while_open(store: Store) -> None:
    case = {
        "caseId": "C-1",
        "systemId": "S1",
        "status": "filed",
        "openedAt": "2026-10-01T13:00:00Z",
    }
    assert store.create_case(case) is True
    assert store.create_case(case) is False
    assert store.open_case("S1")["caseId"] == "C-1"  # type: ignore[index]
    store.update_case("C-1", {"status": "verified"})
    assert store.open_case("S1") is None


def test_decisions_are_logged_as_json(caplog: pytest.LogCaptureFixture) -> None:
    log_decision(
        AgentDecision(
            system_id="S1",
            date="2026-10-01",
            diagnosis="dust",
            action="open_case",
            reason="Gap widening every dry day.",
            case_id="C-1",
            performance=0.88,
        )
    )
    line = json.loads(logger.registered_formatter.format(caplog.records[-1]))
    assert line["event"] == "agent_decision"
    assert line["message"] == "agent_decision"
    assert line["systemId"] == "S1"
    assert line["action"] == "open_case"
    assert line["caseId"] == "C-1"
