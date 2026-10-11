# live-api

The public, unauthenticated endpoint behind the website's **Live from AWS** page
(`/live` in `apps/web`): `GET /public/live` on the console's HTTP API.

It is the only route in this service, and it is deliberately narrow.

- **Simulated roofs only.** A system is included when its rollup summary row carries
  `simulated`, which is true exactly for the demo fleet the device simulator registers.
  Nothing else is ever returned.
- **No personal data.** No location, no consent record, no install date, no vendor
  identity. A test asserts those strings never appear in the response.
- **No scans.** The fleet row and the per-system rows come from the rollup summaries;
  readings and cases are read with key queries, at most `MAX_SYSTEMS` roofs' worth, so
  the cost does not grow with the fleet. A test replaces `scan` with a failing stub.
- **Cached.** The payload is rebuilt at most once every `CACHE_SECONDS` per container
  and the response carries `Cache-Control: public, max-age=15`, so a page left open, or
  a crowd of them, costs almost nothing.

The route is throttled at the API (burst 10, rate 5/s) and the function is capped with
reserved concurrency, so public traffic cannot run up a bill.

`503` until the rollups function has run at least once — there are no summaries to read
before then. The page shows its empty state.

```bash
uv run pytest services/live-api
```

Configuration: the table names from infra, plus `ALLOWED_ORIGIN` (defaults to `*`; this
is a credential-free public GET).
