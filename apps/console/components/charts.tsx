"use client";

import type { FleetPoint, ReadingRow } from "@suryasaathi/console-data";
import { chartColor } from "@suryasaathi/ui";
import { Liveline, type LivelineSeries } from "liveline";
import { useEffect, useState, type ReactNode } from "react";
import { Card, Disclosure } from "@heroui/react";
import { DataTable } from "./data-table";
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

/** The console follows the system theme; the canvas has to be told which one it is. */
function useChartTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () =>
      setTheme(
        document.documentElement.classList.contains("dark") ||
          document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light",
      );
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
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
    <Card>
      <Card.Content>
        {/* Liveline adds a 2rem row of chips above a canvas as tall as its parent. */}
        <div role="img" aria-label={label} className="h-56 sm:h-64">
          <div className="h-[calc(100%-2rem)]">{children}</div>
        </div>
      </Card.Content>
      <Card.Footer className="block">
        <Disclosure className="w-full">
          <Disclosure.Heading>
            <Disclosure.Trigger className="flex w-full items-center justify-between gap-2 text-sm text-muted">
              Show the numbers
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <div className="pt-2">{table}</div>
          </Disclosure.Content>
        </Disclosure>
      </Card.Footer>
    </Card>
  );
}

/** Fleet (or vendor) performance per day, with the 90% underperforming line. */
export function PerformanceChart({ points, label }: { points: FleetPoint[]; label: string }) {
  const valid = points.filter((p) => p.performance !== null);
  const theme = useChartTheme();
  const t = useTimeline(valid.map((p) => p.date));
  const data = valid.map((p, i) => ({ time: t.time(i), value: p.performance! * 100 }));
  const latest = data.at(-1)?.value ?? 0;
  return (
    <ChartBox
      label={`${label}: performance ${valid.length ? `from ${pct(valid[0]!.performance)} to ${pct(valid.at(-1)!.performance)}` : "no data"}`}
      table={
        <DataTable<FleetPoint>
          label={`${label}, by day`}
          rows={points}
          rowKey={(p) => p.date}
          columns={[
            { id: "date", label: "Day", rowHeader: true, render: (p) => day(p.date) },
            { id: "made", label: "Made", align: "end", render: (p) => kwh(p.actualKwh) },
            { id: "expected", label: "Expected", align: "end", render: (p) => kwh(p.expectedKwh) },
            { id: "perf", label: "Performance", align: "end", render: (p) => pct(p.performance) },
            { id: "under", label: "Below 90%", align: "end", render: (p) => p.underperforming },
          ]}
        />
      }
    >
      {/* Same single-series call shape as ExpectedActualChart below, which draws: an
          explicit `series` with `data={[]}`. The bare `data` + `color` form left the
          canvas blank here. */}
      <Liveline
        data={[]}
        value={0}
        series={[
          {
            id: "performance",
            label: "Performance",
            color: chartColor.actual,
            data,
            value: latest,
          },
        ]}
        theme={theme}
        window={t.window}
        paused
        pulse={false}
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
  const theme = useChartTheme();
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
        <DataTable<ReadingRow>
          label={`${label}, by day`}
          rows={rows}
          rowKey={(r) => r.date}
          columns={[
            { id: "date", label: "Day", rowHeader: true, render: (r) => day(r.date) },
            { id: "expected", label: "Expected", align: "end", render: (r) => kwh(r.expectedKwh!) },
            { id: "made", label: "Made", align: "end", render: (r) => kwh(r.energyKwh) },
            { id: "perf", label: "Performance", align: "end", render: (r) => pct(r.performance) },
          ]}
        />
      }
    >
      <Liveline
        data={[]}
        value={0}
        series={series}
        theme={theme}
        window={t.window}
        paused
        pulse={false}
        formatValue={(v) => `${v.toFixed(1)} kWh`}
        formatTime={t.label}
      />
    </ChartBox>
  );
}
