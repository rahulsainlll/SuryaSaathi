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

Pick an account, a profile and a region, and pin all three for every command — `cdk`, the
AWS CLI and `device-sim` alike. Team Mythos deploys to the `personal` profile
(account 010928189548) in `us-east-1`:

```bash
export AWS_PROFILE=personal
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=$AWS_REGION
export CDK_DEFAULT_REGION=$AWS_REGION
```

Keep these in a gitignored `.envrc` at the repository root (and in
`.claude/settings.local.json` under an `env` key, also gitignored, if you use Claude Code).
Both are gitignored. **Pin the profile explicitly**: `bin/infra.ts` takes the region from
`AWS_REGION`/`CDK_DEFAULT_REGION`, so a shell where `AWS_PROFILE` is unset silently falls back
to the _default_ profile's region and synthesizes the whole stack — including
`BEDROCK_REGION` — for the wrong region, with no error. Check it before deploying:

```bash
aws sts get-caller-identity          # must show the account you expect
```

**Organization SCPs.** If the account is a member of an AWS Organization, a Service Control
Policy can deny the services this stack needs, and no IAM grant or CDK flag can override it.
`cdk bootstrap` alone needs `cloudformation`, `ecr`, `ssm`, `s3` and `iam`; the stacks also
need `lambda`, `dynamodb`, `iot`, `states`, `secretsmanager`, `ses`, `sns`, `events`,
`apigateway`, `cognito-idp` and `bedrock`. A denial names the policy:

```
is not authorized to perform: cloudformation:ListStacks ... with an explicit deny in a
service control policy: arn:aws:organizations::<mgmt-account>:policy/o-…/service_control_policy/p-…
```

Only an administrator of the organization's **management** account can detach or amend it.
`aws organizations describe-organization` shows which account that is.

**Amazon Bedrock model access.** The agent calls Claude Haiku 4.5
(`us.anthropic.claude-haiku-4-5-20251001-v1:0`) through Bedrock. Haiku is the default because
the diagnosis call is small and well scoped (one to four calls per system across a 30-day
run), so a larger model costs more without deciding anything differently; pass
`-c bedrockModelId=…` to use one. In the Bedrock console for the region you will use, open
_Model access_ and enable it. If the model isn't offered in your deployment region, deploy
anyway and point the agent elsewhere with `-c bedrockRegion=us-east-1`. To run without the
model at all, add `-c agentEnabled=false`: the rules still decide everything and the reasons
use the demo's wording.

**The model ID must be a cross-region inference profile** — the `us.`-prefixed form. Claude
4.5 and newer are offered only as `INFERENCE_PROFILE`, so the bare foundation-model ID that
`aws bedrock list-foundation-models` prints is rejected. List the valid ones with:

```bash
aws bedrock list-inference-profiles --query "inferenceProfileSummaries[].inferenceProfileId"
```

Two gates catch new accounts, and both report themselves badly:

- `AccessDeniedException: Your account is currently being verified` — AWS hasn't finished
  verifying the account. Usually under two hours.
- `ResourceNotFoundException: Model use case details have not been submitted for this
account` — despite saying "not found", this means the **Anthropic use case details form**
  hasn't been filled in. Do it in the Bedrock console under _Model access_ → the Anthropic
  models; it's free and takes a minute, then allow ~15 minutes.

The control plane answers throughout, so `list-foundation-models` succeeds while every
invocation fails. Test invocation itself before blaming the code:

```bash
aws bedrock-runtime converse --model-id us.anthropic.claude-haiku-4-5-20251001-v1:0 \
  --messages '[{"role":"user","content":[{"text":"say ok"}]}]' \
  --inference-config '{"maxTokens":10}' --query 'output.message.content[0].text' --output text
```

Either way the deploy is safe: the agent falls back to its rules and `reasonSource` stays
`rules`. See `agent_error` in section 10.

**Using the Anthropic API instead of Bedrock.** `-c modelProvider=anthropic` points the agent
at `api.anthropic.com` rather than Bedrock. Everything else is unchanged: the same Strands
agent, the same tools, the same rules. Two reasons to want it — Bedrock model access is
blocked or pending, or you have Anthropic credits and would rather not bill tokens to the AWS
account.

