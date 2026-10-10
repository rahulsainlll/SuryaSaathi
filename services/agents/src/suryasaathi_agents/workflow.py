"""The steps of the per-case Step Functions state machine (one Lambda, ``step`` selects).

    NotifyVendor → WaitForDeadline → Recheck ─┬ verified      → Verify → done
                         ▲                     ├ closed        → done (rain closed it)
                         │                     ├ pending       → wait a little, Recheck again
                         ├──────── Escalate ◄──┼ escalate
                         └──────── Remind   ◄──┼ still_failing
                                               └ unresolved    → fail

Deadlines are "days" of ``DAY_LENGTH_SECONDS`` (60 s in demo mode). Rechecks look at the
reading dated on the deadline day, using the same rules as the demo (``rules.recheck``).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from aws_lambda_powertools.utilities.typing import LambdaContext
from suryasaathi_core.config import Settings
from suryasaathi_core.logs import AgentDecision, log_decision, log_event, logger
from suryasaathi_core.rules import (
    DEADLINE_DAYS,
    Case,
    CaseResolver,
    Observation,
    escalation_reason,
    family_message,
    recheck,
    round_half_up,
    verified_reason,
)
from suryasaathi_core.store import Store

from .cases import add_days, deadline_after, iso, now_utc
from .notify import discom_email, send_email, vendor_email
from .observations import ExpectedLookup, lambda_expected_lookup, observation

#: Rechecks while the deadline day's reading hasn't arrived before treating it as missing.
MAX_PENDING = 4
#: DISCOM reminders before the case is reported unresolved.
MAX_REMINDERS = 2

_store: Store | None = None


@logger.inject_lambda_context(clear_state=True)
def handler(event: dict[str, Any], context: LambdaContext) -> dict[str, Any]:
    global _store
    if _store is None:
        _store = Store()
    return run_step(event, _store, _store.settings, lambda_expected_lookup(_store, _store.settings))


def run_step(
    event: dict[str, Any],
    store: Store,
    settings: Settings,
    expected: ExpectedLookup,
    now: datetime | None = None,
) -> dict[str, Any]:
    steps = {
        "notifyVendor": notify_vendor,
        "recheck": recheck_case,
        "escalate": escalate,
        "remind": remind,
        "verify": verify,
    }
    return steps[event["step"]](event, store, settings, expected, now or now_utc())


def _load(store: Store, event: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    case = store.get_case(event["caseId"])
    if case is None:
        raise LookupError(f"Unknown case {event['caseId']}")
    system = store.get_system(case["systemId"])
    if system is None:
        raise LookupError(f"Unknown system {case['systemId']}")
    return case, system


def _evidence(store: Store, case: dict[str, Any], up_to: str) -> list[dict[str, Any]]:
    return store.recent_readings(case["systemId"], up_to, 7)


def notify_vendor(
    event: dict[str, Any], store: Store, settings: Settings, expected: ExpectedLookup, now: datetime
) -> dict[str, Any]:
    case, system = _load(store, event)
    subject, body = vendor_email(
        case, system, _evidence(store, case, case["openedDate"]), settings.vendor_name
    )
    send_email(settings, settings.vendor_email, subject, body, case["caseId"])
    store.update_case(case["caseId"], {"vendorNotifiedAt": iso(now)})
    return {"caseId": case["caseId"], "waitUntil": case["vendorDeadline"]}


def recheck_case(
    event: dict[str, Any], store: Store, settings: Settings, expected: ExpectedLookup, now: datetime
) -> dict[str, Any]:
    case, _ = _load(store, event)
    out: dict[str, Any] = {"caseId": case["caseId"], "attempts": event.get("attempts", 0) + 1}
    if case["status"] == "verified":
        return {**out, "outcome": "closed"}

    escalated = case["status"] == "escalated"
    due = case["discomDeadlineDate"] if escalated else case["deadlineDate"]
    outcome: str = recheck(_case(case), _history(store, expected, case, due))
    if outcome == "pending" and out["attempts"] >= MAX_PENDING:
        outcome = "still_failing" if escalated else "escalate"  # no reading is not a fix
        log_event("recheck_without_reading", case_id=case["caseId"], due=due)
    if outcome == "still_failing" and case.get("reminders", 0) >= MAX_REMINDERS:
        outcome = "unresolved"
    log_event("case_rechecked", case_id=case["caseId"], due=due, outcome=outcome)
    if outcome == "pending":
        return {
            **out,
            "outcome": outcome,
            "retryAfterSeconds": max(settings.day_length_seconds // 4, 10),
        }
    return {**out, "outcome": outcome, "attempts": 0}


def escalate(
    event: dict[str, Any], store: Store, settings: Settings, expected: ExpectedLookup, now: datetime
) -> dict[str, Any]:
    case, system = _load(store, event)
    discom_deadline = deadline_after(now, settings)
    case = store.update_case(
        case["caseId"],
        {
            "status": "escalated",
            "escalatedAt": iso(now),
            "escalatedDate": case["deadlineDate"],
            "discomDeadlineDate": add_days(case["deadlineDate"], settings.deadline_days),
            "discomDeadline": iso(discom_deadline),
        },
    )
    subject, body = discom_email(
        case, system, _evidence(store, case, case["deadlineDate"]), settings.vendor_name
    )
    send_email(settings, settings.discom_email, subject, body, case["caseId"])
    _decide(store, case, case["deadlineDate"], "escalate", escalation_reason(case["caseId"])[1])
    return {"caseId": case["caseId"], "waitUntil": iso(discom_deadline)}


def remind(
    event: dict[str, Any], store: Store, settings: Settings, expected: ExpectedLookup, now: datetime
) -> dict[str, Any]:
    case, system = _load(store, event)
    reminders = case.get("reminders", 0) + 1
    discom_deadline = deadline_after(now, settings)
    case = store.update_case(
        case["caseId"],
        {
            "reminders": reminders,
            "discomDeadlineDate": add_days(case["discomDeadlineDate"], settings.deadline_days),
            "discomDeadline": iso(discom_deadline),
        },
    )
    subject, body = discom_email(
        case,
        system,
        _evidence(store, case, case["discomDeadlineDate"]),
        settings.vendor_name,
        reminders,
    )
    send_email(settings, settings.discom_email, subject, body, case["caseId"])
    return {"caseId": case["caseId"], "waitUntil": iso(discom_deadline)}


def verify(
    event: dict[str, Any], store: Store, settings: Settings, expected: ExpectedLookup, now: datetime
) -> dict[str, Any]:
    case, _ = _load(store, event)
    escalated = case["status"] == "escalated"
    due = case["discomDeadlineDate"] if escalated else case["deadlineDate"]
    reading = store.get_reading(case["systemId"], due)
    assert reading is not None
    pct = round_half_up(observation(reading, expected(case["systemId"], due)).performance * 100)
    resolved_by: CaseResolver = "discom" if escalated else "vendor"
    message = family_message(case["cause"], resolved_by, pct, case["caseId"])
    case = store.update_case(
        case["caseId"],
        {
            "status": "verified",
            "verifiedAt": iso(now),
            "resolvedBy": resolved_by,
            "verifiedDate": due,
            "familyMessage": message,
        },
    )
    _decide(store, case, due, "verify", verified_reason(case["caseId"], pct)[1])
    log_event(
        "family_message",
        case_id=case["caseId"],
        system_id=case["systemId"],
        language="hi",
        text=message,
    )
    return {"caseId": case["caseId"], "outcome": "verified"}


# --- helpers -----------------------------------------------------------------------------


def _day(case: dict[str, Any], key: str) -> int:
    return (date.fromisoformat(case[key]) - date.fromisoformat(case["openedDate"])).days


def _case(item: dict[str, Any]) -> Case:
    """The stored case in the rules' day-indexed form (day 0 = the day it was opened)."""
    return Case(
        id=item["caseId"],
        cause=item["cause"],
        status=item["status"],
        opened_day=0,
        deadline_day=_day(item, "deadlineDate"),
        # The rules recheck an escalated case DEADLINE_DAYS after escalation; anchoring on
        # the stored DISCOM deadline keeps that right after reminders move it out.
        escalated_day=_day(item, "discomDeadlineDate") - DEADLINE_DAYS
        if item.get("discomDeadlineDate")
        else None,
    )


def _history(
    store: Store, expected: ExpectedLookup, case: dict[str, Any], up_to: str
) -> list[Observation | None]:
    """Observations from the opening day to ``up_to``, None where a reading is missing."""
    rows = {
        r["date"]: r for r in store.readings_between(case["systemId"], case["openedDate"], up_to)
    }
    first = date.fromisoformat(case["openedDate"])
    out: list[Observation | None] = []
    for i in range((date.fromisoformat(up_to) - first).days + 1):
        day = (first + timedelta(days=i)).isoformat()
        out.append(observation(rows[day], expected(case["systemId"], day)) if day in rows else None)
    return out


def _decide(store: Store, case: dict[str, Any], day: str, action: str, reason: str) -> None:
    log_decision(
        AgentDecision(
            system_id=case["systemId"],
            date=day,
            diagnosis=None,
            action=action,  # type: ignore[arg-type]
            reason=reason,
            case_id=case["caseId"],
        )
    )
