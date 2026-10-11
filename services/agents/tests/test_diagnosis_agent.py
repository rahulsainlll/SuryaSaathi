import json
from typing import Any

import boto3
import pytest
from boto3.dynamodb.types import TypeSerializer
from suryasaathi_agents.agent import SYSTEM_PROMPT, bedrock_model, build_agent, build_model
from suryasaathi_agents.cases import case_id, schema_view
from suryasaathi_agents.handler import handler, process_reading, uses_agent
from suryasaathi_agents.toolkit import Toolkit
from suryasaathi_core.config import Settings
from suryasaathi_core.fixtures import load_fixture
from suryasaathi_core.logs import AgentDecision
from suryasaathi_core.schemas import errors
from suryasaathi_core.store import Store, to_item

from .conftest import fixture_lookup, reading_for, register

RULES_ONLY = Settings(agent_enabled=False)


def replay(
    store: Store, name: str, days: int, settings: Settings = RULES_ONLY, **kw: Any
) -> list[AgentDecision]:
    fixture = load_fixture(name)
    register(store, fixture)
    out = []
    for d in range(days):
        reading = reading_for(fixture, d)
        store.put_reading(reading)
        out.append(process_reading(reading, store, settings, fixture_lookup(fixture), **kw))
    return out


@pytest.mark.parametrize(
    ("name", "first_case_day", "cause"),
    [
        ("dust", 12, "dust"),
        ("fault", 12, "fault"),
        ("rain", 12, "dust"),
        ("vendor-misses-deadline", 15, "dust"),
    ],
)
def test_cases_open_on_the_same_day_as_the_engine(
    store: Store, name: str, first_case_day: int, cause: str
) -> None:
    fixture = load_fixture(name)
    decisions = replay(store, name, first_case_day + 1)
    for d, decision in enumerate(decisions):
        assert decision.diagnosis == fixture.days[d].diagnosis, f"day {d}"
    opened = decisions[-1]
    assert opened.action == "open_case" and opened.diagnosis == cause
    case = store.get_case(opened.case_id or "")
    assert (
        case is not None
        and case["status"] == "filed"
        and case["deadlineDate"] == f"2026-10-{first_case_day + 4:02d}"  # opened + 3 days
    )
    assert errors("case", schema_view(case)) == []


def test_smog_days_never_open_a_case(store: Store) -> None:
    decisions = replay(store, "smog-day", 30)
    assert [i for i, d in enumerate(decisions) if d.diagnosis == "smog"] == [6, 16, 24]
    assert all(d.action == "none" for d in decisions)
    assert decisions[6].reason.startswith("Smog cut the sunlight")


def test_rain_closes_the_open_dust_case(store: Store) -> None:
    decisions = replay(store, "rain", 14)
    assert decisions[12].action == "open_case"
    assert decisions[13].action == "close_case"
    case = store.get_case(case_id("SS-SIM-0001", "2026-10-13"))
    assert case is not None and case["status"] == "verified" and case["resolvedBy"] == "rain"
    assert case["verifiedDate"] == "2026-10-14"
    assert (
        decisions[13].reason
        == f"Rain cleaned the panels before the visit. Case {case['caseId']} closed, no visit needed."
    )


def test_open_cases_are_waited_on_not_rediagnosed(store: Store) -> None:
    decisions = replay(store, "fault", 14)
    assert decisions[13].diagnosis is None and decisions[13].action == "wait"
    assert decisions[13].reason.startswith("Waiting for [Vendor name] Solar: 2 days left.")


def test_decisions_are_written_onto_the_reading(store: Store) -> None:
    replay(store, "fault", 13)
    stored = store.get_reading("SS-SIM-0001", "2026-10-13")
    assert stored is not None
    assert stored["diagnosis"] == "fault" and stored["action"] == "open_case"
    assert stored["caseId"] == "SS-SIM-0001-20261013"
    assert stored["reasonSource"] == "rules"