The key is **never** passed through CDK context, environment variables or the template:
`-c` values land in the synthesized CloudFormation and are readable by anyone with describe
rights on the stack. Put it in Secrets Manager yourself, before deploying, and the Lambda
reads it at runtime:

```bash
aws secretsmanager create-secret --name suryasaathi/anthropic-api-key \
  --description "Anthropic API key for the SuryaSaathi diagnosis agent" \
  --secret-string "$(read -rsp 'Anthropic API key: ' k && echo "$k")"
```

`read -rs` keeps the key off the screen and out of your shell history. To rotate it later use
`put-secret-value` with the same `--secret-id`; the agent picks it up on its next cold start,
with no redeploy. The deploy grants the agent `secretsmanager:GetSecretValue` on that one
secret and nothing else, and only when `modelProvider=anthropic`.

A JSON secret works too, if you created it in the console as a key/value pair — the agent
accepts `{"apiKey": "sk-ant-…"}` as well as the bare string.

Note for write-ups: with `modelProvider=anthropic` the deployed agent does **not** call
Amazon Bedrock. Bedrock remains the default and is fully wired; switching back is one flag
and no code change.

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

| Flag                                                 | Default                                       | Effect                                                          |
| ---------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| `-c demoMode=true`                                   | false                                         | 60-second workflow days instead of 24 hours                     |
| `-c bedrockModelId=…`                                | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Model for the diagnosis agent (inference profile)               |
| `-c bedrockRegion=…`                                 | stack region                                  | Region the agent calls Bedrock in                               |
| `-c modelProvider=anthropic`                         | `bedrock`                                     | Call the Anthropic API instead of Bedrock (see below)           |
| `-c anthropicModelId=…`                              | `claude-haiku-4-5`                            | Model when `modelProvider=anthropic`                            |
| `-c anthropicSecretName=…`                           | `suryasaathi/anthropic-api-key`               | Secrets Manager secret holding the Anthropic key                |
| `-c agentEnabled=false`                              | true                                          | Rules only, no Bedrock calls                                    |
| `-c agentScope=all`                                  | `actions`                                     | Ask the model on every reading, not only when something happens |
| `-c agentEffort=…`                                   | `low`                                         | Kept for compatibility; not applied on the Converse path        |
| `-c senderEmail=… -c vendorEmail=… -c discomEmail=…` | unset                                         | Send case emails through SES (see below)                        |
| `-c vendorName=…`                                    | `[Vendor name] Solar`                         | Vendor name in decisions and emails                             |
| `-c lambdaArchitecture=x86_64`                       | `arm64`                                       | Lambda CPU architecture                                         |
| `-c consoleUrls=https://…,http://localhost:3001`     | `http://localhost:3001`                       | Where the console runs: Cognito redirects and API CORS          |
| `-c cognitoDomainPrefix=…`                           | `suryasaathi-<account id>`                    | Hosted sign-in domain prefix (unique per region)                |
| `-c tariffInr=…`                                     | `7`                                           | ₹ per kWh for the console's money-lost figure                   |
| `-c logRetentionDays=…`                              | `3`                                           | Days CloudWatch keeps logs                                      |

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

## 9. Host the website and the console on AWS Amplify

Both Next.js apps deploy to Amplify Hosting from this repository, as two Amplify apps:

| Amplify app | Root directory | What it serves                            |
| ----------- | -------------- | ----------------------------------------- |
| Website     | `apps/web`     | The marketing site, live demo and blog    |
| Console     | `apps/console` | The DISCOM console (section 8 wires auth) |

`amplify.yml` at the root has a build for each: it installs pnpm, switches to the hoisted
`node_modules` layout Amplify requires for pnpm workspaces (only inside the build), builds the
workspace packages the app uses, then the app. Neither needs the CDK stacks to build: the
website is simulated in the browser, and the console uses its mock data until it is pointed at
the console API.

For each app:

1. **Connect the repository.** In the Amplify console choose _Create new app_ → GitHub,
   authorise the Amplify GitHub App for `rahulsainlll/SuryaSaathi`, and pick the branch.
