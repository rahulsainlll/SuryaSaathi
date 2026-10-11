"use client";

import {
  createSimulation,
  formatDay,
  isFinished,
  step,
  type SimCase,
  type SimState,
} from "@suryasaathi/engine";
import { Liveline, type LivelineSeries } from "liveline";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "../demo/_components/use-reduced-motion";
import { COLORS } from "./colors";

/** Wall-clock milliseconds per simulated day. */
const DAY_MS = 600;
/** Pause on the finished month before starting over. */
const HOLD_MS = 3500;

/** The month the engine plays, run to the end (the reduced-motion view). */
function finishedMonth(): SimState {
  let s = createSimulation();
  while (!isFinished(s)) s = step(s);
  return s;
}

/** A compact copy of the demo: one 3 kW roof, one simulated day every 0.6 s. */
export function HeroWidget() {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [sim, setSim] = useState(() => createSimulation());
  const [lastStepAt, setLastStepAt] = useState(0);
  const [visible, setVisible] = useState(false);
  const final = useMemo(() => (reduced ? finishedMonth() : null), [reduced]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;
    const finished = isFinished(sim);
    const id = setTimeout(
      () => {
        if (document.hidden) return setLastStepAt(Date.now());
        setSim(finished ? createSimulation() : step(sim));
        setLastStepAt(Date.now());
      },
      finished ? HOLD_MS : DAY_MS,
    );
    return () => clearTimeout(id);
  }, [sim, lastStepAt, visible, reduced]);

  const shown = final ?? sim;
  const latest = shown.days.at(-1);
  const kase = shown.activeCase ?? shown.closedCases.at(-1) ?? null;
  const message = shown.familyMessages.at(-1);

  return (
    <div
      ref={box}
      className="relative rounded-3xl border border-separator bg-surface p-4 shadow-2xl shadow-black/40 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-success opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          3 kW roof · Dwarka, Delhi
        </span>
        <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-muted">Simulated</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            {latest
              ? formatDay(shown.config.startDate, latest.day)
              : "Waiting for the first reading"}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {latest ? `${Math.round(latest.performance * 100)}%` : "—"}
            <span className="ml-1.5 text-sm font-normal text-muted">of expected</span>
          </p>
        </div>
        {final && (
          <div className="flex gap-3 text-xs text-muted">
            <Key color={COLORS.expected} label="Expected" dashed />
            <Key color={COLORS.actual} label="Actual" />
          </div>
        )}
      </div>

      <div className="mt-2 h-44 sm:h-48">
        {final ? (
          <StaticChart sim={final} />
        ) : (
          <LiveChart sim={sim} lastStepAt={lastStepAt} paused={!visible} />
        )}
      </div>

      <div className="mt-3 min-h-[5.5rem]" aria-live="polite">
        {kase ? (
          <CaseCard
            kase={kase}
            sim={shown}
            message={message?.caseId === kase.id ? message.text : undefined}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-separator p-3 text-sm text-muted">
            The agent checks every reading. Smog days are ignored; a case opens only for dust or a
            fault.
          </p>
        )}
      </div>
    </div>
  );
}

function Key({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg aria-hidden="true" width="16" height="4">
        <line
          x1="1"
          y1="2"
          x2="15"
          y2="2"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={dashed ? "3 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}

const STATUS: Record<SimCase["status"], { label: string; tone: string }> = {
  filed: { label: "Filed with the vendor", tone: "bg-warning/15 text-warning" },
  escalated: { label: "Escalated to the DISCOM", tone: "bg-danger/15 text-danger" },
  fixed: { label: "Fixed, checking", tone: "bg-accent/15 text-accent" },
  verified: { label: "Fix verified", tone: "bg-success/15 text-success" },
};

function CaseCard({ kase, sim, message }: { kase: SimCase; sim: SimState; message?: string }) {
  const status = STATUS[kase.status];
  const left = kase.deadlineDay - sim.day;
  return (
    <div className="animate-[ss-rise_400ms_ease-out] rounded-2xl border border-separator bg-surface-secondary p-3 motion-reduce:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          Case {kase.id} · {kase.cause === "dust" ? "Dust on the panels" : "Inverter fault"}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.tone}`}>
          {status.label}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {kase.status === "filed" && left >= 0
          ? `Free ${kase.cause === "dust" ? "cleaning" : "repair"} requested. ${left} day${left === 1 ? "" : "s"} left on the vendor’s deadline.`
          : kase.status === "escalated"
            ? "The vendor missed the deadline; the DISCOM has the readings and evidence."
            : message
              ? "WhatsApp to the family:"
              : "Waiting for the next reading to confirm the fix."}
      </p>
      {message && (
        <p
          lang="hi"
          className="mt-2 rounded-xl rounded-tl-sm bg-[#1f6f4a] px-3 py-2 text-sm text-white"
        >
          {message}
        </p>
      )}
    </div>
  );
}

function LiveChart({
  sim,
  lastStepAt,
  paused,
}: {
  sim: SimState;
  lastStepAt: number;
  paused: boolean;
}) {
  const spacing = DAY_MS / 1000;
  const anchor = lastStepAt / 1000;
  const time = (day: number) => anchor - (sim.day - day) * spacing;
  const latest = sim.days.at(-1);
  const series: LivelineSeries[] = [
    {
      id: "expected",
      label: "Expected",
      color: COLORS.expected,
      data: sim.days.map((d) => ({ time: time(d.day), value: d.expectedKwh })),
      value: latest?.expectedKwh ?? 0,
    },
    {
      id: "actual",
      label: "Actual",
      color: COLORS.actual,
      data: sim.days.map((d) => ({ time: time(d.day), value: d.actualKwh })),
      value: latest?.actualKwh ?? 0,
    },
  ];
  return (
    // Liveline adds a 2rem row of series chips (the legend) above a canvas as tall as its parent.
    <div role="img" aria-label={summary(sim)} className="h-[calc(100%-2rem)]">
      <Liveline
        data={[]}
        value={0}
        series={series}
        theme="dark"
        grid={false}
        window={(sim.config.days + 1) * spacing}
        paused={paused || isFinished(sim)}
        emptyText="Starting…"
        formatValue={(v) => `${v.toFixed(1)} kWh`}
        formatTime={(t) => {
          const day = Math.round(sim.day - (anchor - t) / spacing);
          return day >= 0 && day <= sim.day ? formatDay(sim.config.startDate, day) : "";
        }}
      />
    </div>
  );
}

/** The whole month as an SVG, for reduced motion. */
export function StaticChart({ sim }: { sim: SimState }) {
  const W = 400;
  const H = 160;
  const max = Math.max(...sim.days.map((d) => d.expectedKwh)) * 1.1;
  const x = (i: number) => 4 + (W - 8) * (i / (sim.config.days - 1));
  const y = (v: number) => 6 + (H - 12) * (1 - v / max);
  const path = (vals: number[]) =>
    vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="size-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={summary(sim)}
    >
      <path
        d={path(sim.days.map((d) => d.expectedKwh))}
        fill="none"
        stroke={COLORS.expected}
        strokeWidth="2"
        strokeDasharray="6 5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path(sim.days.map((d) => d.actualKwh))}
        fill="none"
        stroke={COLORS.actual}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function summary(sim: SimState) {
  const latest = sim.days.at(-1);
  return latest
    ? `Expected and actual daily output for ${sim.days.length} days. Latest: ${latest.actualKwh.toFixed(1)} of ${latest.expectedKwh.toFixed(1)} kWh expected.`
    : "Expected and actual daily output. No readings yet.";
}
