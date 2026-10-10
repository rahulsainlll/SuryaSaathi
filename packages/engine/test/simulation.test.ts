import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
  breakInverter,
  caseRecord,
  createSimulation,
  deviceMessage,
  isFinished,
  lossInr,
  scheduleRain,
  scheduleSmog,
  setSource,
  setVendorFixesOnTime,
  step,
  type SimState,
} from "../src/index.js";

/** Steps until `day` is the last simulated day. */
function runTo(state: SimState, day: number): SimState {
  let s = state;
  while (s.day < day) s = step(s);
  return s;
}

/** Steps until a case is open. */
function runToCase(state: SimState): SimState {
  let s = state;
  while (!s.activeCase && !isFinished(s)) s = step(s);
  return s;
}

// The default scenario (seed 42) matches the prototype day for day:
// smog on day 6, a dust case filed on day 15, the scripted inverter fault on day 22.
const DUST_CASE_DAY = 15;

describe("smog", () => {
  it("is diagnosed and opens no case (scripted smog on day 6)", () => {
    const s = runTo(createSimulation(), 6);
    expect(s.days[6]!.diagnosis).toBe("smog");
    expect(s.activeCase).toBeNull();
    expect(s.log.at(-1)!.text).toMatch(/^Smog cut the sunlight/);
  });

  it("opens no case when the viewer adds smog", () => {
    let s = runTo(createSimulation(), 2);
    s = step(scheduleSmog(s));
    expect(s.days[3]!.diagnosis).toBe("smog");
    expect(s.days[3]!.expectedKwh).toBeLessThan(s.days[2]!.expectedKwh * 0.8);
    expect(s.activeCase).toBeNull();
  });
});

describe("dust", () => {
  it("opens a cleaning case when the gap widens over dry days", () => {
    const s = runToCase(createSimulation());
    expect(s.day).toBe(DUST_CASE_DAY);
    expect(s.days[DUST_CASE_DAY]!.diagnosis).toBe("dust");
    expect(s.activeCase).toMatchObject({
      id: "SS-0142",
      cause: "dust",
      status: "filed",
      openedDay: DUST_CASE_DAY,
      deadlineDay: DUST_CASE_DAY + 3,
    });
  });

  it("is closed by rain before the vendor visits", () => {
    let s = runToCase(createSimulation());
    s = step(scheduleRain(s));
    expect(s.activeCase).toBeNull();
    expect(s.closedCases.at(-1)).toMatchObject({
      cause: "dust",
      status: "verified",
      resolvedBy: "rain",
      verifiedDay: DUST_CASE_DAY + 1,
    });
    expect(s.familyMessages).toEqual([]);
  });
});

describe("fault", () => {
  it("opens a repair case the day the inverter breaks", () => {
    let s = runTo(createSimulation(), 2);
    s = step(breakInverter(s));
    expect(s.days[3]!.reading.faultCode).toBe("E-07");
    expect(s.days[3]!.diagnosis).toBe("fault");
    expect(s.activeCase).toMatchObject({ cause: "fault", status: "filed", openedDay: 3 });
  });

  it("opens a case for the scripted fault on day 22", () => {
    let s = runTo(createSimulation(), 21);
    expect(s.activeCase).toBeNull();
    s = step(s);
    expect(s.activeCase).toMatchObject({ id: "SS-0143", cause: "fault", openedDay: 22 });
  });
});

