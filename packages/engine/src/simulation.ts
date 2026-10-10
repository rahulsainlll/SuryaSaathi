import type { Case, CaseCause, CaseResolver, CaseStatus, Reading } from "@suryasaathi/schemas";
import { defaultConfig, type SimConfig } from "./config.js";
import { dateOf, formatDay, readingTime } from "./dates.js";
import { FAULT_CODE, type DeviceSource } from "./device.js";
import {
  diagnose,
  performance,
  VERIFIED_MIN_PERFORMANCE,
  type Diagnosis,
  type Observation,
} from "./diagnosis.js";
import { nextRandom } from "./rng.js";
import {
  actualKwh,
  BASE_HAZE,
  clearSkyKwh,
  expectedKwh,
  HAZE_SPREAD,
  MAX_SOILING,
  SMOG_HAZE,
  SOILING_PER_DAY,
} from "./world.js";

/** Days after filing that an on-time vendor visits. */
export const VENDOR_VISIT_AFTER_DAYS = 2;
/** Days after escalation that the DISCOM gets the vendor to visit. */
export const DISCOM_VISIT_AFTER_DAYS = 2;

export type LogKind = "neutral" | "info" | "success" | "warning" | "danger";

/** One line in the agents' decision log. */
export interface LogEntry {
  day: number;
  text: string;
  kind: LogKind;
}

/** A maintenance case, tracked in simulation days. */
export interface SimCase {
  id: string;
  cause: CaseCause;
  status: CaseStatus;
  openedDay: number;
  deadlineDay: number;
  escalatedDay?: number;
  fixedDay?: number;
  verifiedDay?: number;
  resolvedBy?: CaseResolver;
}

/** Everything that happened on one simulated day. */
export interface DayRecord extends Observation {
  day: number;
  date: string;
  haze: number;
  /** Dust on the panels when the reading was taken, as a share of output lost. */
  soiling: number;
  performance: number;
  /** Lifetime energy after this day, kWh. */
  totalKwh: number;
  /** The normalised reading, as ingest would store it. */
  reading: Reading;
  /** What the detection rules said, or null when a case was already open. */
  diagnosis: Diagnosis | null;
}

/** The one WhatsApp message the family gets when a problem is fixed. */
export interface FamilyMessage {
  day: number;
  caseId: string;
  text: string;
}

export interface SimState {
  config: SimConfig;
  /** Last simulated day, or -1 before the first reading. */
  day: number;
  rngState: number;
  soiling: number;
  faulty: boolean;
  pending: { rain: boolean; smog: boolean };
  script: Record<number, "smog" | "fault">;
  rainDays: number[];
  days: DayRecord[];
  totalKwh: number;
  /** Energy lost to dust and faults so far, kWh. */
  lossKwh: number;
  activeCase: SimCase | null;
  closedCases: SimCase[];
  /** Oldest first. */
  log: LogEntry[];
  familyMessages: FamilyMessage[];
  nextCaseNumber: number;
  source: DeviceSource;
  vendorFixesOnTime: boolean;
}

export function createSimulation(overrides: Partial<SimConfig> = {}): SimState {
  const config: SimConfig = { ...defaultConfig, ...overrides };
  return {
    config,
    day: -1,
    rngState: config.seed,
    soiling: 0,
    faulty: false,
    pending: { rain: false, smog: false },
    script: { ...config.script },
    rainDays: [...config.rainDays],
    days: [],
    totalKwh: config.initialTotalKwh,
    lossKwh: 0,
    activeCase: null,
    closedCases: [],
    log: [],
    familyMessages: [],
    nextCaseNumber: config.firstCaseNumber,
    source: "data_logger",
    vendorFixesOnTime: false,
  };
}

export function isFinished(state: SimState): boolean {
  return state.day >= state.config.days - 1;
}

