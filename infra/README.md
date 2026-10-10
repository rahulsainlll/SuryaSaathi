# infra

AWS CDK v2 app (TypeScript). Every Python service runs as a Lambda container image built
from `services/Dockerfile` (arm64 by default), so deploying needs Docker running.

| Stack | What it creates |
| --- | --- |
| `SuryaSaathi-Data` | DynamoDB tables: systems, readings (stream → agent), cases (`bySystem` index), expected |
| `SuryaSaathi-Ingest` | IoT thing type, thing, policy and certificate for the simulator; topic rule `suryasaathi/readings/+` → ingest Lambda; IoT endpoint output |
| `SuryaSaathi-ExpectedOutput` | Expected-output Lambda (pvlib), invoked by the agent and nightly by EventBridge |
| `SuryaSaathi-Agents` | Diagnosis agent (Strands on Bedrock) on the readings stream; the per-case Step Functions workflow; Logs Insights queries |
| `SuryaSaathi-Whatsapp`, `SuryaSaathi-Rollups` | Empty for now |

```bash
pnpm --filter @suryasaathi/infra build   # cdk synth (no Docker needed to synthesize)
pnpm --filter @suryasaathi/infra test
cd infra && pnpm cdk deploy --all -c demoMode=true
```

Settings are CDK context flags (`demoMode`, `bedrockModelId`, `bedrockRegion`, `agentEnabled`,
`agentScope`, `agentEffort`, `senderEmail`, `vendorEmail`, `discomEmail`, `vendorName`,
`lambdaArchitecture`). See [`docs/runbook.md`](../docs/runbook.md) for the full deployment and
demo walkthrough.
