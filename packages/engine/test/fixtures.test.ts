import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { runScenario, SCENARIOS } from "../src/index.js";

const require = createRequire(import.meta.url);
const read = (path: string) =>
  JSON.parse(readFileSync(require.resolve(`@suryasaathi/schemas/${path}`), "utf8"));

const ajv = new Ajv2020({
  strict: true,
  schemas: ["reading", "system", "case"].map((n) => read(`schemas/${n}.schema.json`)),
});
addFormats.default(ajv);
const valid = (name: string, data: unknown) =>
  ajv.validate(`https://suryasaathi.dev/schemas/${name}.schema.json`, data) || ajv.errorsText();

describe.each(SCENARIOS)("golden fixture $name", (def) => {
  const committed = read(`fixtures/${def.name}.json`);

  it("matches what the engine produces now (run `pnpm --filter @suryasaathi/engine fixtures`)", () => {
    expect(JSON.parse(JSON.stringify(runScenario(def)))).toEqual(committed);
  });

  it("covers 30 days of schema-valid readings and cases", () => {
    expect(committed.days).toHaveLength(30);
    for (const d of committed.days) expect(valid("reading", d.reading)).toBe(true);
    for (const c of committed.cases) expect(valid("case", c)).toBe(true);
  });
});

describe("scenario stories", () => {
  const fixture = (name: string) => runScenario(SCENARIOS.find((s) => s.name === name)!);

  it("smog-day never opens a case", () => {
    const f = fixture("smog-day");
    expect(f.cases).toEqual([]);
    expect(f.days.filter((d) => d.diagnosis === "smog").map((d) => d.day)).toEqual([6, 16, 24]);
  });

  it("dust is cleaned on time and verified", () => {
    expect(fixture("dust").cases[0]).toMatchObject({
      cause: "dust",
      resolvedBy: "vendor",
      status: "verified",
    });
  });

  it("fault is repaired on time and verified", () => {
    expect(fixture("fault").cases).toEqual([
      expect.objectContaining({ cause: "fault", resolvedBy: "vendor", status: "verified" }),
    ]);
  });

  it("rain closes the dust case", () => {
    expect(fixture("rain").cases[0]).toMatchObject({
      cause: "dust",
      resolvedBy: "rain",
      status: "verified",
    });
  });

  it("missed deadlines escalate both cases to the DISCOM", () => {
    const cases = fixture("vendor-misses-deadline").cases;
    expect(cases.map((c) => [c.cause, c.resolvedBy])).toEqual([
      ["dust", "discom"],
      ["fault", "discom"],
    ]);
    expect(cases.every((c) => c.escalatedAt)).toBe(true);
  });
});