/** Simulates the next day: the world produces a reading, then the agents act on it. */
export function step(state: SimState): SimState {
  if (isFinished(state)) return state;
  const s = structuredClone(state);
  const { config } = s;
  const d = ++s.day;

  // Scripted rain (config.rainDays) washes the panels just like rain the viewer adds.
  if (d === 0 || s.rainDays.includes(d)) s.soiling = 0;
  if (s.pending.rain) {
    s.soiling = 0;
    s.rainDays.push(d);
    s.pending.rain = false;
    log(s, d, "Rain overnight washed the panels clean.", "info");
  }
  let smog = false;
  if (s.pending.smog || s.script[d] === "smog") {
    smog = true;
    s.pending.smog = false;
  }
  if (s.script[d] === "fault" && !s.faulty) s.faulty = true;

  const haze = smog ? SMOG_HAZE : BASE_HAZE + random(s) * HAZE_SPREAD;
  const expected = expectedKwh(config.capacityKw, config.peakSunHours, haze);
  const noise = 0.97 + random(s) * 0.05;
  const actual = actualKwh(expected, s.soiling, s.faulty, noise);
  s.totalKwh += actual;
  s.lossKwh += Math.max(0, expected - actual);

  const reading: Reading = {
    systemId: config.systemId,
    date: dateOf(config.startDate, d),
    source: s.source,
    energyKwh: Number(actual.toFixed(2)),
    ...(s.faulty ? { faultCode: FAULT_CODE } : {}),
    receivedAt: readingTime(config.startDate, d),
  };
  s.days.push({
    day: d,
    date: reading.date,
    haze,
    soiling: s.soiling,
    expectedKwh: expected,
    actualKwh: actual,
    clearSkyKwh: clearSkyKwh(config.capacityKw, config.peakSunHours),
    rained: s.rainDays.includes(d),
    ...(reading.faultCode ? { faultCode: reading.faultCode } : {}),
    performance: actual / expected,
    totalKwh: s.totalKwh,
    reading,
    diagnosis: null,
  });
  s.soiling = Math.min(MAX_SOILING, s.soiling + SOILING_PER_DAY);

  act(s, d);
  return s;
}

/** The agents' turn: move an open case along, or diagnose the new reading. */
function act(s: SimState, d: number) {
  const today = s.days[d]!;
  const r = performance(today);
  const pct = Math.round(r * 100);
  const vendor = s.config.vendorName;
  const k = s.activeCase;

  if (k) {
    if (k.status === "filed" && s.vendorFixesOnTime && d >= k.openedDay + VENDOR_VISIT_AFTER_DAYS) {
      fix(s, k, d, "vendor");
    } else if (k.status === "filed" && d >= k.deadlineDay) {
      k.status = "escalated";
      k.escalatedDay = d;
      log(
        s,
        d,
        `Deadline passed. Case ${k.id} escalated to the DISCOM with readings, chart and photos.`,
        "danger",
      );
    } else if (k.status === "escalated" && d >= k.escalatedDay! + DISCOM_VISIT_AFTER_DAYS) {
      fix(s, k, d, "discom");
    } else if (k.status === "fixed" && d > k.fixedDay!) {
      if (r > VERIFIED_MIN_PERFORMANCE) {
        log(s, d, `Fix verified: performance back to ${pct}%. Case ${k.id} closed.`, "success");
        close(s, k, d);
        s.familyMessages.push({ day: d, caseId: k.id, text: familyMessage(k, pct) });
      } else {
        log(s, d, `Still ${pct}% after the fix. Asking ${vendor} to recheck.`, "warning");
      }
    } else if (k.cause === "dust" && today.rained && r > VERIFIED_MIN_PERFORMANCE) {
      log(
        s,
        d,
        `Rain cleaned the panels before the visit. Case ${k.id} closed, no visit needed.`,
        "success",
      );
      k.resolvedBy = "rain";
      close(s, k, d);
    } else if (k.status === "filed") {
      const left = k.deadlineDay - d;
      log(
        s,
        d,
        `Waiting for ${vendor}: ${left} day${left === 1 ? "" : "s"} left. Reading ${pct}%.`,
        "neutral",
      );
    } else if (k.status === "escalated") {
      log(s, d, `DISCOM has the case. Reading ${pct}%.`, "neutral");
    }
    return;
  }

  const diagnosis = diagnose(s.days, d);
  today.diagnosis = diagnosis;
  switch (diagnosis) {
    case "fault":
    case "dust":
      openCase(s, d, diagnosis, pct);
      break;
    case "smog":
      log(
        s,
        d,
        `Smog cut the sunlight: expected only ${today.expectedKwh.toFixed(1)} kWh. System healthy at ${pct}%. No complaint.`,
        "info",
      );
      break;
    case "healthy":
      log(
        s,
        d,
        `Reading received: ${today.actualKwh.toFixed(1)} of ${today.expectedKwh.toFixed(1)} kWh (${pct}%). No action.`,
        "neutral",
      );
  }
}

