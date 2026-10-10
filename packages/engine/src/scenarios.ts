import type { Case, Reading } from "@suryasaathi/schemas";
import { defaultConfig, type SimConfig } from "./config.js";
import type { Diagnosis } from "./diagnosis.js";
import {
  breakInverter,
  caseRecord,
  createSimulation,
  scheduleRain,
  scheduleSmog,
  setVendorFixesOnTime,
  step,
  type LogKind,
  type SimState,
} from "./simulation.js";

export type ScenarioAction = "rain" | "smog" | "breakInverter";

/** A reproducible 30-day story: config overrides, the vendor's behaviour and viewer actions. */
export interface ScenarioDefinition {
  name: string;
  description: string;
  config: Partial<SimConfig>;
  vendorFixesOnTime: boolean;
  /** Viewer actions, taken after the reading for `afterDay` (-1: before the first day). */
  actions: { afterDay: number; action: ScenarioAction }[];
}

/** Rain every nine days keeps dust below the dust rule, isolating smog and faults. */
const REGULAR_RAIN = [0, 9, 18, 27];

export const SCENARIOS: ScenarioDefinition[] = [
  {
    name: "dust",
    description:
      "Dry month: dust builds until the agent files a cleaning case; the vendor cleans on time and the fix is verified.",
    config: { script: {}, rainDays: [0] },
    vendorFixesOnTime: true,
    actions: [],
  },
  {
    name: "smog-day",
    description:
      "Three smog days cut expected output; regular rain keeps the panels clean. No case is ever opened.",
    config: { script: { 6: "smog", 16: "smog", 24: "smog" }, rainDays: REGULAR_RAIN },
    vendorFixesOnTime: true,
    actions: [],
  },
  {
    name: "fault",
    description:
      "The inverter faults on day 12; the agent files a repair case, the vendor repairs on time and the fix is verified.",
    config: { script: { 12: "fault" }, rainDays: REGULAR_RAIN },
    vendorFixesOnTime: true,
    actions: [],
  },
  {
    name: "rain",
    description:
      "A dust case is filed on day 12; rain that night cleans the panels and the case closes the next day without a visit.",
    config: { script: {}, rainDays: [0] },
    vendorFixesOnTime: false,
    actions: [{ afterDay: 12, action: "rain" }],
  },
  {
    name: "vendor-misses-deadline",
    description:
      "The prototype's month: smog on day 6, a dust case and an inverter fault, both escalated to the DISCOM when the vendor misses the 3-day deadline.",
    config: {},
    vendorFixesOnTime: false,
    actions: [],
  },
];

/** One simulated day as a golden fixture records it. */
export interface FixtureDay {
  day: number;
  date: string;
  /** The reading as a device sends it (reading.schema.json). */
  reading: Reading;
  /** Unrounded output, kWh; reading.energyKwh is this to 2 decimals. */
  actualKwh: number;
  expectedKwh: number;
  clearSkyKwh: number;
  rained: boolean;
  vendorFixesOnTime: boolean;
  /** What the detection rules said, or null when a case was already open. */
  diagnosis: Diagnosis | null;
  /** The open case after the agents' turn, or the case they closed that day. */
  case: {
    id: string;
    cause: Case["cause"];
    status: Case["status"];
    resolvedBy?: Case["resolvedBy"];
  } | null;
}

export interface GoldenFixture {
  scenario: string;
  description: string;
  config: SimConfig;
  vendorFixesOnTime: boolean;
  actions: ScenarioDefinition["actions"];
  days: FixtureDay[];
  /** Every case opened during the month (case.schema.json). */
  cases: Case[];
  decisions: { day: number; date: string; kind: LogKind; text: string }[];
}

/** Runs a scenario day by day and records it as a golden fixture. */
export function runScenario(def: ScenarioDefinition): GoldenFixture {
  let s: SimState = setVendorFixesOnTime(createSimulation(def.config), def.vendorFixesOnTime);
  const days: FixtureDay[] = [];
  const act = (afterDay: number) => {
    for (const a of def.actions.filter((x) => x.afterDay === afterDay)) {
      s =
        a.action === "rain"
          ? scheduleRain(s)
          : a.action === "smog"
            ? scheduleSmog(s)
            : breakInverter(s);
    }
  };

  act(-1);
  for (let d = 0; d < s.config.days; d++) {
    s = step(s);
    const r = s.days[d]!;
    const closedToday = s.closedCases.find((k) => k.verifiedDay === d);
    const k = s.activeCase ?? closedToday ?? null;
    days.push({
      day: d,
      date: r.date,
      reading: r.reading,
      actualKwh: r.actualKwh,
      expectedKwh: r.expectedKwh,
      clearSkyKwh: r.clearSkyKwh,
      rained: r.rained,
      vendorFixesOnTime: s.vendorFixesOnTime,
      diagnosis: r.diagnosis,
      case: k && {
        id: k.id,
        cause: k.cause,
        status: k.status,
        ...(k.resolvedBy ? { resolvedBy: k.resolvedBy } : {}),
      },
    });
    act(d);
  }

  const all = [...s.closedCases, ...(s.activeCase ? [s.activeCase] : [])];
  return {
    scenario: def.name,
    description: def.description,
    config: { ...defaultConfig, ...def.config },
    vendorFixesOnTime: def.vendorFixesOnTime,
    actions: def.actions,
    days,
    cases: all.map((k) => caseRecord(s, k)),
    decisions: s.log
      .filter((e) => e.day >= 0)
      .map((e) => ({ day: e.day, date: days[e.day]?.date ?? "", kind: e.kind, text: e.text })),
  };
}
