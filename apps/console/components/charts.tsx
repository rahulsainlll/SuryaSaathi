"use client";

import type { FleetPoint, ReadingRow } from "@suryasaathi/console-data";
import { chartColor } from "@suryasaathi/ui";
import { Liveline, type LivelineSeries } from "liveline";
import { useState, type ReactNode } from "react";
import { day, kwh, pct } from "../lib/format";

/**
 * Liveline draws against the wall clock. For a history, each day sits one second apart with
 * the last one at the moment the chart mounted, and the chart is paused so it stays put.
 */
function useTimeline(dates: string[]) {
  const [anchor] = useState(() => Date.now() / 1000);
  const time = (i: number) => anchor - (dates.length - 1 - i);
  const label = (t: number) => {
    const i = Math.round(t - anchor + dates.length - 1);
    return dates[i] ? day(dates[i]) : "";
  };
  return { time, label, window: dates.length + 1 };
}

function ChartBox({
  label,
  children,
  table,
}: {
  label: string;
  children: ReactNode;
  table: ReactNode;
}) {
  return (
    <figure className="rounded-2xl bg-surface p-4 shadow-sm">
      {/* Liveline adds a 2rem row of chips above a canvas as tall as its parent. */}
      <div role="img" aria-label={label} className="h-56 sm:h-64">
        <div className="h-[calc(100%-2rem)]">{children}</div>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">Show the numbers</summary>
        <div className="mt-2 max-h-64 overflow-auto">{table}</div>
      </details>
    </figure>
  );
}

/** Fleet (or vendor) performance per day, with the 90% underperforming line. */
export function PerformanceChart({ points, label }: { points: FleetPoint[]; label: string }) {
  const valid = points.filter((p) => p.performance !== null);
  const t = useTimeline(valid.map((p) => p.date));
  const data = valid.map((p, i) => ({ time: t.time(i), value: p.performance! * 100 }));
  const latest = data.at(-1)?.value ?? 0;
  return (
    <ChartBox
      label={`${label}: performance ${valid.length ? `from ${pct(valid[0]!.performance)} to ${pct(valid.at(-1)!.performance)}` : "no data"}`}
      table={
        <table className="w-full text-left tabular-nums">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">Day</th>
              <th className="py-1 pr-3 font-medium">Made</th>
              <th className="py-1 pr-3 font-medium">Expected</th>
              <th className="py-1 pr-3 font-medium">Performance</th>
              <th className="py-1 font-medium">Below 90%</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date} className="border-t border-separator">
                <td className="py-1 pr-3">{day(p.date)}</td>
                <td className="py-1 pr-3">{kwh(p.actualKwh)}</td>
                <td className="py-1 pr-3">{kwh(p.expectedKwh)}</td>
                <td className="py-1 pr-3">{pct(p.performance)}</td>
                <td className="py-1">{p.underperforming}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <Liveline
        data={data}
        value={latest}
        theme="light"
        color={chartColor.actual}
        window={t.window}
        paused
        pulse={false}
        badge={false}
        momentum={false}
        scrub
        referenceLine={{ value: 90, label: "90%" }}
        formatValue={(v) => `${v.toFixed(1)}%`}
        formatTime={t.label}
      />
    </ChartBox>
  );
}

/** Expected vs actual kWh per day for one system. */
export function ExpectedActualChart({
  readings,
  label,
}: {
  readings: ReadingRow[];
  label: string;
}) {
  const rows = readings.filter((r) => r.expectedKwh !== null);
  const t = useTimeline(rows.map((r) => r.date));
  const series: LivelineSeries[] = [
    {
      id: "expected",
      label: "Expected",
      color: chartColor.expected,
      data: rows.map((r, i) => ({ time: t.time(i), value: r.expectedKwh! })),
      value: rows.at(-1)?.expectedKwh ?? 0,
    },
    {
      id: "actual",
      label: "Actual",
      color: chartColor.actual,
      data: rows.map((r, i) => ({ time: t.time(i), value: r.energyKwh })),
      value: rows.at(-1)?.energyKwh ?? 0,
    },
  ];
  return (
    <ChartBox
      label={`${label}: expected and actual kWh over ${rows.length} days`}
      table={
        <table className="w-full text-left tabular-nums">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">Day</th>
              <th className="py-1 pr-3 font-medium">Expected</th>
              <th className="py-1 pr-3 font-medium">Made</th>
              <th className="py-1 font-medium">Performance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-t border-separator">
                <td className="py-1 pr-3">{day(r.date)}</td>
                <td className="py-1 pr-3">{kwh(r.expectedKwh!)}</td>
                <td className="py-1 pr-3">{kwh(r.energyKwh)}</td>
                <td className="py-1">{pct(r.performance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <Liveline
        data={[]}
        value={0}
        series={series}
        theme="light"
        window={t.window}
        paused
        pulse={false}
        formatValue={(v) => `${v.toFixed(1)} kWh`}
        formatTime={t.label}
      />
    </ChartBox>
  );
}
