"""Creating case records and starting their workflow."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from typing import Any

import boto3
from suryasaathi_core.config import Settings
from suryasaathi_core.rules import CaseCause

#: Keys of case.schema.json; the stored item carries extra workflow fields alongside.
SCHEMA_KEYS = {
    "caseId", "systemId", "vendorId", "cause", "status", "openedAt", "vendorDeadline",
    "escalatedAt", "fixedAt", "verifiedAt", "resolvedBy", "evidence", "reason",
}  # fmt: skip

#: Extra time after a deadline before the recheck, so the deadline day's reading is in.
DEADLINE_GRACE_SHARE = 0.25


def now_utc() -> datetime:
    return datetime.now(UTC)


def iso(t: datetime) -> str:
    return t.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def case_id(system_id: str, day: str) -> str:
    """One case per system and day: a retried event can't open a second one."""
    return f"{system_id}-{day.replace('-', '')}"


def add_days(day: str, days: int) -> str:
    return (date.fromisoformat(day) + timedelta(days=days)).isoformat()


def deadline_after(start: datetime, settings: Settings) -> datetime:
    """When to recheck: ``deadline_days`` "days" (60 s each in demo mode) plus some grace."""
    day = settings.day_length_seconds
    return start + timedelta(seconds=day * settings.deadline_days + day * DEADLINE_GRACE_SHARE)


def new_case(
    system: dict[str, Any],
    day: str,
    cause: CaseCause,
    reason: str,
    settings: Settings,
    now: datetime,
) -> dict[str, Any]:
    """The stored case item: case.schema.json fields plus the workflow's own."""
    cid = case_id(system["systemId"], day)
    return {
        "caseId": cid,
        "systemId": system["systemId"],
        "vendorId": system["vendorId"],
        "cause": cause,
        "status": "filed",
        "openedAt": iso(now),
        "vendorDeadline": iso(deadline_after(now, settings)),
        "reason": reason,
        "evidence": [f"dynamodb://{settings.readings_table}/{system['systemId']}"],
        # workflow fields (not part of the schema)
        "openedDate": day,
        "deadlineDate": add_days(day, settings.deadline_days),
        "discomId": system["discomId"],
    }


def schema_view(item: dict[str, Any]) -> dict[str, Any]:
    """The case as case.schema.json describes it."""
    return {k: v for k, v in item.items() if k in SCHEMA_KEYS}


def start_workflow(case: dict[str, Any], settings: Settings) -> str | None:
    """Starts the case's Step Functions execution, named after the case (idempotent)."""
    if not settings.case_workflow_arn:
        return None
    sfn = boto3.client("stepfunctions")
    try:
        result = sfn.start_execution(
            stateMachineArn=settings.case_workflow_arn,
            name=case["caseId"],
            input=json.dumps({"caseId": case["caseId"]}),
        )
    except sfn.exceptions.ExecutionAlreadyExists:
        return None
    return result["executionArn"]
