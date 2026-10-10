# @suryasaathi/schemas

Shared JSON schemas (draft 2020-12) for the core records, and TypeScript types generated from them.

| Schema | Describes |
| --- | --- |
| `schemas/reading.schema.json` | One day's generation for one system |
| `schemas/system.schema.json` | A monitored rooftop system, its vendor, DISCOM and consent |
| `schemas/case.schema.json` | A free-maintenance claim and its lifecycle |

Edit the JSON schemas, then regenerate the types in `src/generated/` (also run by `pnpm build`):

```bash
pnpm --filter @suryasaathi/schemas generate
```

```ts
import type { Reading, System, Case } from "@suryasaathi/schemas";
```

Python services can load the same files from `packages/schemas/schemas/`.
