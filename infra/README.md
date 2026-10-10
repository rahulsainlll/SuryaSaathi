# infra

AWS CDK v2 app (TypeScript) with one stack per service. The stacks are empty until each service
gets its resources.

| Stack | Service |
| --- | --- |
| `SuryaSaathi-Agents` | `services/agents` |
| `SuryaSaathi-Ingest` | `services/ingest` |
| `SuryaSaathi-ExpectedOutput` | `services/expected-output` |
| `SuryaSaathi-Whatsapp` | `services/whatsapp` |
| `SuryaSaathi-Rollups` | `services/rollups` |

```bash
pnpm --filter @suryasaathi/infra build   # cdk synth
pnpm --filter @suryasaathi/infra test
cd infra && pnpm cdk deploy --all        # needs AWS credentials and a bootstrapped account
```
