# services/console-api

Read-only API for the DISCOM console (`apps/console` with `NEXT_PUBLIC_CONSOLE_DATA=api`).
The `SuryaSaathi-Console` stack puts `suryasaathi_console_api.handler.handler` behind an
API Gateway HTTP API whose JWT authorizer accepts the console's Cognito access tokens; the
handler also requires membership of the `admin` group (`ADMIN_GROUP`).

| Route                       | Response       | Read from                                       |
| --------------------------- | -------------- | ----------------------------------------------- |
| `GET /overview`             | `Overview`     | summaries (`FLEET`)                             |
| `GET /vendors`              | `VendorList`   | summaries (`VENDOR`)                            |
| `GET /vendors/{vendorId}`   | `VendorDetail` | summaries, cases table                          |
| `GET /cases`                | `CaseList`     | cases table (`?status=&cause=&vendorId=&zone=`) |
| `GET /cases/{caseId}`       | `CaseDetail`   | cases table, that system's readings by key      |
| `GET /systems`              | `SystemList`   | summaries (`SYSTEM`, `?q=`)                     |
| `GET /systems/{systemId}`   | `SystemDetail` | summaries, its cases and readings by key        |
| `GET /breakdown`            | `Breakdown`    | summaries (`FLEET`, `ZONE`)                     |
| `GET /search`               | `SearchIndex`  | summaries, cases table                          |

Responses are the shapes in `packages/schemas/schemas/console.schema.json`, as of the last
rollup (`asOf`). Before the first rollup every route answers 503. The fleet-wide figures
never touch the readings table; detail pages read one system's readings by key.

The tests load the console-fleet fixture into moto, run the rollup, call every route and
check each answer validates against the schema and equals what the TypeScript mock adapter
returns for the same fleet:

```bash
uv run pytest services/console-api
```