# --- the LLM path ---------------------------------------------------------------------

AGENT_ON = Settings(agent_enabled=True)


def test_the_agents_reason_is_used_and_its_action_is_not_repeated(store: Store) -> None:
    calls: list[str] = []

    def runner(kit: Toolkit, settings: Settings) -> str:
        assert kit.check_diagnosis_rules()["requiredAction"] == "open_case"
        calls.append(kit.open_case("fault", "Output fell to 32% overnight.")["caseId"])
        return "The inverter output collapsed to 32% overnight in clear weather, so I filed a repair case."

    decisions = replay(store, "fault", 13, AGENT_ON, runner=runner)
    assert len(calls) == 1
    assert decisions[-1].reason_source == "agent"
    assert decisions[-1].reason.startswith("The inverter output collapsed")
    assert store.get_case(calls[0]) is not None


def test_a_required_case_is_opened_even_if_the_model_does_not(store: Store) -> None:
    decisions = replay(store, "fault", 13, AGENT_ON, runner=lambda kit, s: "Looks like a fault.")
    assert decisions[-1].reason_source == "agent"
    assert store.get_case(decisions[-1].case_id or "") is not None


def test_the_toolkit_refuses_cases_the_rules_do_not_require(store: Store) -> None:
    def rogue(kit: Toolkit, settings: Settings) -> str:
        assert "refused" in kit.open_case("fault", "I think it is broken")
        assert "refused" in kit.close_case_after_rain("rain")
        return "Smog lowered the expected output; the system is healthy."

    decisions = replay(store, "smog-day", 7, AGENT_ON, runner=rogue)
    assert decisions[6].action == "none" and decisions[6].reason_source == "agent"
    assert store.open_case("SS-SIM-0001") is None


def test_bedrock_failures_fall_back_to_the_rules(store: Store) -> None:
    def broken(kit: Toolkit, settings: Settings) -> str:
        raise RuntimeError("ThrottlingException")

    decisions = replay(store, "fault", 13, AGENT_ON, runner=broken)
    assert decisions[-1].reason_source == "rules"
    assert decisions[-1].reason.startswith("Output collapsed overnight to 31%")
    assert store.get_case(decisions[-1].case_id or "") is not None


def test_routine_days_skip_the_llm_unless_scope_is_all() -> None:
    from suryasaathi_agents.toolkit import RuleResult

    healthy = RuleResult("healthy", "none", None, 0.97, "ok", "neutral")
    smog = RuleResult("smog", "none", None, 0.95, "smog", "info")
    assert not uses_agent(healthy, AGENT_ON)
    assert uses_agent(smog, AGENT_ON)
    assert uses_agent(healthy, Settings(agent_scope="all"))
    assert not uses_agent(smog, RULES_ONLY)


def test_the_strands_agent_is_wired_to_bedrock_and_the_tools(store: Store) -> None:
    fixture = load_fixture("fault")
    register(store, fixture)
    store.put_reading(reading_for(fixture, 0))
    settings = Settings(
        bedrock_model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
        bedrock_region="ap-south-1",
    )
    kit = Toolkit(store, settings, fixture_lookup(fixture), "SS-SIM-0001", "2026-10-01")
    model = bedrock_model(settings)
    assert model.config["model_id"] == "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    agent = build_agent(kit, settings, model)
    assert sorted(agent.tool_names) == [
        "check_diagnosis_rules", "close_case_after_rain", "get_expected_output", "get_readings", "open_case",
    ]  # fmt: skip
    assert "check_diagnosis_rules" in SYSTEM_PROMPT
    assert agent.tool.check_diagnosis_rules()["status"] == "success"


