# services/agents

The agents that act on every reading, on AWS Lambda.

## Diagnosis agent (`handler.py`, `agent.py`, `toolkit.py`)

Invoked by the readings table's stream for every new reading. A
[Strands Agents](https://strandsagents.com) agent running Claude on Amazon Bedrock works
through five tools:

| Tool | What it does |
| --- | --- |
| `check_diagnosis_rules` | Applies README "Diagnosis rules (v1)" (the same code as the demo, `suryasaathi_core.rules`) and returns the required action |
| `get_readings` | The last days of readings with expected output, performance and rain |
| `get_expected_output` | Expected and clear-sky kWh for a date, and where the inputs came from |
| `open_case` | Files a dust or fault case and starts its Step Functions workflow |
| `close_case_after_rain` | Closes a dust case when overnight rain restored output |

The agent's final answer is the plain-language reason stored on the reading and logged with
the decision. The rules decide, not the model: `open_case` and `close_case_after_rain`
refuse anything the rules don't require, and the handler performs a required action the
model skipped. If Bedrock fails, the rule's own wording (the demo's) becomes the reason.

To keep Bedrock calls proportional, the agent runs when something happens (smog, dust,
fault, a case opened or closed); routine days use the rule wording. Set `AGENT_SCOPE=all`
to run it on every reading, or `AGENT_ENABLED=false` to run the rules alone.

Configuration: `BEDROCK_MODEL_ID` (default `anthropic.claude-opus-5-5`), `BEDROCK_REGION`,
`AGENT_EFFORT` (default `low`), plus the table names and `CASE_WORKFLOW_ARN` set by infra.

```bash
uv run pytest services/agents
```
