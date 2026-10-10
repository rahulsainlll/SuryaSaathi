"""Structured CloudWatch logs. Every agent decision is one JSON line with ``event``
``agent_decision``, so CloudWatch Logs Insights can filter and chart them."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from aws_lambda_powertools import Logger

logger = Logger()

Action = Literal["none", "open_case", "close_case", "wait", "escalate", "verify", "notify"]


@dataclass
class AgentDecision:
    system_id: str
    date: str
    #: What the rules said, or None when a case was already open.
    diagnosis: str | None
    action: Action
    #: Plain-language reason, written by the agent (or the rule template as a fallback).
    reason: str
    reason_source: Literal["agent", "rules"] = "rules"
    case_id: str | None = None
    performance: float | None = None
    expected_kwh: float | None = None
    actual_kwh: float | None = None
    rule: dict[str, Any] = field(default_factory=dict)


def _camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(p.title() for p in rest)


def log_decision(decision: AgentDecision) -> dict[str, Any]:
    """Logs one decision as structured JSON and returns the logged fields."""
    fields = {_camel(k): v for k, v in asdict(decision).items() if v is not None}
    logger.info("agent_decision", extra={"event": "agent_decision", **fields})
    return fields


def log_event(event: str, **fields: Any) -> None:
    """Logs any other workflow event (case filed, escalated, verified, email sent…)."""
    logger.info(event, extra={"event": event, **{_camel(k): v for k, v in fields.items()}})
