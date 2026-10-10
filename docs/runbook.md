# Runbook: deploy SuryaSaathi and run a scenario

From a laptop to a full 30-day scenario on AWS: readings arrive over MQTT, the agent
diagnoses them on Amazon Bedrock, cases are filed, escalated and verified by Step
Functions, and every decision lands in CloudWatch.

Everything here runs from the repository root unless a step says `cd infra`.

## 1. Prerequisites

| Tool                    | Check                                                |
| ----------------------- | ---------------------------------------------------- |
| Node.js 20+ and pnpm 9+ | `node -v && pnpm -v`                                 |
| Python 3.12+ and uv     | `uv --version`                                       |
| Docker (running)        | `docker info` — CDK builds the Lambda images locally |
| AWS CLI v2, signed in   | `aws sts get-caller-identity`                        |

Pick a region and use it for every command (the examples use Mumbai):

```bash
export AWS_REGION=ap-south-1          # or set AWS_PROFILE / AWS_DEFAULT_REGION
export CDK_DEFAULT_REGION=$AWS_REGION
```

**Amazon Bedrock model access.** The agent calls Claude Opus 5.5 (`anthropic.claude-opus-5-5`)
through Bedrock. In the Bedrock console for the region you will use, open _Model access_ and
enable it. If it isn't offered in your deployment region, deploy anyway and point the agent at
a region that has it with `-c bedrockRegion=us-east-1` in step 4. To run without the model,
add `-c agentEnabled=false`: the rules still decide everything and the reasons use the
demo's wording.

**Lambda architecture.** The images build for arm64 (Graviton) by default, which is native on
Apple silicon. On an Intel or AMD machine either let Docker Desktop emulate arm64 (slower
first build) or add `-c lambdaArchitecture=x86_64` in step 4.

## 2. Install

```bash
pnpm install
uv sync
```

## 3. Bootstrap CDK (once per account and region)

```bash
cd infra
pnpm cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/$AWS_REGION
```

## 4. Deploy

Demo mode makes one workflow "day" last a minute, so a vendor's 3-day deadline passes in
about three minutes:

```bash
cd infra
pnpm cdk deploy --all --require-approval never -c demoMode=true
```

Optional context flags (add any of them to the command above):

| Flag                                                 | Default                     | Effect                                                          |
| ---------------------------------------------------- | --------------------------- | --------------------------------------------------------------- |
| `-c demoMode=true`                                   | false                       | 60-second workflow days instead of 24 hours                     |
| `-c bedrockModelId=…`                                | `anthropic.claude-opus-5-5` | Model for the diagnosis agent                                   |
| `-c bedrockRegion=…`                                 | stack region                | Region the agent calls Bedrock in                               |
| `-c agentEnabled=false`                              | true                        | Rules only, no Bedrock calls                                    |
| `-c agentScope=all`                                  | `actions`                   | Ask the model on every reading, not only when something happens |
| `-c agentEffort=…`                                   | `low`                       | Claude effort level for the agent                               |
| `-c senderEmail=… -c vendorEmail=… -c discomEmail=…` | unset                       | Send case emails through SES (see below)                        |
| `-c vendorName=…`                                    | `[Vendor name] Solar`       | Vendor name in decisions and emails                             |
| `-c lambdaArchitecture=x86_64`                       | `arm64`                     | Lambda CPU architecture                                         |

The first deploy builds three container images and takes roughly 10–15 minutes. It creates
six stacks: `SuryaSaathi-Data`, `-Ingest`, `-ExpectedOutput`, `-Agents`, `-Whatsapp` and
`-Rollups` (the last two are empty for now). Note the outputs, especially
`SuryaSaathi-Ingest.IotEndpointAddress`.

**Emails (optional).** Without SES settings the workflow logs each email it would send
(`email_skipped`) and carries on. To send real emails from an SES sandbox account, verify the
sender and both recipients first, click the links AWS emails you, then redeploy with the three
flags:

```bash
for e in alerts@example.com vendor@example.com discom@example.com; do
  aws sesv2 create-email-identity --email-identity "$e"
done
```

## 5. Create the simulator's certificate locally

Deploying created an IoT thing (`suryasaathi-sim`, type `suryasaathi-simulator`), a policy
that may only publish to `suryasaathi/readings/*`, and an X.509 certificate whose PEM files
are in Secrets Manager. Save them (into `certs/`, which git ignores):

```bash
uv run tools/device-sim fetch-cert
# Saved certs/cert.pem and certs/private.key
# IoT endpoint: abc123example-ats.iot.ap-south-1.amazonaws.com
```

## 6. Run a full scenario

```bash
uv run tools/device-sim --systems 5 --days 30 --speed 60
```

This registers five simulated systems (`SS-SIM-0001`…`0005`) in the systems table, one per
golden scenario, then publishes one reading per system per simulated day: 30 days in 30
minutes. `--speed` is seconds per simulated day. With `demoMode=true`, keep it at 60 or lower
so each deadline day's reading has arrived when the workflow rechecks (a faster run such as
`--speed 20` works too; rechecks go by the reading's date). The endpoint is looked up
automatically; pass `--endpoint` to override it.

What to expect (minute ≈ simulated day at `--speed 60`):