2. **Mark it as a monorepo.** Tick _My app is a monorepo_ and enter the root directory from the
   table. Amplify reads `amplify.yml` and sets `AMPLIFY_MONOREPO_APP_ROOT` to it; check it under
   _Hosting → Environment variables_ (it must equal that app's `appRoot`).
3. **Leave the detected settings.** Amplify detects Next.js and hosts it with server-side
   rendering (`WEB_COMPUTE`).
4. **Environment variables.**
   - Website (optional): `SITE_URL=https://main.<app-id>.amplifyapp.com` (or your domain), for
     absolute Open Graph links.
   - Console: nothing for the mock data. To use the deployed API, add the
     `AmplifyEnvironmentVariables` from the Console stack (section 8), and redeploy
     `SuryaSaathi-Console` with `-c consoleUrls=https://main.<console-app-id>.amplifyapp.com` so
     Cognito and CORS accept the hosted URL.
5. **Save and deploy.** Each push to the branch rebuilds both apps. Add custom domains under
   _Hosting → Custom domains_.

From the CLI, once an app is connected:

```bash
APP_ID=$(aws amplify list-apps --query "apps[?name=='SuryaSaathi-console'].appId" --output text)
aws amplify update-app --app-id "$APP_ID" \
  --environment-variables AMPLIFY_MONOREPO_APP_ROOT=apps/console
aws amplify start-job --app-id "$APP_ID" --branch-name main --job-type RELEASE
```

**If a build fails:** `ERR_PNPM_OUTDATED_LOCKFILE` means `pnpm-lock.yaml` wasn't committed with
a dependency change (run `pnpm install` and commit it); a missing module at build time usually
means `AMPLIFY_MONOREPO_APP_ROOT` doesn't match the app's `appRoot`.

**Thumbnails.** The film card on the home page, the README's film thumbnail and the first blog
post's cover are rendered at 1280×720 from `docs/assets/thumbnails.html` (`#film-clean`,
`#film` and `#blog`).

**The film on the home page.** With the film at `apps/web/public/film.mp4`, pressing play on
the film card plays it right there, in a plain video player (no YouTube). Prepare the file with
`pnpm --filter web film:encode path/to/film.mov` (needs ffmpeg) and commit it. Until it's
there, pressing play embeds the YouTube film in the card, on the page.

## 9b. The public "Live from AWS" page

`/live` on the website reads the deployed backend directly, so visitors see real agent
decisions rather than a recording. It is served by `GET /public/live` on the console's
HTTP API — unauthenticated, but narrow: simulated roofs only, no personal data, no table
scans, a 15-second cache, throttled at 5 requests a second (burst 10) and capped at 2
concurrent executions. `services/live-api/README.md` has the details.

Deploy it with the Console stack, telling it where the website runs so CORS accepts it:

```bash
cd infra
pnpm cdk deploy SuryaSaathi-Console -c demoMode=true \
  -c siteUrls=https://main.danjquy1xcblp.amplifyapp.com,http://localhost:3000
```

Then point the website at the endpoint. The URL is a stack output:

```bash
out SuryaSaathi-Console NEXTPUBLICLIVEAPI
# https://<api-id>.execute-api.us-east-1.amazonaws.com/public/live
```

