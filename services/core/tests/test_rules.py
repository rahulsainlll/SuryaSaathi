"""Each README diagnosis rule on hand-built histories (mirrors packages/engine's tests)."""

from typing import Any

from suryasaathi_core.rules import (
    Observation,
    diagnose,
    fixed1,
    round_half_up,
)

CLEAR = 12.9


def history(
    performances: list[float], days: dict[int, dict[str, Any]] | None = None
) -> list[Observation]:
    """Ordinary days (expected 11.5 kWh) at the given performance, with per-day overrides."""
    days = days or {}
    out = []
    for i, p in enumerate(performances):
        o: dict[str, Any] = {
            "expected_kwh": 11.5,
            "actual_kwh": 11.5 * p,
            "rained": False,
            "fault_code": None,
        }
        o.update(days.get(i, {}))
        out.append(Observation(clear_sky_kwh=CLEAR, **o))
    return out


def test_healthy() -> None:
    assert diagnose(history([0.99, 0.98]), 1) == "healthy"


def test_smog_when_expected_is_low_but_performance_holds() -> None:
    h = history([0.98, 0.97], days={1: {"expected_kwh": 8, "actual_kwh": 7.8}})
    assert diagnose(h, 1) == "smog"


def test_not_smog_when_performance_is_also_down() -> None:
    h = history([0.98, 0.8], days={1: {"expected_kwh": 8, "actual_kwh": 6.4}})
    assert diagnose(h, 1) != "smog"


def test_dust_when_the_gap_widens_over_dry_days() -> None:
    assert diagnose(history([0.99, 0.97, 0.95, 0.93, 0.91, 0.9, 0.89, 0.88]), 7) == "dust"


def test_no_dust_after_recent_rain() -> None:
    h = history([0.99, 0.97, 0.95, 0.93, 0.91, 0.9, 0.89, 0.88], days={5: {"rained": True}})
    assert diagnose(h, 7) == "healthy"


def test_no_dust_when_low_but_steady() -> None:
    assert diagnose(history([0.9] * 8), 7) == "healthy"


def test_no_dust_without_six_days_of_history() -> None:
    assert diagnose(history([0.99, 0.95, 0.91, 0.89, 0.88, 0.87]), 5) == "healthy"


def test_fault_when_output_collapses_overnight() -> None:
    assert diagnose(history([0.97, 0.32]), 1) == "fault"


def test_fault_on_an_inverter_fault_code() -> None:
    assert diagnose(history([0.97, 0.95], days={1: {"fault_code": "E-07"}}), 1) == "fault"


def test_no_fault_when_output_was_already_low() -> None:
    assert diagnose(history([0.5, 0.45]), 1) == "healthy"


def test_rounding_matches_javascript() -> None:
    assert round_half_up(0.5) == 1
    assert round_half_up(2.5) == 3  # Python's round() gives 2
    assert round_half_up(96.49999) == 96
    assert fixed1(11.45) == "11.4"  # 11.45 is 11.4499999… in binary, as JS toFixed sees it
    assert fixed1(0.25) == "0.3"  # exact tie: away from zero, like JS