| System        | Scenario               | What happens                                                                                                                                              |
| ------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SS-SIM-0001` | dust                   | Day 12: dust case filed, vendor emailed. Day 15: recheck finds output back up, case verified, family message composed                                     |
| `SS-SIM-0002` | smog-day               | Days 6, 16, 24: smog diagnosed, no case ever opened                                                                                                       |
| `SS-SIM-0003` | fault                  | Day 12: inverter fault case. Day 15: repair verified                                                                                                      |
| `SS-SIM-0004` | rain                   | Day 12: dust case. Day 13: overnight rain restores output, the agent closes the case; the workflow ends at `ClosedByRain`                                 |
| `SS-SIM-0005` | vendor-misses-deadline | Day 6: smog. Day 15: dust case. Day 18: deadline missed, escalated to the DISCOM. Day 21: verified. Day 22: fault case, escalated day 25, verified day 28 |

Cases opened in the last three days of the month (the dust scenarios refile on day 28–29)
have no deadline-day reading. Their workflows retry, then escalate and finally end as
`Unresolved`. That is expected: no reading is not a fix.

To try one story quickly: `uv run tools/device-sim --systems 1 --scenario fault --days 16 --speed 30`.
To print the messages without sending: add `--dry-run`.

## 7. Watch it in the AWS console

**IoT Core → MQTT test client.** Subscribe to `suryasaathi/readings/#`. One message per
system per simulated day, each a `reading.schema.json` document.

**DynamoDB → Explore items.**

- `suryasaathi-readings`: each reading gains `expectedKwh`, `performance`, `diagnosis`,
  `action`, `reason` and `reasonSource` (`agent` when Claude wrote it, `rules` otherwise)
  seconds after it arrives.
- `suryasaathi-cases`: one item per case (`SS-SIM-0003-20261011`…) with `status` moving
  `filed` → `escalated` → `verified`, `resolvedBy`, the deadlines, and `familyMessage`.
- `suryasaathi-expected`: the expected output used for each system and day (`source` is
  `fixture` for simulated systems, `live`/`partial`/`fallback` for real ones).

**Step Functions → `suryasaathi-case-workflow`.** One execution per case, named after it.
Open one and use _Graph view_: NotifyVendor → WaitForDeadline → Recheck, then Verify, or
Escalate → WaitForDeadline → Recheck → Verify. Each step's input and output is visible.

**CloudWatch → Logs Insights.** Choose a saved query:

- `SuryaSaathi/agent-decisions`: every decision with diagnosis, action, case and reason.
- `SuryaSaathi/case-events`: case filed, emails, rechecks, escalations, family messages.
- `SuryaSaathi/decisions-by-diagnosis`: counts by diagnosis, action and reason source.

Or follow the agent from a terminal (log group names are stack outputs):

```bash
aws logs tail "$(aws cloudformation describe-stacks --stack-name SuryaSaathi-Agents \
  --query "Stacks[0].Outputs[?OutputKey=='DiagnosisAgentLogGroup'].OutputValue" --output text)" \
  --follow --format short | grep agent_decision
```

A quick summary from the CLI:

```bash
aws dynamodb scan --table-name suryasaathi-cases \
  --projection-expression "caseId, #s, resolvedBy, familyMessage" \
  --expression-attribute-names '{"#s":"status"}' --output table
```

## 8. Troubleshooting

| Symptom                                      | Likely cause and fix                                                                                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `device-sim` can't connect                   | Run `fetch-cert` again; keep `--client-id suryasaathi-sim` (the policy only allows that prefix); check `--endpoint` is the `-ats` data endpoint                                                                                                    |
| Readings in MQTT but not in DynamoDB         | CloudWatch log group of the ingest function: `reading_rejected` with `unknown_system` means the systems weren't registered (don't use `--no-register` on a fresh deploy); IoT rule errors go to the `RuleErrors` log group in `SuryaSaathi-Ingest` |
| Decisions all say `reasonSource: rules`      | Look for `agent_error` in the agent's logs: usually Bedrock model access isn't enabled in `bedrockRegion`, or the model ID is wrong. The rules still decide, so cases continue                                                                     |
| No Step Functions executions                 | The agent only opens cases on dust or fault days; check `agent_decision` lines for `open_case`                                                                                                                                                     |
| Executions stuck at Recheck → WaitForReading | The deadline day's reading hasn't arrived (simulator stopped or slower than one day per minute in demo mode)                                                                                                                                       |
| `MessageRejected` from SES                   | The account is in the SES sandbox: verify the recipients too, or leave the email flags off                                                                                                                                                         |
| Docker build fails with `exec format error`  | Building arm64 images on an x86 machine without emulation: add `-c lambdaArchitecture=x86_64`                                                                                                                                                      |

## 9. Costs and clean-up

Everything is serverless and idle costs are close to zero. The main variable cost is Bedrock:
by default the agent calls the model only on days something happens (smog, dust, fault, a case
opened or closed), between one and four calls per system in the 30-day scenarios; routine days
and days with a case already open use the rule wording. Use `-c agentEnabled=false` for free rehearsals.

Remove everything (tables, logs, the IoT thing and certificate, the state machine):

```bash
cd infra
pnpm cdk destroy --all
```

All data in these tables is simulated. The certificate secret is scheduled for deletion by
Secrets Manager; its name is generated, so you can redeploy straight away.
