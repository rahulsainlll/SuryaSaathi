// Writes each scenario as a golden fixture to packages/schemas/fixtures/<name>.json.
// Run with `pnpm --filter @suryasaathi/engine fixtures` after changing the engine.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runScenario, SCENARIOS } from "../dist/index.js";

const outDir = fileURLToPath(new URL("../../schemas/fixtures/", import.meta.url));
await mkdir(outDir, { recursive: true });
for (const def of SCENARIOS) {
  const fixture = runScenario(def);
  await writeFile(`${outDir}${def.name}.json`, JSON.stringify(fixture, null, 2) + "\n");
  const cases = fixture.cases.map((c) => `${c.caseId} ${c.cause} ${c.status}`).join(", ");
  console.log(`${def.name}: ${fixture.days.length} days; cases: ${cases || "none"}`);
}
