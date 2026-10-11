import { runScenario, SCENARIOS } from "@suryasaathi/engine";

export interface Signature {
  expected: string;
  actual: string;
  /** x of the day that gives the cause away, in viewBox units. */
  markerX: number;
}

/** The viewBox the paths are drawn in (charts keep this aspect ratio). */
export const VIEW = { width: 300, height: 110 };
const W = VIEW.width;
const H = VIEW.height;

/**
 * Expected-vs-actual paths for a window of an engine scenario, computed at build time so
 * the browser only animates them.
 */
function signature(scenario: string, first: number, last: number, marker: number): Signature {
  const def = SCENARIOS.find((s) => s.name === scenario)!;
  const days = runScenario(def).days.slice(first, last + 1);
  // Fit the range to the window, so the signature fills the chart.
  const values = days.flatMap((d) => [d.expectedKwh, d.actualKwh]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.12;
  const x = (i: number) => (W * i) / (days.length - 1);
  const y = (v: number) => H - ((v - lo + pad) / (hi - lo + 2 * pad)) * H;
  const path = (pick: (d: (typeof days)[number]) => number) =>
    days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(2)} ${y(pick(d)).toFixed(2)}`).join(" ");
  return {
    expected: path((d) => d.expectedKwh),
    actual: path((d) => d.actualKwh),
    markerX: x(marker - first),
  };
}

export function signatures() {
  return {
    smog: signature("smog-day", 2, 11, 6),
    dust: signature("dust", 0, 12, 12),
    fault: signature("fault", 7, 17, 12),
    /** The how-it-works story: smog on day 6, dust filed day 15, escalated 18, verified 21. */
    story: signature("vendor-misses-deadline", 0, 21, 15),
  };
}
