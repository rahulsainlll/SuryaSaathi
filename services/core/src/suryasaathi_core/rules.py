"""Diagnosis rules (v1) and the case workflow, ported from packages/engine.

This module must agree with the TypeScript engine day for day: tests replay every golden
fixture in packages/schemas/fixtures through it. Keep the arithmetic in the same order as
packages/engine/src/diagnosis.ts and simulation.ts so floating point results match exactly.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

# --- thresholds (README "Diagnosis rules (v1)") ---------------------------------------

#: Smog: expected is low but performance stays above this.
SMOG_MIN_PERFORMANCE = 0.9
#: "Expected is low": below this share of clear-sky output.
SMOG_EXPECTED_SHARE = 0.8
#: Dust: 3-day average performance below this ...
DUST_MAX_AVG3 = 0.91
#: ... and falling over this many dry days ...
DUST_WINDOW_DAYS = 5
#: ... by more than this.
DUST_MIN_FALL = 0.02
#: Dust needs this much history before it can be called.
DUST_MIN_HISTORY = 6
#: Fault: performance drops below this overnight ...
FAULT_MAX_PERFORMANCE = 0.6
#: ... from above this the day before.
FAULT_PREVIOUS_MIN = 0.8
#: Verified fix: performance back above this.
VERIFIED_MIN_PERFORMANCE = 0.93

#: Days the vendor gets to fix a problem.
DEADLINE_DAYS = 3
#: Days after filing that an on-time vendor visits (simulation only).
VENDOR_VISIT_AFTER_DAYS = 2
#: Days after escalation that the DISCOM gets the vendor out (simulation only).
DISCOM_VISIT_AFTER_DAYS = 2

Diagnosis = Literal["healthy", "smog", "dust", "fault"]
CaseCause = Literal["dust", "fault"]
CaseStatus = Literal["filed", "escalated", "fixed", "verified"]
CaseResolver = Literal["vendor", "discom", "rain"]
LogKind = Literal["neutral", "info", "success", "warning", "danger"]


@dataclass(frozen=True)
class Observation:
    """One day as the agent sees it."""

    expected_kwh: float
    actual_kwh: float
    #: What the roof would make on a clear day; "expected is low" is measured against it.
    clear_sky_kwh: float
    #: It rained the night before this reading.
    rained: bool = False
    fault_code: str | None = None

    @property
    def performance(self) -> float:
        return self.actual_kwh / self.expected_kwh


def diagnose(history: Sequence[Observation], day: int) -> Diagnosis:
    """Diagnoses day ``day`` from the observations up to and including it."""
    if day < 0 or day >= len(history):
        raise IndexError(f"No observation for day {day}")

    def p(d: int) -> float:
        return history[d].performance

    today = history[day]
    r = p(day)

    if today.fault_code:
        return "fault"
    if day >= 1 and r < FAULT_MAX_PERFORMANCE and p(day - 1) > FAULT_PREVIOUS_MIN:
        return "fault"

    if day >= DUST_MIN_HISTORY:
        avg3 = (r + p(day - 1) + p(day - 2)) / 3
        falling = r - p(day - DUST_WINDOW_DAYS) < -DUST_MIN_FALL
        dry = not any(o.rained for o in history[day - DUST_WINDOW_DAYS + 1 : day + 1])
        if avg3 < DUST_MAX_AVG3 and falling and dry:
            return "dust"

    expected_is_low = today.expected_kwh < SMOG_EXPECTED_SHARE * today.clear_sky_kwh
    if expected_is_low and r > SMOG_MIN_PERFORMANCE:
        return "smog"

    return "healthy"


def is_verified(observation: Observation) -> bool:
    """A fix counts as verified once performance is back above 93%."""
    return observation.performance > VERIFIED_MIN_PERFORMANCE


def rain_closes(case: Case, observation: Observation) -> bool:
    """Rain that restores output closes a dust case before any visit."""
    return (
        case.cause == "dust"
        and case.status in ("filed", "escalated")
        and observation.rained
        and is_verified(observation)
    )


# --- cases ------------------------------------------------------------------------------


@dataclass
class Case:
    id: str
    cause: CaseCause
    status: CaseStatus
    opened_day: int
    deadline_day: int
    escalated_day: int | None = None
    fixed_day: int | None = None
    verified_day: int | None = None
    resolved_by: CaseResolver | None = None


RecheckOutcome = Literal["verified", "escalate", "still_failing", "pending", "closed"]


def recheck(case: Case, history: Sequence[Observation | None]) -> RecheckOutcome:
    """What the case workflow does when a deadline passes.

    ``history`` is indexed by day; a missing reading is ``None``. At the vendor deadline a
    filed case is verified if the deadline day's reading is back above 93%, else escalated.
    At the DISCOM deadline an escalated case is verified or still failing. ``pending``
    means the reading for the deadline day hasn't arrived yet.
    """
    if case.status == "verified":
        return "closed"
    due = case.deadline_day if case.status != "escalated" else _discom_deadline(case)
    reading = history[due] if due < len(history) else None
    if reading is None:
        return "pending"
    if is_verified(reading):
        return "verified"
    return "escalate" if case.status != "escalated" else "still_failing"


def _discom_deadline(case: Case) -> int:
    assert case.escalated_day is not None
    return case.escalated_day + DEADLINE_DAYS


# --- the engine's agent loop, for parity with packages/engine ---------------------------


@dataclass(frozen=True)
class Decision:
    day: int
    kind: LogKind
    text: str


@dataclass
class DayResult:
    diagnosis: Diagnosis | None
    case: Case | None


@dataclass
class CaseEngine:
    """Port of the agents' turn in packages/engine/src/simulation.ts (``act``).

    Feed it one observation per day. It returns the diagnosis and the case state, and logs
    each decision with the same wording as the demo. Vendor visits are simulated the way
    the engine does it (on time: two days after filing; late: two days after escalation).
    """

    start_date: date
    vendor_name: str = "[Vendor name] Solar"
    first_case_number: int = 142
    deadline_days: int = DEADLINE_DAYS
    history: list[Observation] = field(default_factory=list)
    active: Case | None = None
    closed: list[Case] = field(default_factory=list)
    decisions: list[Decision] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._next_case = self.first_case_number

    def observe(self, observation: Observation, vendor_fixes_on_time: bool) -> DayResult:
        d = len(self.history)
        self.history.append(observation)
        r = observation.performance
        pct = round_half_up(r * 100)
        vendor = self.vendor_name
        k = self.active

        if k is not None:
            if (
                k.status == "filed"
                and vendor_fixes_on_time
                and d >= k.opened_day + VENDOR_VISIT_AFTER_DAYS
            ):
                self._fix(k, d, "vendor")
            elif k.status == "filed" and d >= k.deadline_day:
                k.status = "escalated"
                k.escalated_day = d
                self._log(
                    d,
                    "danger",
                    f"Deadline passed. Case {k.id} escalated to the DISCOM with readings, chart and photos.",
                )
            elif k.status == "escalated" and d >= (k.escalated_day or 0) + DISCOM_VISIT_AFTER_DAYS:
                self._fix(k, d, "discom")
            elif k.status == "fixed" and d > (k.fixed_day or 0):
                if is_verified(observation):
                    self._log(
                        d,
                        "success",
                        f"Fix verified: performance back to {pct}%. Case {k.id} closed.",
                    )
                    self._close(k, d)
                else:
                    self._log(
                        d, "warning", f"Still {pct}% after the fix. Asking {vendor} to recheck."
                    )
            elif rain_closes(k, observation):
                self._log(
                    d,
                    "success",
                    f"Rain cleaned the panels before the visit. Case {k.id} closed, no visit needed.",
                )
                k.resolved_by = "rain"
                self._close(k, d)
            elif k.status == "filed":
                left = k.deadline_day - d
                self._log(
                    d,
                    "neutral",
                    f"Waiting for {vendor}: {left} day{'' if left == 1 else 's'} left. Reading {pct}%.",
                )
            elif k.status == "escalated":
                self._log(d, "neutral", f"DISCOM has the case. Reading {pct}%.")
            return DayResult(None, self._snapshot(d))

        diagnosis = diagnose(self.history, d)
        if diagnosis in ("fault", "dust"):
            self._open(d, diagnosis, pct)
        elif diagnosis == "smog":
            self._log(
                d,
                "info",
                f"Smog cut the sunlight: expected only {fixed1(observation.expected_kwh)} kWh. "
                f"System healthy at {pct}%. No complaint.",
            )
        else:
            self._log(
                d,
                "neutral",
                f"Reading received: {fixed1(observation.actual_kwh)} of "
                f"{fixed1(observation.expected_kwh)} kWh ({pct}%). No action.",
            )
        return DayResult(diagnosis, self._snapshot(d))

    def _open(self, d: int, cause: CaseCause, pct: int) -> None:
        case_id = f"SS-{self._next_case:04d}"
        self._next_case += 1
        self.active = Case(case_id, cause, "filed", d, d + self.deadline_days)
        self._log(d, *opening_reason(cause, pct))
        work = "repair" if cause == "fault" else "cleaning"
        due = format_day(self.start_date, d + self.deadline_days)
        self._log(
            d,
            "info",
            f"Case {case_id} filed to {self.vendor_name}: free {work} under 5-year O&M. Deadline {due}.",
        )

    def _fix(self, k: Case, d: int, by: Literal["vendor", "discom"]) -> None:
        k.status = "fixed"
        k.fixed_day = d
        k.resolved_by = by
        work = "repaired the inverter" if k.cause == "fault" else "cleaned the panels"
        text = (
            f"{self.vendor_name} {work} on time."
            if by == "vendor"
            else f"After DISCOM escalation, {self.vendor_name} {work}."
        )
        self._log(d, "success", text)

    def _close(self, k: Case, d: int) -> None:
        k.status = "verified"
        k.verified_day = d
        self.closed.append(k)
        self.active = None

    def _snapshot(self, d: int) -> Case | None:
        if self.active is not None:
            return self.active
        return next((k for k in self.closed if k.verified_day == d), None)

    def _log(self, day: int, kind: LogKind, text: str) -> None:
        self.decisions.append(Decision(day, kind, text))


def opening_reason(cause: CaseCause, pct: int) -> tuple[LogKind, str]:
    """The plain-language reason for opening a case, as the demo words it."""
    if cause == "fault":
        return (
            "danger",
            f"Output collapsed overnight to {pct}% while sunlight was normal. "
            "Diagnosis: inverter or wiring fault.",
        )
    return (
        "warning",
        f"Gap widening every dry day, now {pct}%. Haze already counted. Diagnosis: dust on panels.",
    )


# --- formatting that matches JavaScript ---------------------------------------------------

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def format_day(start: date, day: int) -> str:
    """Short label such as "29 Sep", like the engine's ``formatDay``."""
    d = start + timedelta(days=day)
    return f"{d.day} {_MONTHS[d.month - 1]}"


def round_half_up(x: float) -> int:
    """JavaScript's ``Math.round``: halves round towards +infinity (Python rounds to even)."""
    whole = math.floor(x)
    return whole + 1 if x - whole >= 0.5 else whole


def fixed1(x: float) -> str:
    """JavaScript's ``toFixed(1)``: rounds the exact binary value, ties away from zero."""
    return str(Decimal(x).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))
