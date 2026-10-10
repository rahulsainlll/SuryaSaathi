/**
 * Diagnosis rules (v1) from the README. They read only what the agent can observe: the
 * reading, the expected output for that day, overnight rain and any inverter fault code.
 */

/** Smog: expected is low but performance stays above this. */
export const SMOG_MIN_PERFORMANCE = 0.9;
/** "Expected is low": below this share of clear-sky output. */
export const SMOG_EXPECTED_SHARE = 0.8;
/** Dust: 3-day average performance below this… */
export const DUST_MAX_AVG3 = 0.91;
/** …and falling over this many dry days… */
export const DUST_WINDOW_DAYS = 5;
/** …by more than this. */
export const DUST_MIN_FALL = 0.02;
/** Dust needs this much history before it can be called. */
export const DUST_MIN_HISTORY = 6;
/** Fault: performance drops below this overnight… */
export const FAULT_MAX_PERFORMANCE = 0.6;
/** …from above this the day before. */
export const FAULT_PREVIOUS_MIN = 0.8;
/** Verified fix: performance back above this. */
export const VERIFIED_MIN_PERFORMANCE = 0.93;

/** One day as the agent sees it. */
export interface Observation {
  expectedKwh: number;
  actualKwh: number;
  /** What the roof would make on a clear day; "expected is low" is measured against it. */
  clearSkyKwh: number;
  /** It rained the night before this reading. */
  rained: boolean;
  faultCode?: string;
}

export type Diagnosis = "healthy" | "smog" | "dust" | "fault";

export function performance(o: Observation): number {
  return o.actualKwh / o.expectedKwh;
}

/** Diagnoses day `day` from the observations up to and including it. */
export function diagnose(history: readonly Observation[], day: number): Diagnosis {
  const today = history[day];
  if (!today) throw new RangeError(`No observation for day ${day}`);
  const p = (d: number) => performance(history[d]!);
  const r = p(day);

  if (today.faultCode) return "fault";
  if (day >= 1 && r < FAULT_MAX_PERFORMANCE && p(day - 1) > FAULT_PREVIOUS_MIN) return "fault";

  if (day >= DUST_MIN_HISTORY) {
    const avg3 = (r + p(day - 1) + p(day - 2)) / 3;
    const falling = r - p(day - DUST_WINDOW_DAYS) < -DUST_MIN_FALL;
    const dry = history.slice(day - DUST_WINDOW_DAYS + 1, day + 1).every((o) => !o.rained);
    if (avg3 < DUST_MAX_AVG3 && falling && dry) return "dust";
  }

  const expectedIsLow = today.expectedKwh < SMOG_EXPECTED_SHARE * today.clearSkyKwh;
  if (expectedIsLow && r > SMOG_MIN_PERFORMANCE) return "smog";

  return "healthy";
}
