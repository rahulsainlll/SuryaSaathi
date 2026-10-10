"""The diagnosis agent: Strands Agents on Amazon Bedrock.

The model reads the evidence and the rule results through tools, takes the action the
rules require, and writes the plain-language reason that goes into the decision log.
Bedrock is reached through the Anthropic SDK's Bedrock client (the Messages API on
Bedrock), with the model ID and region from the environment.
"""

from __future__ import annotations

from typing import Any

import anthropic
from strands import Agent, tool
from strands.models.anthropic import AnthropicModel
from suryasaathi_core.config import Settings

from .toolkit import Toolkit

SYSTEM_PROMPT = """\
You are SuryaSaathi's diagnosis agent. You look after rooftop solar systems in India for the
families who own them, the vendors who owe them five years of free maintenance, and the
DISCOM that monitors them.

A new daily reading has arrived for one system. Decide what it means and act on it:

1. Call check_diagnosis_rules. It applies SuryaSaathi's diagnosis rules (v1) to the
   readings and the expected output for that roof and day, and tells you the required
   action. The rules are the decision: smog never opens a case; dust and faults do.
2. Look at get_readings or get_expected_output when you need the evidence to explain it.
3. Take exactly the required action: open_case for "open_case" (with the cause the rules
   gave), close_case_after_rain for "close_case", nothing for "none" or "wait".
4. Reply with the reason for the decision in two or three plain sentences that a DISCOM
   officer could read aloud: what the system made against what it should have made, what
   that means (smog, dust, a fault, healthy, or a case still open), and what was done.
   Use kWh and percentages. No markdown, no lists, no preamble.
"""


def build_tools(kit: Toolkit) -> list[Any]:
    @tool
    def get_readings(days: int = 7) -> list[dict[str, Any]]:
        """Recent consecutive daily readings for this system, oldest first, each with the
        expected output for that day, performance (actual / expected) and overnight rain.

        Args:
            days: How many days to return, 1 to 14.
        """
        return kit.get_readings(days)

    @tool
    def get_expected_output(date: str) -> dict[str, Any]:
        """Expected output for this system on a date: expected kWh given that day's sunlight
        and haze, the clear-sky reference, whether it rained overnight, and the data source.

        Args:
            date: The day, as YYYY-MM-DD.
        """
        return kit.get_expected_output(date)

    @tool
    def check_diagnosis_rules() -> dict[str, Any]:
        """Applies the diagnosis rules (v1) to today's reading and returns the diagnosis
        (healthy, smog, dust, fault, or null when a case is already open), the required
        action (none, open_case, close_case, wait), the cause, today's performance and the
        open case's id."""
        return kit.check_diagnosis_rules()

    @tool
    def open_case(cause: str, reason: str) -> dict[str, Any]:
        """Files a free-maintenance case with the vendor and starts its 3-day deadline.
        Only works when check_diagnosis_rules requires open_case with this cause.

        Args:
            cause: "dust" or "fault", as given by check_diagnosis_rules.
            reason: One sentence of evidence for the vendor.
        """
        return kit.open_case(cause, reason)

    @tool
    def close_case_after_rain(reason: str) -> dict[str, Any]:
        """Closes the open dust case because overnight rain cleaned the panels. Only works
        when check_diagnosis_rules requires close_case.

        Args:
            reason: One sentence on what the readings show.
        """
        return kit.close_case_after_rain(reason)

    return [
        check_diagnosis_rules,
        get_readings,
        get_expected_output,
        open_case,
        close_case_after_rain,
    ]


def bedrock_model(settings: Settings) -> AnthropicModel:
    """Claude on Amazon Bedrock through the Anthropic SDK's Bedrock (Mantle) client."""
    model = AnthropicModel(
        model_id=settings.bedrock_model_id,
        max_tokens=4096,
        params={"output_config": {"effort": settings.agent_effort}},
    )
    # Strands builds a first-party client; swap in the Bedrock one, which has the same
    # messages API (stream, count_tokens) and signs requests with the Lambda's AWS role.
    model.client = anthropic.AsyncAnthropicBedrockMantle(aws_region=settings.bedrock_region)  # type: ignore[assignment]
    return model


def build_agent(kit: Toolkit, settings: Settings, model: Any | None = None) -> Agent:
    return Agent(
        model=model or bedrock_model(settings),
        tools=build_tools(kit),
        system_prompt=SYSTEM_PROMPT,
        callback_handler=None,
    )


def run_agent(kit: Toolkit, settings: Settings) -> str:
    """Runs the agent for one reading and returns its plain-language reason."""
    agent = build_agent(kit, settings)
    result = agent(
        f"New reading for system {kit.system_id} on {kit.day}. Decide what it means, take the "
        "action the rules require, and give the reason."
    )
    return str(result).strip()
