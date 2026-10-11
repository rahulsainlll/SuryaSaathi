# services/rollups

Nightly aggregation for the DISCOM console. An EventBridge rule in the `SuryaSaathi-Console`
stack runs `suryasaathi_rollups.handler.handler` every night. The job:

1. reads every system, then each system's readings for the window (30 days) **by key**:
   it never scans the readings table,
2. reads the cases table,
3. computes every console figure with `suryasaathi_core.console`, which implements the
   same definitions as `packages/console-data/src/summarize.ts`,
4. writes the summary items to the summaries table (layout in
   `suryasaathi_core/summaries.py`): fleet totals, and rows and daily totals by vendor,
   zone and system. Rows for systems, vendors or zones that are gone are deleted; day
   items are kept as history.

The rollup is as of yesterday (UTC). To rebuild a day, invoke it with `{"asOf": "2026-10-10"}`.

| Variable          | Default                 |
| ----------------- | ----------------------- |
| `SUMMARIES_TABLE` | `suryasaathi-summaries` |
| `TARIFF_INR`      | `7` (₹ per kWh)         |
| `WINDOW_DAYS`     | `30`                    |

The tests load the console-fleet fixture (`packages/schemas/fixtures/console/`) into moto
and check every figure equals what the TypeScript computes from the same fleet:

```bash
uv run pytest services/rollups
```
