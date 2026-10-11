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

Configuration: `BEDROCK_MODEL_ID` (default `us.anthropic.claude-haiku-4-5-20251001-v1:0`), `BEDROCK_REGION`,
`AGENT_EFFORT` (kept for compatibility; the Converse API takes no effort parameter, so it
is not applied), plus the table names and `CASE_WORKFLOW_ARN` set by infra.

```bash
uv run pytest services/agents
```

## Case workflow (`workflow.py`, `notify.py`)

Each new case starts a Step Functions execution named after the case. Its states call
`suryasaathi_agents.workflow.handler` with a `step`:

```
NotifyVendor → WaitForDeadline → Recheck ─┬ verified      → Verify → done
                     ▲                     ├ closed        → done (rain closed it)
                     │                     ├ pending       → wait, Recheck again
                     ├──────── Escalate ◄──┼ escalate
                     └──────── Remind   ◄──┼ still_failing
                                           └ unresolved    → fail
```

- **NotifyVendor** emails the vendor through SES with the evidence and the deadline.
- **Recheck** runs at each deadline on the reading dated that day, with the same rule as the
  demo (`rules.recheck`): above 93% means verified; otherwise escalate (vendor deadline) or
  remind (DISCOM deadline). A missing reading is retried, then treated as not fixed.
- **Escalate** emails the DISCOM and gives it another 3-day deadline.
- **Verify** closes the case and composes the family's Hindi WhatsApp message (logged as
  `family_message`; sending it is the whatsapp service's job).

A "day" is `DAY_LENGTH_SECONDS`: 86400 normally, 60 when deployed with `demoMode=true`, so a
whole case runs in minutes. Without `SENDER_EMAIL` and a recipient, emails are logged
(`email_skipped`) instead of sent. Replaying the fixtures, cases escalate and verify on the
same days as in the engine.
