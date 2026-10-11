from suryasaathi_core import console as c
from suryasaathi_core.schemas import validate_console


def test_rounding_matches_javascript() -> None:
    assert c.js_round(2.125, 2) == 2.13  # Number((2.125).toFixed(2)); round() gives 2.12
    assert c.js_round(1.005, 2) == 1.0  # 1.005 is 1.00499… in binary, as in JavaScript
    assert c.math_round(2.5) == 3 and c.math_round(3.5) == 4


def test_reading_row_from_an_annotated_item() -> None:
    row = c.reading_row(
        {
            "systemId": "S",
            "date": "2026-10-01",
            "energyKwh": 5.2,
            "expectedKwh": 7.5,
            "performance": 0.6933,
            "rained": False,
            "diagnosis": "dust",
            "action": "open_case",
            "reason": "Dust.",
            "reasonSource": "agent",
        }  # fmt: skip
    )
    assert row["reasons"] == [{"text": "Dust.", "source": "agent"}]
    validate_console("ReadingRow", row)


def test_reading_row_before_the_agent_has_seen_it() -> None:
    row = c.reading_row({"systemId": "S", "date": "2026-10-01", "energyKwh": 5.2})
    assert row["expectedKwh"] is None and row["diagnosis"] is None and row["reasons"] == []
    validate_console("ReadingRow", row)


def test_case_days_fall_back_to_timestamps() -> None:
    case = c.fleet_case(
        {
            "caseId": "X",
            "openedAt": "2026-10-01T06:00:00Z",
            "vendorDeadline": "2026-10-04T08:00:00Z",
            "verifiedAt": "2026-10-03T09:00:00Z",
            "openedDate": "2026-10-01",
        }  # fmt: skip
    )
    assert case["deadlineDate"] == "2026-10-04" and case["verifiedDate"] == "2026-10-03"


def test_past_deadline_means_escalated_or_filed_and_late() -> None:
    base = {"caseId": "X", "systemId": "S", "vendorId": "V", "cause": "dust",
            "openedDate": "2026-10-01", "deadlineDate": "2026-10-04"}  # fmt: skip
    late = c.case_summary({**base, "status": "filed"}, "2026-10-06", "Z", "Vendor V")
    fixed = c.case_summary({**base, "status": "fixed"}, "2026-10-06", "Z", "Vendor V")
    assert (late["pastDeadline"], late["daysOverdue"]) == (True, 2)
    assert (fixed["pastDeadline"], fixed["daysOverdue"]) == (False, 0)
    validate_console("CaseSummary", late)