**On Amplify**, set one environment variable on the _website_ app (not the console's):

| Key                    | Value                                |
| ---------------------- | ------------------------------------ |
| `NEXT_PUBLIC_LIVE_API` | the `NEXTPUBLICLIVEAPI` output above |

```bash
WEB_APP=$(aws amplify list-apps --query "apps[?name=='SuryaSaathi-web'].appId" --output text)
aws amplify update-branch --app-id "$WEB_APP" --branch-name main \
  --environment-variables "$(out SuryaSaathi-Console WebsiteEnvironmentVariables)"
aws amplify start-job --app-id "$WEB_APP" --branch-name main --job-type RELEASE
```

It is read at build time, so the branch has to be rebuilt after setting it. Locally, put
the same line in `apps/web/.env.local`.

Without the variable the page renders its offline state and says so; the rest of the site
is unaffected. With the variable but before the first rollup the endpoint answers 503 and
the page shows its empty state — run the rollups function (section 8) to fill it.

## 9c. The demo sign-in on /login

`/login` on the website is a real Amazon Cognito sign-in against the user pool the Console
stack already deploys. Two tabs, DISCOM admin and Vendor, each pre-filled with a demo
account so a visitor can sign in without one of their own. "Continue as guest" goes to the
same destination without signing in.

It uses a **second app client**, `suryasaathi-web-demo`, not the console's. The console's
client guards the console API with authorization-code + PKCE and must not gain
`ALLOW_USER_PASSWORD_AUTH`; a test in `infra/test/stacks.test.ts` asserts it never does.

The browser posts `InitiateAuth` directly — a public client has no secret, so there is
nothing to sign and no Amplify Auth library to ship:

```bash
curl -s -X POST "https://cognito-idp.us-east-1.amazonaws.com/" \
  -H "Content-Type: application/x-amz-json-1.1" \
  -H "X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth" \
  -d '{"AuthFlow":"USER_PASSWORD_AUTH","ClientId":"<client id>",
       "AuthParameters":{"USERNAME":"discom@demo.suryasaathi","PASSWORD":"<password>"}}'
```

### Create the demo users

The pool requires **12+ characters** with upper, lower and a digit, so a shorter demo
password is rejected by `admin-set-user-password`. `--message-action SUPPRESS` stops
Cognito emailing a temporary password to a domain that does not exist, and `--permanent`
skips the force-change-password challenge, which plain `InitiateAuth` cannot answer.

```bash
POOL=$(out SuryaSaathi-Console UserPoolId)

for U in discom@demo.suryasaathi vendor@demo.suryasaathi; do
  aws cognito-idp admin-create-user --user-pool-id "$POOL" --username "$U" \
    --user-attributes Name=email,Value="$U" Name=email_verified,Value=true \
    --message-action SUPPRESS
  aws cognito-idp admin-set-user-password --user-pool-id "$POOL" --username "$U" \
    --password 'Demo@12345678' --permanent
done

# Only the DISCOM demo user may read the console API.
aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL" \
  --username discom@demo.suryasaathi --group-name admin
```

### What the website needs

| Key                             | Where it comes from                                    |
| ------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | `out SuryaSaathi-Console NEXTPUBLICCOGNITOWEBCLIENTID` |
| `NEXT_PUBLIC_COGNITO_REGION`    | the deployment region, `us-east-1`                     |

`out SuryaSaathi-Console WebsiteEnvironmentVariables` prints these together with
`NEXT_PUBLIC_LIVE_API`, ready for `aws amplify update-branch --environment-variables`.
Without the client ID the form says so rather than failing silently.

## 10. Troubleshooting

| Symptom                                             | Likely cause and fix                                                                                                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `explicit deny in a service control policy`         | An Organization SCP blocks the service; see section 1. Only the management account can lift it — `aws organizations describe-organization` names it. No IAM or CDK change helps                                                                    |
| `tsx: command not found` from `cdk`                 | Dependencies aren't installed: run `pnpm install` at the repository root first                                                                                                                                                                     |
| Stack synthesized for the wrong region              | `AWS_PROFILE` was unset, so the default profile's region won. Export all four variables from section 1 and re-check with `aws sts get-caller-identity`                                                                                             |
| Bedrock: `Your account is currently being verified` | A new AWS account cannot invoke models yet; it usually clears within two hours. Deploy anyway — the rules decide and `reasonSource` stays `rules`                                                                                                  |
| `device-sim` can't connect                          | Run `fetch-cert` again; keep `--client-id suryasaathi-sim` (the policy only allows that prefix); check `--endpoint` is the `-ats` data endpoint                                                                                                    |
| Readings in MQTT but not in DynamoDB                | CloudWatch log group of the ingest function: `reading_rejected` with `unknown_system` means the systems weren't registered (don't use `--no-register` on a fresh deploy); IoT rule errors go to the `RuleErrors` log group in `SuryaSaathi-Ingest` |
| Decisions all say `reasonSource: rules`             | Look for `agent_error` in the agent's logs: usually Bedrock model access isn't enabled in `bedrockRegion`, or the model ID is wrong. The rules still decide, so cases continue                                                                     |
| No Step Functions executions                        | The agent only opens cases on dust or fault days; check `agent_decision` lines for `open_case`                                                                                                                                                     |
| Executions stuck at Recheck → WaitForReading        | The deadline day's reading hasn't arrived (simulator stopped or slower than one day per minute in demo mode)                                                                                                                                       |
| `MessageRejected` from SES                          | The account is in the SES sandbox: verify the recipients too, or leave the email flags off                                                                                                                                                         |
| Docker build fails with `exec format error`         | Building arm64 images on an x86 machine without emulation: add `-c lambdaArchitecture=x86_64`                                                                                                                                                      |
| Console: "redirect_mismatch" from Cognito           | The console's URL isn't in `consoleUrls`: redeploy `SuryaSaathi-Console` with it, and set `NEXT_PUBLIC_COGNITO_REDIRECT_URI` to `<url>/auth/callback`                                                                                              |
| Console: HTTP 403                                   | The user isn't in the `admin` group (`admin-add-user-to-group`), then sign out and in again for a fresh token                                                                                                                                      |
| Console: HTTP 503                                   | No rollup yet: invoke the rollups function as above                                                                                                                                                                                                |
| Console: figures lag the scenario                   | Outside demo mode the rollup runs nightly, as of yesterday: invoke it with `{"asOf":"latest"}`                                                                                                                                                     |

