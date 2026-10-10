"use client";

import type { SimState } from "@suryasaathi/engine";
import { useEffect, useState, type ReactNode } from "react";
import { SOURCES } from "./sources";

interface PipelineProps {
  sim: SimState;
  lastStepAt: number | null;
  dayMs: number;
  reducedMotion: boolean;
}

/** How one reading travels from the roof to an action. Lights up node by node per reading. */
export function Pipeline({ sim, lastStepAt, dayMs, reducedMotion }: PipelineProps) {
  const lit = useLitNodes(lastStepAt, dayMs, reducedMotion);
  const source = SOURCES[sim.source];
  const today = sim.days.at(-1);
  const k = sim.activeCase;

  const nodes: { title: string; detail: string; icon: ReactNode }[] = [
    {
      title: "Rooftop panels",
      detail: `${sim.config.capacityKw} kW · dust ${Math.round(sim.soiling * 100)}%`,
      icon: <PanelIcon />,
    },
    {
      title: "Inverter",
      detail: !today
        ? "waiting for sunrise"
        : sim.faulty
          ? "fault: output collapsed"
          : `${today.actualKwh.toFixed(1)} kWh today`,
      icon: <InverterIcon />,
    },
    { title: source.device, detail: source.deviceDetail, icon: <ChipIcon /> },
    { title: source.cloud, detail: source.cloudDetail, icon: <CloudIcon /> },
    { title: "Agents", detail: "Strands + Bedrock compare with expected", icon: <SunIcon /> },
    {
      title: "Action",
      detail: !k
        ? today
          ? "nothing needed"
          : "nothing needed yet"
        : k.status === "filed"
          ? "complaint sent to vendor"
          : k.status === "escalated"
            ? "escalated to DISCOM"
            : "checking the fix",
      icon: <SendIcon />,
    },
  ];

  return (
    <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6" aria-label="Pipeline">
      {nodes.map((node, i) => {
        const on = lit.has(i);
        return (
          <li
            key={i}
            data-on={on || undefined}
            className="group relative flex min-h-28 flex-col gap-1.5 rounded-2xl border-2 border-separator p-3 transition-colors duration-200 motion-reduce:transition-none data-[on]:border-accent data-[on]:bg-accent-soft"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-default text-muted transition-colors duration-200 motion-reduce:transition-none group-data-[on]:bg-accent group-data-[on]:text-accent-foreground"
            >
              {node.icon}
            </span>
            <b className="text-sm leading-tight">{node.title}</b>
            <span className="text-xs leading-snug text-muted">{node.detail}</span>
            {i < nodes.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-1/2 -right-2.5 hidden h-0.5 w-2 bg-separator group-data-[on]:bg-accent lg:block"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Which nodes are lit: a wave across the pipeline after each reading, as in the prototype. */
function useLitNodes(lastStepAt: number | null, dayMs: number, reducedMotion: boolean) {
  const [lit, setLit] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => {
    if (lastStepAt === null) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const set = (update: (s: Set<number>) => void) =>
      setLit((prev) => {
        const next = new Set(prev);
        update(next);
        return next;
      });
    if (reducedMotion) {
      at(0, () => setLit(new Set([0, 1, 2, 3, 4, 5])));
      at(400, () => setLit(new Set()));
    } else {
      const per = Math.max(70, Math.min(180, dayMs / 12));
      for (let i = 0; i < 6; i++) {
        at(i * per, () => set((s) => s.add(i)));
        at(i * per + per * 3, () => set((s) => s.delete(i)));
      }
    }
    return () => {
      timers.forEach(clearTimeout);
      setLit(new Set());
    };
  }, [lastStepAt, dayMs, reducedMotion]);
  return lit;
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function PanelIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 18l3-12h12l3 12z" />
      <path d="M4.5 12h15M12 6v12" />
    </svg>
  );
}
function InverterIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <rect x="8" y="6" width="8" height="5" rx="1" />
    </svg>
  );
}
function ChipIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </svg>
  );
}
function CloudIcon() {
  return (
    <svg {...iconProps}>
      <path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg {...iconProps}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  );
}
