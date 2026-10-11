# @suryasaathi/console-data

Data access for the DISCOM console (`apps/console`).

- `ConsoleData` (`src/types.ts`): every query the console makes. Responses follow
  `packages/schemas/schemas/console.schema.json`.
- **Mock adapter** (`createMockAdapter`, the default): generates a 48-system fleet with
  `@suryasaathi/engine` (six Delhi zones, six placeholder vendors with different on-time
  rates) and computes every view in the browser. No AWS needed.
- **API adapter** (`createApiAdapter`): the same queries against `services/console-api`
  behind API Gateway, with a Cognito token.
- `summarize.ts` holds the definitions behind every figure (open, past deadline,
  underperforming, energy lost, average fix time, cause attribution). `services/rollups`
  and `services/console-api` implement the same definitions in Python.

```bash
pnpm --filter @suryasaathi/console-data test
```
