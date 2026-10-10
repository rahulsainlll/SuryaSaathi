"use client";

import { formatDay, type SimState } from "@suryasaathi/engine";
import { chartColor } from "@suryasaathi/ui";
import { Liveline, type LivelineSeries } from "liveline";
import { useEffect, useState } from "react";

interface OutputChartProps {
  sim: SimState;
  playing: boolean;
  lastStepAt: number | null;
  /** Wall-clock milliseconds one simulated day takes on the chart. */
  dayMs: number;
  reducedMotion: boolean;
}

/** Expected vs actual kWh per day: live with Liveline, or static when motion is reduced. */
export function OutputChart(props: OutputChartProps) {
  return (
    <div>
      {props.reducedMotion ? (
        <div className="overflow-x-auto">
          <StaticChart sim={props.sim} />
        </div>
      ) : (
        <div className="h-56 sm:h-64">
          <LiveChart {...props} />
        </div>
      )}
      <Legend />
      <DataTable sim={props.sim} />
    </div>
  );
}

/**
 * Liveline scrolls with the wall clock. Each simulated day sits `dayMs` apart, with the
 * newest reading at the moment it arrived, so during play the chart scrolls one day per
 * tick. When the viewer stops, the chart drifts for one day and then pauses.
 */
function LiveChart({ sim, playing, lastStepAt, dayMs }: OutputChartProps) {
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  useEffect(() => {
    if (lastStepAt === null) return;
    const id = setTimeout(() => setFrozenAt(lastStepAt), dayMs);
    return () => clearTimeout(id);
  }, [lastStepAt, dayMs]);

  const spacing = dayMs / 1000;
  const anchor = (lastStepAt ?? 0) / 1000;
  const time = (day: number) => anchor - (sim.day - day) * spacing;
  const latest = sim.days.at(-1);

  const series: LivelineSeries[] = [
    {
      id: "expected",
      label: "Expected",
      color: chartColor.expected,
      data: sim.days.map((d) => ({ time: time(d.day), value: d.expectedKwh })),
      value: latest?.expectedKwh ?? 0,
    },
    {
      id: "actual",
      label: "Actual",
      color: chartColor.actual,
      data: sim.days.map((d) => ({ time: time(d.day), value: d.actualKwh })),
      value: latest?.actualKwh ?? 0,
    },
  ];

  return (
    // Liveline adds a 2rem row of series chips above a canvas as tall as its parent.
    <div role="img" aria-label={chartSummary(sim)} className="h-[calc(100%-2rem)]">
      <Liveline
        data={[]}
        value={0}
        series={series}
        theme="light"
        window={(sim.config.days + 1) * spacing}
        paused={!playing && frozenAt === lastStepAt}
        emptyText={
          sim.day < 0
            ? "Press Play or Next day to send the first reading"
            : "The line starts with the second reading"
        }
        formatValue={(v) => `${v.toFixed(1)} kWh`}
        formatTime={(t) => {
          const day = Math.round(sim.day - (anchor - t) / spacing);
          return day >= 0 && day <= sim.day ? formatDay(sim.config.startDate, day) : "";
        }}
      />
    </div>
  );
}

const W = 720;
const H = 260;
const PAD = { left: 40, right: 12, top: 14, bottom: 30 };
const MAX_KWH = 14;

/** The prototype's SVG chart: the whole month at once, with rain and case markers. */
function StaticChart({ sim }: { sim: SimState }) {
  const days = sim.config.days;
  const x = (i: number) => PAD.left + (W - PAD.left - PAD.right) * (i / (days - 1));
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / MAX_KWH);
  const path = (values: number[]) =>
    values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const cases = [...sim.closedCases, ...(sim.activeCase ? [sim.activeCase] : [])];
  const latest = sim.days.at(-1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full min-w-[520px]"
      role="img"
      aria-label={chartSummary(sim)}
    >
      {[0, 4, 8, 12].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--separator)" />
          <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            {v}
          </text>
        </g>
      ))}
      {sim.rainDays
        .filter((d) => d <= sim.day)
        .map((d) => (
          <rect
            key={d}
            x={x(d) - 6}
            y={PAD.top}
            width="12"
            height={H - PAD.top - PAD.bottom}
            rx="3"
            fill={chartColor.rain}
            opacity=".35"
          />
        ))}
      {[0, 7, 14, 21, days - 1].map((d) => (
        <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
          {formatDay(sim.config.startDate, d)}
        </text>
      ))}
      {cases.map((k) => (
        <g key={k.id}>
          <line
            x1={x(k.openedDay)}
            x2={x(k.openedDay)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--muted)"
            strokeDasharray="3 4"
          />
          <text x={x(k.openedDay) + 4} y={PAD.top + 10} fontSize="11" fill="var(--foreground)">
            {k.id}
          </text>
        </g>
      ))}
      {latest && (
        <>
          <path
            d={path(sim.days.map((d) => d.expectedKwh))}
            fill="none"
            stroke={chartColor.expected}
            strokeWidth="2.5"
            strokeDasharray="7 5"
            strokeLinecap="round"
          />
          <path
            d={path(sim.days.map((d) => d.actualKwh))}
            fill="none"
            stroke={chartColor.actual}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={x(latest.day)} cy={y(latest.actualKwh)} r="5" fill={chartColor.actual} />
        </>
      )}
    </svg>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      <span className="inline-flex items-center gap-2">
        <i className="h-0.5 w-5 rounded" style={{ background: chartColor.expected }} />
        Expected (sunlight + haze)
      </span>
      <span className="inline-flex items-center gap-2">
        <i className="h-0.5 w-5 rounded" style={{ background: chartColor.actual }} />
        Actual reading
      </span>
    </div>
  );
}

function DataTable({ sim }: { sim: SimState }) {
  if (sim.days.length === 0) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted">Show the numbers</summary>
      <div className="mt-2 max-h-56 overflow-auto">
        <table className="w-full text-left tabular-nums">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">Day</th>
              <th className="py-1 pr-3 font-medium">Expected</th>
              <th className="py-1 pr-3 font-medium">Actual</th>
              <th className="py-1 pr-3 font-medium">Performance</th>
              <th className="py-1 font-medium">Rain</th>
            </tr>
          </thead>
          <tbody>
            {sim.days.map((d) => (
              <tr key={d.day} className="border-t border-separator">
                <td className="py-1 pr-3">{formatDay(sim.config.startDate, d.day)}</td>
                <td className="py-1 pr-3">{d.expectedKwh.toFixed(1)} kWh</td>
                <td className="py-1 pr-3">{d.actualKwh.toFixed(1)} kWh</td>
                <td className="py-1 pr-3">{Math.round(d.performance * 100)}%</td>
                <td className="py-1">{d.rained ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function chartSummary(sim: SimState): string {
  const latest = sim.days.at(-1);
  if (!latest) return "Chart of expected and actual daily solar output. No readings yet.";
  return `Chart of expected and actual daily solar output over ${sim.days.length} days. Latest: ${latest.actualKwh.toFixed(1)} of ${latest.expectedKwh.toFixed(1)} kWh expected.`;
}