def test_the_anthropic_provider_reads_its_key_from_secrets_manager(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """MODEL_PROVIDER=anthropic takes the key from the secret, never from the environment."""
    import suryasaathi_agents.agent as agent_module

    agent_module._anthropic_api_key.cache_clear()
    asked: list[str] = []

    class FakeSecrets:
        def get_secret_value(self, SecretId: str) -> dict[str, str]:  # noqa: N803
            asked.append(SecretId)
            return {"SecretString": json.dumps({"apiKey": "sk-ant-test"})}

    monkeypatch.setattr("boto3.client", lambda *a, **k: FakeSecrets())
    settings = Settings(
        model_provider="anthropic",
        anthropic_model_id="claude-haiku-4-5",
        anthropic_secret_name="suryasaathi/anthropic-api-key",
    )
    model = build_model(settings)
    assert model.config["model_id"] == "claude-haiku-4-5"
    assert asked == ["suryasaathi/anthropic-api-key"]
    assert model.client.api_key == "sk-ant-test"
    agent_module._anthropic_api_key.cache_clear()


def test_a_bare_secret_string_is_accepted_as_the_key(monkeypatch: pytest.MonkeyPatch) -> None:
    import suryasaathi_agents.agent as agent_module

    agent_module._anthropic_api_key.cache_clear()

    class FakeSecrets:
        def get_secret_value(self, SecretId: str) -> dict[str, str]:  # noqa: N803
            return {"SecretString": "  sk-ant-plain  "}

    monkeypatch.setattr("boto3.client", lambda *a, **k: FakeSecrets())
    key = agent_module._anthropic_api_key("some/secret", "us-east-1")
    assert key == "sk-ant-plain"
    agent_module._anthropic_api_key.cache_clear()


def test_the_default_provider_is_still_bedrock() -> None:
    assert Settings().model_provider == "bedrock"
    assert type(build_model(Settings(bedrock_region="us-east-1"))).__name__ == "BedrockModel"


def test_new_cases_start_their_workflow(store: Store, monkeypatch: pytest.MonkeyPatch) -> None:
    sfn = boto3.client("stepfunctions")
    arn = sfn.create_state_machine(
        name="case-workflow",
        definition=json.dumps({"StartAt": "Done", "States": {"Done": {"Type": "Succeed"}}}),
        roleArn="arn:aws:iam::123456789012:role/sfn",
    )["stateMachineArn"]
    settings = Settings(agent_enabled=False, case_workflow_arn=arn)
    decisions = replay(store, "fault", 13, settings)
    executions = sfn.list_executions(stateMachineArn=arn)["executions"]
    assert [e["name"] for e in executions] == [decisions[-1].case_id]
    case = store.get_case(decisions[-1].case_id or "")
    assert case is not None and case["executionArn"] == executions[0]["executionArn"]


def test_the_stream_handler_only_processes_new_readings(
    store: Store, monkeypatch: pytest.MonkeyPatch
) -> None:
    fixture = load_fixture("fault")
    register(store, fixture)
    reading = reading_for(fixture, 0)
    store.put_reading(reading)
    monkeypatch.setattr("suryasaathi_agents.handler._store", store)
    monkeypatch.setattr(
        "suryasaathi_agents.handler.lambda_expected_lookup", lambda s, cfg: fixture_lookup(fixture)
    )
    image = {k: TypeSerializer().serialize(v) for k, v in to_item(reading).items()}
    event = {
        "Records": [
            {"eventName": "MODIFY", "dynamodb": {"NewImage": image, "SequenceNumber": "1"}},
            {"eventName": "INSERT", "dynamodb": {"NewImage": image, "SequenceNumber": "2"}},
        ]
    }

    class Context:
        function_name = "agents"
        memory_limit_in_mb = 512
        invoked_function_arn = "arn:aws:lambda:ap-south-1:123456789012:function:agents"
        aws_request_id = "req-1"

    assert handler(event, Context()) == {"batchItemFailures": []}  # type: ignore[arg-type]
    stored = store.get_reading("SS-SIM-0001", "2026-10-01")
    assert stored is not None and stored["diagnosis"] == "healthy"
