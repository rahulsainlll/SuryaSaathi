"""Settings read from the Lambda environment (set by infra/)."""

import os
from dataclasses import dataclass


def _env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


@dataclass(frozen=True)
class Settings:
    systems_table: str = "suryasaathi-systems"
    readings_table: str = "suryasaathi-readings"
    cases_table: str = "suryasaathi-cases"
    expected_table: str = "suryasaathi-expected"
    #: Console summary items written nightly by services/rollups.
    summaries_table: str = "suryasaathi-summaries"
    #: Rupees per kWh for the console's money-lost figure, and its window in days.
    tariff_inr: float = 7.0
    window_days: int = 30
    #: Lambda that computes expected output on a cache miss.
    expected_function: str | None = None
    #: Step Functions state machine started for every new case.
    case_workflow_arn: str | None = None
    #: "bedrock" calls Claude on Amazon Bedrock; "anthropic" calls the Anthropic API
    #: directly, with the key read at runtime from the Secrets Manager secret below.
    model_provider: str = "bedrock"
    #: Amazon Bedrock model and region for the diagnosis agent.
    bedrock_model_id: str = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    bedrock_region: str | None = None
    #: Model ID and secret used when model_provider is "anthropic".
    anthropic_model_id: str = "claude-haiku-4-5"
    anthropic_secret_name: str | None = None
    agent_effort: str = "low"
    #: False runs the rules without the LLM (reasons come from the templates).
    agent_enabled: bool = True
    #: "actions": ask the LLM only when something happens (smog, dust, fault, a case opened
    #: or closed); routine days use the rule wording. "all": every reading.
    agent_scope: str = "actions"
    #: Seconds in a "day" for case deadlines: 86400 normally, 60 in demo mode.
    day_length_seconds: int = 86400
    deadline_days: int = 3
    sender_email: str | None = None
    vendor_email: str | None = None
    discom_email: str | None = None
    vendor_name: str = "[Vendor name] Solar"

    @classmethod
    def from_env(cls) -> "Settings":
        d = cls()
        return cls(
            systems_table=_env("SYSTEMS_TABLE", d.systems_table) or d.systems_table,
            readings_table=_env("READINGS_TABLE", d.readings_table) or d.readings_table,
            cases_table=_env("CASES_TABLE", d.cases_table) or d.cases_table,
            expected_table=_env("EXPECTED_TABLE", d.expected_table) or d.expected_table,
            summaries_table=_env("SUMMARIES_TABLE", d.summaries_table) or d.summaries_table,
            tariff_inr=float(_env("TARIFF_INR", "7") or 7),
            window_days=int(_env("WINDOW_DAYS", "30") or 30),
            expected_function=_env("EXPECTED_FUNCTION"),
            case_workflow_arn=_env("CASE_WORKFLOW_ARN"),
            model_provider=(_env("MODEL_PROVIDER", d.model_provider) or d.model_provider).lower(),
            bedrock_model_id=_env("BEDROCK_MODEL_ID", d.bedrock_model_id) or d.bedrock_model_id,
            bedrock_region=_env("BEDROCK_REGION", _env("AWS_REGION")),
            anthropic_model_id=_env("ANTHROPIC_MODEL_ID", d.anthropic_model_id)
            or d.anthropic_model_id,
            anthropic_secret_name=_env("ANTHROPIC_SECRET_NAME"),
            agent_effort=_env("AGENT_EFFORT", d.agent_effort) or d.agent_effort,
            agent_enabled=(_env("AGENT_ENABLED", "true") or "true").lower() == "true",
            agent_scope=_env("AGENT_SCOPE", d.agent_scope) or d.agent_scope,
            day_length_seconds=int(_env("DAY_LENGTH_SECONDS", "86400") or 86400),
            deadline_days=int(_env("VENDOR_DEADLINE_DAYS", "3") or 3),
            sender_email=_env("SENDER_EMAIL"),
            vendor_email=_env("VENDOR_EMAIL"),
            discom_email=_env("DISCOM_EMAIL"),
            vendor_name=_env("VENDOR_NAME", d.vendor_name) or d.vendor_name,
        )
