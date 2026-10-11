// Writes the console-fleet fixture to packages/schemas/fixtures/console/.
// Run with `pnpm --filter @suryasaathi/console-data fixtures` after changing the summaries.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { consoleFixture } from "../dist/index.js";

const outDir = fileURLToPath(new URL("../../schemas/fixtures/console/", import.meta.url));
await mkdir(outDir, { recursive: true });
const { fleet, expected } = consoleFixture();
await writeFile(`${outDir}fleet.json`, JSON.stringify(fleet, null, 2) + "\n");
await writeFile(`${outDir}expected.json`, JSON.stringify(expected, null, 2) + "\n");
console.log(
  `console fixture: ${fleet.systems.length} systems, ${fleet.cases.length} cases, as of ${fleet.asOf}`,
);