function openCase(s: SimState, d: number, cause: CaseCause, pct: number) {
  const id = `SS-${String(s.nextCaseNumber++).padStart(4, "0")}`;
  const deadlineDay = d + s.config.deadlineDays;
  s.activeCase = { id, cause, status: "filed", openedDay: d, deadlineDay };
  if (cause === "fault") {
    log(
      s,
      d,
      `Output collapsed overnight to ${pct}% while sunlight was normal. Diagnosis: inverter or wiring fault.`,
      "danger",
    );
  } else {
    log(
      s,
      d,
      `Gap widening every dry day, now ${pct}%. Haze already counted. Diagnosis: dust on panels.`,
      "warning",
    );
  }
  const work = cause === "fault" ? "repair" : "cleaning";
  const due = formatDay(s.config.startDate, deadlineDay);
  log(
    s,
    d,
    `Case ${id} filed to ${s.config.vendorName}: free ${work} under 5-year O&M. Deadline ${due}.`,
    "info",
  );
}

function fix(s: SimState, k: SimCase, d: number, by: "vendor" | "discom") {
  k.status = "fixed";
  k.fixedDay = d;
  k.resolvedBy = by;
  if (k.cause === "fault") s.faulty = false;
  else s.soiling = 0;
  const work = k.cause === "fault" ? "repaired the inverter" : "cleaned the panels";
  const vendor = s.config.vendorName;
  log(
    s,
    d,
    by === "vendor" ? `${vendor} ${work} on time.` : `After DISCOM escalation, ${vendor} ${work}.`,
    "success",
  );
}

function close(s: SimState, k: SimCase, d: number) {
  k.status = "verified";
  k.verifiedDay = d;
  s.closedCases.push(k);
  s.activeCase = null;
}

function familyMessage(k: SimCase, pct: number): string {
  const what =
    k.cause === "fault"
      ? "Inverter में खराबी थी। Vendor ने मुफ्त repair कर दिया।"
      : "आपके panels पर धूल थी। हमने vendor से मुफ्त सफाई करवा दी।";
  const escalated =
    k.resolvedBy === "discom" ? " (Vendor देर कर रहा था, इसलिए DISCOM से करवाया।)" : "";
  return `${what}${escalated} Output वापस ${pct}% पर है। Case ${k.id}`;
}

function random(s: SimState): number {
  const { value, state } = nextRandom(s.rngState);
  s.rngState = state;
  return value;
}

function log(s: SimState, day: number, text: string, kind: LogKind) {
  s.log.push({ day, text, kind });
}

// ---------- viewer actions ----------

/** Rain falls tonight and washes the panels before the next reading. */
export function scheduleRain(state: SimState): SimState {
  const s = structuredClone(state);
  s.pending.rain = true;
  log(s, s.day, "Rain forecast tonight.", "info");
  return s;
}

/** Heavy smog cuts sunlight on the next day. */
export function scheduleSmog(state: SimState): SimState {
  const s = structuredClone(state);
  s.pending.smog = true;
  log(s, s.day, "Heavy smog expected tomorrow.", "info");
  return s;
}

/** The inverter develops a fault on the next day. */
export function breakInverter(state: SimState): SimState {
  const s = structuredClone(state);
  s.script[s.day + 1] = "fault";
  log(s, s.day, "A fault will hit the inverter tomorrow.", "danger");
  return s;
}

export function setVendorFixesOnTime(state: SimState, value: boolean): SimState {
  return { ...state, vendorFixesOnTime: value };
}

/** Changes where new readings come from. */
export function setSource(state: SimState, source: DeviceSource): SimState {
  return { ...state, source };
}

// ---------- derived values ----------

/** Money lost to dust and faults so far, in rupees. */
export function lossInr(state: SimState): number {
  return Math.round(state.lossKwh * state.config.tariffInr);
}

/** A case as the case schema describes it. */
export function caseRecord(state: SimState, k: SimCase): Case {
  const at = (day: number) => readingTime(state.config.startDate, day);
  return {
    caseId: k.id,
    systemId: state.config.systemId,
    vendorId: state.config.vendorId,
    cause: k.cause,
    status: k.status,
    openedAt: at(k.openedDay),
    vendorDeadline: at(k.deadlineDay),
    ...(k.escalatedDay === undefined ? {} : { escalatedAt: at(k.escalatedDay) }),
    ...(k.fixedDay === undefined ? {} : { fixedAt: at(k.fixedDay) }),
    ...(k.verifiedDay === undefined ? {} : { verifiedAt: at(k.verifiedDay) }),
    ...(k.resolvedBy === undefined ? {} : { resolvedBy: k.resolvedBy }),
  };
}
