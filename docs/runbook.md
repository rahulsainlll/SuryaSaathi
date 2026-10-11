# Runbook: deploy SuryaSaathi and run a scenario

From a laptop to a full 30-day scenario on AWS: readings arrive over MQTT, the agent
diagnoses them on Amazon Bedrock, cases are filed, escalated and verified by Step
Functions, every decision lands in CloudWatch, and the DISCOM console shows it all.

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
| `-c consoleUrls=https://…,http://localhost:3001`     | `http://localhost:3001`     | Where the console runs: Cognito redirects and API CORS          |
| `-c cognitoDomainPrefix=…`                           | `suryasaathi-<account id>`  | Hosted sign-in domain prefix (unique per region)                |
| `-c tariffInr=…`                                     | `7`                         | ₹ per kWh for the console's money-lost figure                   |

The first deploy builds the container images (one per Python service) and takes roughly
15–20 minutes. It creates seven stacks: `SuryaSaathi-Data`, `-Ingest`, `-ExpectedOutput`,
`-Agents`, `-Whatsapp` (empty for now), `-Rollups` and `-Console`. Note the outputs,
especially `SuryaSaathi-Ingest.IotEndpointAddress`; section 8 uses the Console stack's.

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

## 8. Open the DISCOM console

The `SuryaSaathi-Console` stack holds a Cognito user pool (no self sign-up, an `admin`
group, a hosted sign-in page), a read-only HTTP API (`services/console-api`) behind a JWT
authorizer, and its outputs are the console's build settings. The `SuryaSaathi-Rollups`
function fills the summaries table the API reads: nightly at 06:00 IST, or every 5 minutes
up to the newest reading with `demoMode=true`.

A helper for reading stack outputs:

```bash
out() { aws cloudformation describe-stacks --stack-name "$1" \
  --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text; }
```

### Create the first admin user

Self sign-up is off: console users are created from the AWS CLI, by anyone whose AWS
credentials may administer the user pool. Use your own email: Cognito sends the temporary
password there.

```bash
POOL=$(out SuryaSaathi-Console UserPoolId)
EMAIL=you@example.com

aws cognito-idp admin-create-user --user-pool-id "$POOL" --username "$EMAIL" \
  --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
  --desired-delivery-mediums EMAIL
aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL" --username "$EMAIL" \
  --group-name admin
```

The first sign-in asks for a new password (12+ characters with upper and lower case and a
digit); you can add an authenticator app afterwards. For a shared demo account without an
inbox, add `--message-action SUPPRESS` to the first command and set the password directly:

```bash
aws cognito-idp admin-set-user-password --user-pool-id "$POOL" --username "$EMAIL" \
  --password 'Choose-a-long-one-2026' --permanent
```

Users outside the `admin` group can sign in but the API answers 403. To remove access:
`aws cognito-idp admin-remove-user-from-group … --group-name admin` (or
`admin-disable-user`).

### Fill the summaries

After a scenario has run (section 6), roll up straight away instead of waiting for the
schedule:

```bash
aws lambda invoke --function-name "$(out SuryaSaathi-Rollups RollupsFunctionName)" \
  --cli-binary-format raw-in-base64-out --payload '{"asOf":"latest"}' /dev/stdout
# {"asOf": "<newest reading date>", "systems": 5, "cases": …, "written": …, "deleted": 0}
```

`asOf` can also be a date (`"2026-10-20"`) to see the fleet as it was that day. Until the
first rollup the API answers 503.

### Run the console against the API

```bash
out SuryaSaathi-Console AmplifyEnvironmentVariables | tr ',' '\n' > apps/console/.env.local
pnpm dev --filter console     # http://localhost:3001
```

The console sends you to the hosted sign-in page and back to `/auth/callback`. Every page
then reads the API; the "Simulated data" badge stays on because the simulator's systems
are marked as simulated.

**Hosting on Amplify.** Create an Amplify Hosting app from the repository (app root
`apps/console`), then pass its URL to the stack so Cognito and CORS accept it, and give the
branch the build settings:

```bash
cd infra && pnpm cdk deploy SuryaSaathi-Console -c consoleUrls=https://main.d1234abcd.amplifyapp.com,http://localhost:3001
aws amplify update-branch --app-id d1234abcd --branch-name main \
  --environment-variables "$(out SuryaSaathi-Console AmplifyEnvironmentVariables)"
```

The first URL in `consoleUrls` becomes `NEXT_PUBLIC_COGNITO_REDIRECT_URI`. Pass the same
context flags on every later deploy (or put them in `infra/cdk.json`), or the defaults
come back.

## 9. Troubleshooting

| Symptom                                      | Likely cause and fix                                                                                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `device-sim` can't connect                   | Run `fetch-cert` again; keep `--client-id suryasaathi-sim` (the policy only allows that prefix); check `--endpoint` is the `-ats` data endpoint                                                                                                    |
| Readings in MQTT but not in DynamoDB         | CloudWatch log group of the ingest function: `reading_rejected` with `unknown_system` means the systems weren't registered (don't use `--no-register` on a fresh deploy); IoT rule errors go to the `RuleErrors` log group in `SuryaSaathi-Ingest` |
| Decisions all say `reasonSource: rules`      | Look for `agent_error` in the agent's logs: usually Bedrock model access isn't enabled in `bedrockRegion`, or the model ID is wrong. The rules still decide, so cases continue                                                                     |
| No Step Functions executions                 | The agent only opens cases on dust or fault days; check `agent_decision` lines for `open_case`                                                                                                                                                     |
| Executions stuck at Recheck → WaitForReading | The deadline day's reading hasn't arrived (simulator stopped or slower than one day per minute in demo mode)                                                                                                                                       |
| `MessageRejected` from SES                   | The account is in the SES sandbox: verify the recipients too, or leave the email flags off                                                                                                                                                         |
| Docker build fails with `exec format error`  | Building arm64 images on an x86 machine without emulation: add `-c lambdaArchitecture=x86_64`                                                                                                                                                      |
| Console: "redirect_mismatch" from Cognito    | The console's URL isn't in `consoleUrls`: redeploy `SuryaSaathi-Console` with it, and set `NEXT_PUBLIC_COGNITO_REDIRECT_URI` to `<url>/auth/callback`                                                                                              |
| Console: HTTP 403                            | The user isn't in the `admin` group (`admin-add-user-to-group`), then sign out and in again for a fresh token                                                                                                                                      |
| Console: HTTP 503                            | No rollup yet: invoke the rollups function as above                                                                                                                                                                                                |
| Console: figures lag the scenario            | Outside demo mode the rollup runs nightly, as of yesterday: invoke it with `{"asOf":"latest"}`                                                                                                                                                     |

## 10. Costs and clean-up

Everything is serverless and idle costs are close to zero. The main variable cost is Bedrock:
by default the agent calls the model only on days something happens (smog, dust, fault, a case
opened or closed), between one and four calls per system in the 30-day scenarios; routine days
and days with a case already open use the rule wording. Use `-c agentEnabled=false` for free rehearsals.

Remove everything (tables, logs, the IoT thing and certificate, the state machine, the
user pool and its users, the console API):

```bash
cd infra
pnpm cdk destroy --all
```

All data in these tables is simulated. The certificate secret is scheduled for deletion by
Secrets Manager; its name is generated, so you can redeploy straight away.