## 11. Costs

Everything is serverless and billed per request. Nothing in the app bills by the hour or
keeps capacity warm: there is no VPC, NAT gateway, VPC endpoint, EC2, ECS, OpenSearch, RDS,
load balancer or customer-managed KMS key, no provisioned or reserved Lambda concurrency, and
every table is on-demand. `infra/test/stacks.test.ts` asserts all of that, so a future change
that adds an idle charge fails the build.

What does cost something, in rough order:

| Charge                                                                  | When                      | Notes                                                                                                                                  |
| ----------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Claude tokens                                                           | Per agent call            | The only meaningful variable cost; see `agentScope` and `agentEnabled`. With `modelProvider=anthropic` they bill to Anthropic, not AWS |
| Secrets Manager                                                         | **$0.40/month, prorated** | One secret, the simulator's certificate. The only true idle charge                                                                     |
| ECR storage                                                             | $0.10/GB-month            | The Lambda container images; roughly 1–2 GB after layer sharing                                                                        |
| S3 (CDK assets)                                                         | $0.023/GB-month           | Template and asset staging, a few hundred MB                                                                                           |
| Lambda, DynamoDB, IoT, Step Functions, API Gateway, Cognito, CloudWatch | Per request               | Comfortably inside the always-free tier at demo volumes                                                                                |

Keep the agent proportionate: at the default `agentScope=actions` it calls the model only on
days something happens (smog, dust, fault, a case opened or closed) — between one and four
calls per system across a 30-day scenario. `agentScope=all` calls it on every reading, which
is 30× the tokens. `-c agentEnabled=false` makes rehearsals free.

Log retention defaults to **3 days** (`-c logRetentionDays=`), because log storage is the one
charge that keeps growing after the demo is over.

The expensive mistake is not the deploy, it's **leaving it up**. With `demoMode=true` the
rollups rule fires every 5 minutes forever. Run the teardown below once you have the video.

## 12. Teardown

One command. It destroys the seven stacks, then the CDK bootstrap itself — the `CDKToolkit`
stack, its versioned asset bucket, the container-image repository — and finally the log
groups CloudFormation leaves behind (the ones CDK's custom-resource Lambdas create are not
owned by any stack, so `destroy` never removes them).

```bash
pnpm teardown
```

It prints what it will delete and asks once before doing anything. `pnpm teardown --yes`
skips the prompt; `pnpm teardown --keep-bootstrap` removes the application but leaves
`CDKToolkit` in place so the next deploy doesn't have to bootstrap again.

The script is `tools/teardown.sh`. It refuses to run unless `aws sts get-caller-identity`
matches the account in `AWS_PROFILE`, so it cannot empty the wrong account's bucket.

To check nothing is left:

```bash
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?starts_with(StackName,'SuryaSaathi') || StackName=='CDKToolkit'].StackName"
aws logs describe-log-groups --query "logGroups[?contains(logGroupName,'uryaaathi') || contains(logGroupName,'SuryaSaathi')].logGroupName"
```

All data in these tables is simulated. The certificate secret is scheduled for deletion by
Secrets Manager rather than removed at once; its name is generated, so you can redeploy
straight away. `tools/teardown.sh` forces it (`--force-delete-without-recovery`) so it stops
costing the $0.40/month immediately.
