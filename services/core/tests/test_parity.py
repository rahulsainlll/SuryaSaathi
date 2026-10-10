"""The Python rules must agree with packages/engine on every golden fixture, day for day."""

from dataclasses import asdict

import pytest
from suryasaathi_core.fixtures import fixture_names, load_fixture
from suryasaathi_core.rules import Case, Observation, diagnose, rain_closes, recheck
from suryasaathi_core.schemas import errors

SCENARIOS = fixture_names()

#: Lines the engine logs for viewer actions and weather, not agent decisions.
NOT_DECISIONS = {
    "Rain forecast tonight.",
    "Heavy smog expected tomorrow.",
    "A fault will hit the inverter tomorrow.",
    "Rain overnight washed the panels clean.",
}


def test_all_five_scenarios_are_present() -> None:
    assert SCENARIOS == ["dust", "fault", "rain", "smog-day", "vendor-misses-deadline"]


def _case_view(case: Case | None) -> dict[str, str] | None:
    if case is None:
        return None
    view = {"id": case.id, "cause": case.cause, "status": case.status}
    if case.resolved_by:
        view["resolvedBy"] = case.resolved_by
    return view


@pytest.mark.parametrize("name", SCENARIOS)
@pytest.mark.parametrize("from_reading", [False, True], ids=["unrounded", "as-reported"])
def test_diagnosis_and_case_state_match_the_engine(name: str, from_reading: bool) -> None:
    fixture = load_fixture(name)
    engine = fixture.engine()
    for day in fixture.days:
        result = engine.observe(
            day.observation(from_reading=from_reading), day.vendor_fixes_on_time
        )
        assert result.diagnosis == day.diagnosis, f"{name} day {day.day} diagnosis"
        assert _case_view(result.case) == day.case, f"{name} day {day.day} case"


@pytest.mark.parametrize("name", SCENARIOS)
def test_decisions_are_worded_like_the_demo(name: str) -> None:
    fixture = load_fixture(name)
    engine = fixture.engine()
    for day in fixture.days:
        engine.observe(day.observation(), day.vendor_fixes_on_time)
    expected = [
        (d["day"], d["kind"], d["text"])
        for d in fixture.decisions
        if d["text"] not in NOT_DECISIONS
    ]
    assert [(d.day, d.kind, d.text) for d in engine.decisions] == expected


@pytest.mark.parametrize("name", SCENARIOS)
def test_diagnose_matches_on_every_undisturbed_day(name: str) -> None:
    fixture = load_fixture(name)
    history = [d.observation() for d in fixture.days]
    for day in fixture.days:
        if day.diagnosis is not None:
            assert diagnose(history, day.day) == day.diagnosis


@pytest.mark.parametrize("name", SCENARIOS)
def test_workflow_recheck_matches_the_engine_at_each_deadline(name: str) -> None:
    """The Step Functions recheck reaches the engine's outcome at every deadline."""
    fixture = load_fixture(name)
    history: list[Observation | None] = [d.observation() for d in fixture.days]
    deadline_days = fixture.config["deadlineDays"]
    for record in fixture.cases:
        opened = next(d.day for d in fixture.days if d.date == record["openedAt"][:10])
        case = Case(record["caseId"], record["cause"], "filed", opened, opened + deadline_days)
        if record.get("resolvedBy") == "rain":
            continue  # closed by the agent on the rain day; covered below
        if case.deadline_day >= len(history):
            continue  # the month ends before the deadline
        outcome = recheck(case, history)
        if record.get("escalatedAt"):
            assert outcome == "escalate"
            case.status = "escalated"
            case.escalated_day = case.deadline_day
            if record["status"] == "verified":
                assert recheck(case, history) == "verified"
        else:
            assert outcome == "verified"


def test_rain_closes_the_rain_scenarios_dust_case() -> None:
    fixture = load_fixture("rain")
    case = Case("SS-0142", "dust", "filed", 12, 15)
    closing = [d.day for d in fixture.days[13:15] if rain_closes(case, d.observation())]
    assert closing == [13]


def test_recheck_waits_for_the_deadline_reading() -> None:
    case = Case("SS-1", "dust", "filed", 0, 3)
    obs = Observation(10, 9.9, 12, False)
    assert recheck(case, [obs, obs, obs]) == "pending"
    assert recheck(case, [obs, obs, obs, None]) == "pending"
    assert recheck(case, [obs, obs, obs, obs]) == "verified"
    assert recheck(Case(**{**asdict(case), "status": "verified"}), []) == "closed"


@pytest.mark.parametrize("name", SCENARIOS)
def test_fixture_readings_and_cases_match_the_schemas(name: str) -> None:
    fixture = load_fixture(name)
    for day in fixture.days:
        assert errors("reading", day.reading) == []
    for record in fixture.cases:
        assert errors("case", record) == []
