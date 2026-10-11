"use client";

import { chartColor } from "@suryasaathi/ui";
import { Liveline, type LivelineSeries } from "liveline";
import { useEffect, useState } from "react";
import type { Diagnosis, LiveSystem } from "./types";

const SOURCE_LABEL: Record<string, string> = {
  data_logger: "Data logger",
  inverter_cloud: "Inverter cloud",
  camera_clip: "Camera clip",
  whatsapp_photo: "WhatsApp photo",
};

const DIAGNOSIS_CHIP: Record<string, string> = {
  healthy: "chip ok",
  smog: "chip b",
  dust: "chip a",
  fault: "chip bad",
};

export function diagnosisLabel(d: Diagnosis): string {
  return d ? d[0]!.toUpperCase() + d.slice(1) : "No reading yet";
}

/** Light or dark, watched live so the canvas repaints when the toggle flips. */
function useChartTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/**
 * One rooftop: how it is doing today and the last month of expected against actual.
 * The series is historical, so the chart is paused — Liveline is drawing a month that
 * has already happened, not a stream.
 */
export function RoofCard({ system }: { system: LiveSystem }) {
  const theme = useChartTheme();
  const points = system.series.filter((p) => p.actualKwh !== null && p.expectedKwh !== null);
  // Liveline wants seconds; one point per day, ending now so the window frames them all.
  const day = 86_400;
  const end = Math.floor(Date.now() / 1000);
  const at = (i: number) => end - (points.length - 1 - i) * day;
  const series: LivelineSeries[] = [
    {
      id: "expected",
      label: "Expected",
      color: chartColor.expected,
      data: points.map((p, i) => ({ time: at(i), value: p.expectedKwh! })),
      value: points.at(-1)?.expectedKwh ?? 0,
    },
    {
      id: "actual",
      label: "Actual",
      color: chartColor.actual,
      data: points.map((p, i) => ({ time: at(i), value: p.actualKwh! })),
      value: points.at(-1)?.actualKwh ?? 0,
    },
  ];
  const performance = system.performance === null ? null : Math.round(system.performance * 100);
  const summary = `${system.systemId}: ${
    performance === null ? "no reading yet" : `${performance}% of expected`
  }, ${diagnosisLabel(system.diagnosis).toLowerCase()}.`;

  return (
    <article className="card stack g12 live-roof">
      <div className="live-roof-head">
        <div className="stack g8">
          <span className="eyebrow">{system.zone ?? "Delhi"}</span>
          <h3 className="as-h3">{system.systemId}</h3>
        </div>
        <span className={DIAGNOSIS_CHIP[system.diagnosis ?? ""] ?? "chip"}>
          {diagnosisLabel(system.diagnosis)}
        </span>
      </div>

      <div className="live-figures">
        <div>
          <span className="live-figure">{performance === null ? "—" : `${performance}%`}</span>
          <span className="small muted">of expected</span>
        </div>
        <div>
          <span className="live-figure-sm">
            {system.actualKwh === null ? "—" : system.actualKwh.toFixed(1)}
          </span>
          <span className="small muted">kWh made</span>
        </div>
        <div>
          <span className="live-figure-sm">
            {system.expectedKwh === null ? "—" : system.expectedKwh.toFixed(1)}
          </span>
          <span className="small muted">kWh expected</span>
        </div>
      </div>

      {points.length > 1 ? (
        <div className="live-chart" role="img" aria-label={summary}>
          <Liveline
            data={[]}
            value={0}
            series={series}
            theme={theme}
            paused
            window={(points.length + 1) * day}
            formatValue={(v) => `${v.toFixed(1)} kWh`}
            formatTime={(t) =>
              new Date(t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            }
          />
        </div>
      ) : (
        <p className="small muted">Not enough readings yet to draw a month.</p>
      )}

      <p className="small muted">
        {SOURCE_LABEL[system.dataSource ?? ""] ?? "Data logger"}
        {system.latestReadingDate ? ` · reading for ${system.latestReadingDate}` : ""}
      </p>
    </article>
  );
}