describe("case workflow", () => {
  it("escalates to the DISCOM when the vendor misses the 3-day deadline", () => {
    let s = runToCase(createSimulation());
    s = runTo(s, DUST_CASE_DAY + 2);
    expect(s.activeCase!.status).toBe("filed");
    s = step(s);
    expect(s.activeCase).toMatchObject({ status: "escalated", escalatedDay: DUST_CASE_DAY + 3 });
    expect(s.log.at(-1)).toMatchObject({ kind: "danger" });
    expect(s.log.at(-1)!.text).toMatch(/escalated to the DISCOM/);
  });

  it("verifies a DISCOM-forced fix from new readings and tells the family", () => {
    let s = runToCase(createSimulation());
    s = runTo(s, DUST_CASE_DAY + 5);
    expect(s.activeCase).toMatchObject({ status: "fixed", resolvedBy: "discom" });
    s = step(s);
    expect(s.activeCase).toBeNull();
    expect(s.closedCases.at(-1)).toMatchObject({ status: "verified", resolvedBy: "discom" });
    expect(s.days[s.day]!.performance).toBeGreaterThan(0.93);
    expect(s.familyMessages.at(-1)!.text).toContain("DISCOM");
    expect(s.familyMessages.at(-1)!.text).toContain("धूल");
  });

  it("never escalates when the vendor fixes on time", () => {
    let s = runToCase(setVendorFixesOnTime(createSimulation(), true));
    s = runTo(s, DUST_CASE_DAY + 2);
    expect(s.activeCase).toMatchObject({ status: "fixed", resolvedBy: "vendor" });
    s = step(s);
    expect(s.closedCases.at(-1)).toMatchObject({ status: "verified", resolvedBy: "vendor" });
    expect(s.closedCases.at(-1)!.escalatedDay).toBeUndefined();
    expect(s.familyMessages.at(-1)!.text).not.toContain("DISCOM");
  });

  it("repairs a fault and verifies it", () => {
    let s = runTo(createSimulation(), 2);
    s = step(breakInverter(setVendorFixesOnTime(s, true)));
    s = runTo(s, 6);
    expect(s.closedCases.at(-1)).toMatchObject({ cause: "fault", status: "verified" });
    expect(s.days[6]!.reading.faultCode).toBeUndefined();
    expect(s.familyMessages.at(-1)!.text).toContain("Inverter");
  });
});

describe("rain", () => {
  it("washes the panels on scripted rain days", () => {
    const s = runTo(createSimulation({ rainDays: [0, 9] }), 9);
    expect(s.days[8]!.soiling).toBeGreaterThan(0.05);
    expect(s.days[9]!.soiling).toBe(0);
    expect(s.days[9]!.rained).toBe(true);
  });
});

describe("simulation", () => {
  it("is deterministic", () => {
    const run = () => runTo(scheduleRain(runTo(createSimulation(), 10)), 29);
    expect(run()).toEqual(run());
  });

  it("does not mutate the state it is given", () => {
    const before = runTo(createSimulation(), 5);
    const snapshot = structuredClone(before);
    step(breakInverter(scheduleRain(before)));
    expect(before).toEqual(snapshot);
  });

  it("stops after the last day", () => {
    const s = runTo(createSimulation(), 29);
    expect(isFinished(s)).toBe(true);
    expect(step(s)).toBe(s);
  });

  it("counts the money lost to dust and faults", () => {
    const s = runTo(createSimulation(), 29);
    expect(lossInr(s)).toBeGreaterThan(0);
    expect(lossInr(s)).toBe(Math.round(s.lossKwh * 7));
  });
});

describe("schemas", () => {
  const require = createRequire(import.meta.url);
  const load = (name: string) =>
    JSON.parse(
      readFileSync(require.resolve(`@suryasaathi/schemas/schemas/${name}.schema.json`), "utf8"),
    );
  const ajv = new Ajv2020({
    strict: true,
    schemas: [load("reading"), load("system"), load("case")],
  });
  addFormats.default(ajv);
  const valid = (name: string, data: unknown) => {
    const ok = ajv.validate(`https://suryasaathi.dev/schemas/${name}.schema.json`, data);
    if (!ok) throw new Error(ajv.errorsText());
    return ok;
  };

  it("produces readings that match the reading schema", () => {
    let s = setSource(createSimulation(), "camera_clip");
    s = runTo(s, 29);
    for (const d of s.days) expect(valid("reading", d.reading)).toBe(true);
    expect(s.days[22]!.reading).toMatchObject({ source: "camera_clip", faultCode: "E-07" });
  });

  it("produces cases that match the case schema", () => {
    const s = runTo(createSimulation(), 29);
    expect(s.closedCases.length).toBe(2);
    for (const k of s.closedCases) expect(valid("case", caseRecord(s, k))).toBe(true);
  });
});

describe("device messages", () => {
  it("formats each source's message", () => {
    const s = runTo(createSimulation(), 22);
    expect(deviceMessage(s, 22, "data_logger")).toMatchObject({
      source: "data_logger",
      status: "FAULT",
      fault_code: "E-07",
    });
    expect(deviceMessage(s, 21, "inverter_cloud")).toMatchObject({
      inverter_state: "Generating",
      alarm: null,
    });
    expect(deviceMessage(s, 22, "camera_clip")).toMatchObject({
      image: "s3://suryasaathi-snaps/SS-DL-000123/2026-10-21.jpg",
      reading: { status: "FAULT E-07" },
    });
  });
});
