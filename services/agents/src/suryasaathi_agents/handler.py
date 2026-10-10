"""Readings stream → diagnosis agent.

The readings table's stream (new rows only) invokes this for every stored reading. Each
reading gets one decision: the rules decide, the Strands agent on Bedrock explains and acts
through tools, and the handler makes sure the required action happened. Every decision is
written back onto the reading and logged as structured JSON.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from typing import Any

from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.types import TypeDeserializer
from suryasaathi_core.config import Settings
from suryasaathi_core.logs import AgentDecision, log_decision, log_event, logger
from suryasaathi_core.store import Store, from_item

from .cases import now_utc
from .observations import ExpectedLookup, lambda_expected_lookup
from .toolkit import RuleResult, Toolkit

AgentRunner = Callable[[Toolkit, Settings], str]

_deserializer = TypeDeserializer()
_store: Store | None = None


def _runtime() -> tuple[Store, Settings]:
    global _store
    if _store is None:
        _store = Store()
    return _store, _store.settings


def _default_runner(kit: Toolkit, settings: Settings) -> str:
    from .agent import run_agent  # imported lazily: Strands is only needed when the LLM runs

    return run_agent(kit, settings)


@logger.inject_lambda_context(clear_state=True)
def handler(event: dict[str, Any], context: LambdaContext) -> dict[str, Any]:
    store, settings = _runtime()
    failures = []
    for record in event.get("Records", []):
        if record.get("eventName") != "INSERT":
            continue
        image = record["dynamodb"]["NewImage"]
        reading = from_item({k: _deserializer.deserialize(v) for k, v in image.items()})
        try:
            process_reading(reading, store, settings, lambda_expected_lookup(store, settings))
        except Exception:
            logger.exception(
                "reading_failed",
                extra={"systemId": reading.get("systemId"), "date": reading.get("date")},
            )
            failures.append({"itemIdentifier": record["dynamodb"]["SequenceNumber"]})
    return {"batchItemFailures": failures}


def uses_agent(rule: RuleResult, settings: Settings) -> bool:
    if not settings.agent_enabled:
        return False
    if settings.agent_scope == "all":
        return True
    return rule.action in ("open_case", "close_case") or rule.diagnosis in ("smog", "dust", "fault")


def process_reading(
    reading: dict[str, Any],
    store: Store,
    settings: Settings,
    expected: ExpectedLookup,
    runner: AgentRunner = _default_runner,
    now: datetime | None = None,
) -> AgentDecision:
    kit = Toolkit(
        store,
        settings,
        expected,
        reading["systemId"],
        reading["date"],
        now=now or now_utc(),
    )
    rule = kit.evaluate()

    reason, source = rule.reason, "rules"
    if uses_agent(rule, settings):
        try:
            text = runner(kit, settings)
            if text:
                reason, source = text, "agent"
        except Exception as e:  # Bedrock down, throttled, refused: the rules still decide
            log_event("agent_error", system_id=kit.system_id, date=kit.day, error=repr(e))

    # The rules' action happens exactly once, whether or not the model took it.
    if rule.action == "open_case" and kit.opened_case is None:
        assert rule.cause is not None
        kit.open_case(rule.cause, rule.reason)
        log_event(
            "agent_action_reconciled", system_id=kit.system_id, date=kit.day, action="open_case"
        )
    if rule.action == "close_case" and kit.closed_case_id is None:
        kit.close_case_after_rain(rule.reason)
        log_event(
            "agent_action_reconciled", system_id=kit.system_id, date=kit.day, action="close_case"
        )

    today = kit.history.today
    decision = AgentDecision(
        system_id=kit.system_id,
        date=kit.day,
        diagnosis=rule.diagnosis,
        action=rule.action,
        reason=reason,
        reason_source=source,  # type: ignore[arg-type]
        case_id=(kit.opened_case or {}).get("caseId") or rule.case_id,
        performance=round(today.performance, 4),
        expected_kwh=round(today.expected_kwh, 3),
        actual_kwh=today.actual_kwh,
        rule={"diagnosis": rule.diagnosis, "action": rule.action, "text": rule.reason},
    )
    store.annotate_reading(
        kit.system_id,
        kit.day,
        {
            "expectedKwh": decision.expected_kwh,
            "clearSkyKwh": round(today.clear_sky_kwh, 3),
            "rained": today.rained,
            "performance": decision.performance,
            "diagnosis": rule.diagnosis,
            "action": rule.action,
            "reason": reason,
            "reasonSource": source,
            "caseId": decision.case_id,
        },
    )
    log_decision(decision)
    return decision
