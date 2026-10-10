# @suryasaathi/engine

Deterministic simulation and diagnosis engine for one rooftop, ported from the browser
prototype in [`docs/reference/simulator.html`](../../docs/reference/simulator.html). Pure
TypeScript with no React or DOM: every function takes a state and returns a new one, and the
same seed and actions always give the same days, readings, cases and messages.

| Module | What it does |
| --- | --- |
| `rng.ts` | Mulberry32 seeded generator with explicit state |
| `world.ts` | Expected output from sunlight + haze, soiling, faults, rain |
| `diagnosis.ts` | The README's diagnosis rules (v1), on observable data only |
| `simulation.ts` | Daily step, the case workflow and viewer actions |
| `device.ts` | Raw messages from a data logger, inverter cloud or camera clip |

Case workflow, with a 3-day vendor deadline:

```
filed ──vendor fixes on time──▶ fixed ──performance > 93%──▶ verified
  │                               ▲
  └──deadline missed──▶ escalated ┘ (DISCOM gets the vendor out)
filed/escalated dust case ──rain restores > 93%──▶ verified (no visit)
```

```ts
import { createSimulation, step, scheduleRain, setVendorFixesOnTime } from "@suryasaathi/engine";

let sim = createSimulation(); // seed 42: smog on day 6, dust case on day 15, fault on day 22
sim = setVendorFixesOnTime(sim, true);
sim = step(sim);
sim.days[0].reading; // matches packages/schemas reading.schema.json
```

Readings match `reading.schema.json`, and `caseRecord()` turns a case into a
`case.schema.json` record. The tests check both against the schemas with Ajv.
