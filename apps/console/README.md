# apps/console

The DISCOM admin console (Next.js App Router, HeroUI v3 with the shared theme from
`packages/ui`, Liveline charts, a cmdk command palette).

| Page | What it shows |
| --- | --- |
| `/` Overview | Systems watched, underperforming, open and past-deadline cases, energy and ₹ lost, fleet performance over time |
| `/vendors` | Sortable leaderboard (systems, % underperforming, open cases, past deadline, average fix time) with an Escalate notice for vendors with overdue cases; `/vendors/[id]` for one vendor |
| `/cases` | The escalation queue, then every case with status, cause, vendor and zone filters; `/cases/[id]` has the timeline, expected-vs-actual chart, readings and the agent's reason for each decision |
| `/systems` | Search by ID, DSAIN, vendor or zone; `/systems/[id]` has the details, consent, readings and cases |
| `/breakdown` | Energy lost by cause (dust, fault, other) and the by-zone view |

Press ⌘K (Ctrl+K) anywhere to jump to a system, vendor or case. A "Simulated data" badge
appears wherever the figures come from simulated systems.

## Data

The console reads everything through `@suryasaathi/console-data`:

- `NEXT_PUBLIC_CONSOLE_DATA=mock` (default): a 48-system fleet generated in the browser from
  `@suryasaathi/engine`. No AWS needed.
- `NEXT_PUBLIC_CONSOLE_DATA=api`: the deployed console API (`services/console-api`). Set the
  Console stack outputs as `NEXT_PUBLIC_CONSOLE_API_URL`, `NEXT_PUBLIC_COGNITO_DOMAIN`,
  `NEXT_PUBLIC_COGNITO_CLIENT_ID` and `NEXT_PUBLIC_COGNITO_REDIRECT_URI` (the runbook's
  section 10 writes them to `.env.local`).

In API mode the console signs in with Cognito's hosted page (authorization code with PKCE,
`lib/auth.ts`); Cognito returns to `/auth/callback`. Tokens are kept in `sessionStorage`
for the tab, and only users in the `admin` group can read the API.

```bash
pnpm dev --filter console   # http://localhost:3001
```
