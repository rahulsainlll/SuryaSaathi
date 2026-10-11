import { chartColor } from "@suryasaathi/ui";
import type { SeriesPoint } from "./types";

const W = 320;
const H = 108;
const PAD = { top: 8, right: 8, bottom: 16, left: 8 };

/**
 * A month of expected against actual, drawn small.
 *
 * Deliberately not Liveline: that is built for a value streaming against the wall clock,
 * and at this size its series chips, end-of-line labels and time axis land on top of one
 * another. This is thirty points that already happened, so a plain SVG draws them
 * legibly and scales with the card. The demo page still uses Liveline, where the data
 * really is arriving live.
 */
export function Sparkline({ points, label }: { points: SeriesPoint[]; label: string }) {
  const values = points.flatMap((p) => [p.actualKwh ?? 0, p.expectedKwh ?? 0]);
  const max = Math.max(...values, 1);
  // Start at zero so the gap between the lines reads as a proportion, not a crop.
  const x = (i: number) =>
    PAD.left + (i / Math.max(1, points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const path = (pick: (p: SeriesPoint) => number | null) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(pick(p) ?? 0).toFixed(1)}`)
      .join(" ");

  const first = points[0]?.date;
  const last = points.at(-1)?.date;
  const short = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";

  return (
    <figure className="live-spark" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
        {/* The shortfall, so dust and faults read as area rather than as two lines. */}
        <path
          d={`${path((p) => p.expectedKwh)} L${x(points.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`}
          fill={chartColor.expected}
          opacity="0.07"
        />
        <path
          d={path((p) => p.expectedKwh)}
          fill="none"
          stroke={chartColor.expected}
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path((p) => p.actualKwh)}
          fill="none"
          stroke={chartColor.actual}
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="live-spark-axis">
        <span>{short(first)}</span>
        <span className="live-spark-key">
          <i style={{ background: chartColor.expected }} aria-hidden="true" /> Expected
          <i style={{ background: chartColor.actual }} aria-hidden="true" /> Actual
        </span>
        <span>{short(last)}</span>
      </figcaption>
    </figure>
  );
}
