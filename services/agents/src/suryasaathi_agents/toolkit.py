"""What the diagnosis agent can see and do for one new reading.

The rules decide; the toolkit refuses anything they don't require. The Strands agent
calls these methods through tools and explains the decision; the handler makes sure the
required action happened even if the model skipped it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Literal

from suryasaathi_core.config import Settings
from suryasaathi_core.logs import log_event
from suryasaathi_core.rules import (
    Case,
    CaseCause,
    Diagnosis,
    LogKind,
    diagnose,
    discom_waiting_reason,
    filed_reason,
    healthy_reason,
    opening_reason,
    rain_closed_reason,
    rain_closes,
    round_half_up,
    smog_reason,
    waiting_reason,
)
from suryasaathi_core.store import Store

from .cases import add_days, case_id, iso, new_case, now_utc, start_workflow
from .observations import ExpectedLookup, History

RuleAction = Literal["none", "open_case", "close_case", "wait"]


@dataclass
class RuleResult:
    """What the README rules require for today's reading."""

    diagnosis: Diagnosis | None
    action: RuleAction
    cause: CaseCause | None
    performance: float
    #: The demo's wording for the decision; the reason used when the agent gives none.
    reason: str
    kind: LogKind
    case_id: str | None = None

    def as_tool_result(self) -> dict[str, Any]:
        return {
            "diagnosis": self.diagnosis,
            "requiredAction": self.action,
            "cause": self.cause,
            "performancePct": round(self.performance * 100, 1),
            "openCaseId": self.case_id,
            "ruleExplanation": self.reason,
        }


@dataclass
class Toolkit:
    store: Store
    settings: Settings
    expected: ExpectedLookup
    system_id: str
    day: str
    now: datetime = field(default_factory=now_utc)
    opened_case: dict[str, Any] | None = None
    closed_case_id: str | None = None
    _history: History | None = None
    _result: RuleResult | None = None

    @property
    def history(self) -> History:
        if self._history is None:
            self._history = History(self.store, self.expected, self.system_id, self.day)
        return self._history

    # --- tools -----------------------------------------------------------------------

    def get_readings(self, days: int = 7) -> list[dict[str, Any]]:
        """The last ``days`` consecutive daily readings with expected output and performance."""
        return self.history.summary()[-max(1, min(days, 14)) :]

    def get_expected_output(self, day: str) -> dict[str, Any]:
        record = self.expected(self.system_id, day)
        keep = ("date", "expectedKwh", "clearSkyKwh", "rained", "source", "assumed")
        return {k: record[k] for k in keep if k in record}

    def check_diagnosis_rules(self) -> dict[str, Any]:
        return self.evaluate().as_tool_result()

    def open_case(self, cause: str, reason: str) -> dict[str, Any]:
        rule = self.evaluate()
        if rule.action != "open_case" or cause != rule.cause:
            return {"refused": f"The rules require {rule.action!r} today, not a {cause} case."}
        if self.opened_case:
            return {"caseId": self.opened_case["caseId"], "alreadyOpened": True}
        system = self.store.get_system(self.system_id)
        assert system is not None
        assert rule.cause is not None
        case = new_case(system, self.day, rule.cause, reason, self.settings, self.now)
        if self.store.create_case(case):
            case["executionArn"] = start_workflow(case, self.settings)
            if case["executionArn"]:
                self.store.update_case(case["caseId"], {"executionArn": case["executionArn"]})
            log_event("case_filed", case_id=case["caseId"], system_id=self.system_id, cause=cause)
        self.opened_case = case
        return {
            "caseId": case["caseId"],
            "deadlineDate": case["deadlineDate"],
            "vendorNotified": bool(self.settings.case_workflow_arn),
        }

    def close_case_after_rain(self, reason: str) -> dict[str, Any]:
        rule = self.evaluate()
        if rule.action != "close_case" or rule.case_id is None:
            return {"refused": f"The rules require {rule.action!r} today, not closing a case."}
        if self.closed_case_id is None:
            self.store.update_case(
                rule.case_id,
                {
                    "status": "verified",
                    "resolvedBy": "rain",
                    "verifiedAt": iso(self.now),
                    "verifiedDate": self.day,
                    "closedReason": reason,
                },
            )
            log_event("case_closed_by_rain", case_id=rule.case_id, system_id=self.system_id)
            self.closed_case_id = rule.case_id
        return {"caseId": rule.case_id, "closed": True}

    # --- the rules -----------------------------------------------------------------------

    def evaluate(self) -> RuleResult:
        if self._result is None:
            self._result = self._evaluate()
        return self._result

    def _evaluate(self) -> RuleResult:
        h = self.history
        today = h.today
        pct = round_half_up(today.performance * 100)
        active = self.store.open_case(self.system_id)
        if active is not None:
            case = Case(
                id=active["caseId"],
                cause=active["cause"],
                status=active["status"],
                opened_day=0,
                deadline_day=0,
            )
            if rain_closes(case, today):
                kind, text = rain_closed_reason(case.id)
                return RuleResult(
                    None, "close_case", case.cause, today.performance, text, kind, case.id
                )
            if case.status == "escalated":
                kind, text = discom_waiting_reason(pct)
            else:
                left = (
                    date.fromisoformat(active["deadlineDate"]) - date.fromisoformat(self.day)
                ).days
                kind, text = waiting_reason(self.settings.vendor_name, max(left, 0), pct)
            return RuleResult(None, "wait", case.cause, today.performance, text, kind, case.id)

        diagnosis = diagnose(h.observations, h.index)
        if diagnosis in ("dust", "fault"):
            kind, text = opening_reason(diagnosis, pct)
            due = date.fromisoformat(add_days(self.day, self.settings.deadline_days))
            _, filed = filed_reason(
                case_id(self.system_id, self.day),
                diagnosis,
                self.settings.vendor_name,
                f"{due.day} {due:%b}",
            )
            return RuleResult(
                diagnosis, "open_case", diagnosis, today.performance, f"{text} {filed}", kind
            )
        if diagnosis == "smog":
            kind, text = smog_reason(today, pct)
        else:
            kind, text = healthy_reason(today, pct)
        return RuleResult(diagnosis, "none", None, today.performance, text, kind)
