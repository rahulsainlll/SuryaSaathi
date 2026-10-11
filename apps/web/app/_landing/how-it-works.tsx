"use client";

import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, useState, type ComponentType, type SVGProps } from "react";
import { COLORS } from "./colors";
import { STEPS } from "./content";
import { AgentIcon, CheckIcon, CloudIcon, InverterIcon, LoggerIcon, RoofIcon } from "./icons";
import { VIEW, type Signature } from "./signatures";

const NODES: { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: "Roof", icon: RoofIcon },
  { label: "Inverter", icon: InverterIcon },
  { label: "Data source", icon: LoggerIcon },
  { label: "IoT Core", icon: CloudIcon },
  { label: "Agents", icon: AgentIcon },
];

/** Where each moment of the story sits in the section's scroll progress (0–1). */
const AT = {
  travel: [0.02, 0.24],
  // Days 0–21 of the engine's month draw over this range, so events land on their day.
  chart: [0.26, 0.9],
  diagnosis: 0.71, // day 15
  filed: 0.72,
  deadline: 0.79, // day 18
  escalated: 0.82,
  verified: 0.9, // day 21
  message: 0.94,
} as const;

/** Muted and bright text on the dark surface (both ≥ 4.5:1). */
const DIM = "#a3a0b3";
const BRIGHT = "#f4f3f8";

const EVENTS = [
  { at: AT.filed, text: "Case filed with the vendor, readings attached" },
  { at: AT.deadline, text: "3-day vendor deadline passes" },
  { at: AT.escalated, text: "Escalated to the DISCOM" },
  { at: AT.verified, text: "Fix verified from new readings: 96%" },
];

/**
 * Four steps on the left; on the right a visual that follows the scroll: a reading travels
 * to the agents, the chart fills, a case opens, escalates and is verified, and the family
 * gets one WhatsApp message.
 */
export function HowItWorks({ sig, message }: { sig: Signature; message: string }) {
  const container = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.25", "end 0.75"] });
  const done = useMotionValue(1);
  const progress = reduced ? done : scrollYProgress;
  const [active, setActive] = useState(reduced ? 3 : 0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!reduced) setActive(Math.min(3, Math.floor(p * 4)));
  });

  return (
    <div
      ref={container}
      className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14"
    >
      <div
        className={`z-10 lg:order-2 ${reduced ? "" : "sticky top-14 -mx-4 bg-background px-4 pt-2 pb-3 sm:top-16 sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:flex lg:h-[calc(100dvh-8rem)] lg:items-center lg:bg-transparent lg:p-0"}`}
      >
        <Visual progress={progress} sig={sig} message={message} />
      </div>
      <ol className="relative lg:order-1">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            aria-current={!reduced && active === i ? "step" : undefined}
            className={`flex flex-col justify-center py-10 ${reduced ? "" : "min-h-[65vh] lg:min-h-[80vh]"}`}
          >
            <span className="text-sm font-semibold text-accent">Step {i + 1}</span>
            <h3
              className={`mt-2 text-2xl font-semibold transition-colors duration-300 sm:text-3xl ${active === i || reduced ? "text-foreground" : "text-muted"}`}
            >
              {s.title}
            </h3>
            <p className="mt-3 max-w-md text-lg text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Visual({
  progress,
  sig,
  message,
}: {
  progress: MotionValue<number>;
  sig: Signature;
  message: string;
}) {
  const travel = useTransform(progress, [...AT.travel], ["0%", "100%"]);
  const draw = useTransform(progress, [...AT.chart], [0, 1]);
  const diagnosis = useTransform(progress, [AT.diagnosis, AT.diagnosis + 0.04], [0, 1]);
  const bubble = useTransform(progress, [AT.message, AT.message + 0.05], [0, 1]);
  const bubbleY = useTransform(progress, [AT.message, AT.message + 0.05], [12, 0]);

  return (
    <div className="w-full rounded-3xl border border-separator bg-surface p-4 shadow-2xl shadow-black/30 sm:p-6">
      {/* 1. The reading travels from the roof to the agents. */}
      <div className="relative">
        <div className="absolute top-5 right-[10%] left-[10%] h-0.5 bg-separator">
          <motion.div className="h-full bg-accent" style={{ width: travel }} />
        </div>
        <ol className="relative grid grid-cols-5 gap-1">
          {NODES.map((n, i) => (
            <Node key={n.label} index={i} progress={progress} {...n} />
          ))}
        </ol>
      </div>

      {/* 2. Expected vs actual fills in; the widening gap gives dust away. */}
      <div className="relative mt-5 rounded-2xl bg-surface-secondary p-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Expected vs actual, kWh per day</span>
          <motion.span style={{ opacity: diagnosis }} className="font-semibold text-warning">
            Diagnosis: dust
          </motion.span>
        </div>
        <svg
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          className="mt-2 h-auto w-full overflow-visible"
          aria-hidden="true"
        >
          <motion.path
            d={sig.expected}
            fill="none"
            stroke={COLORS.expected}
            strokeWidth="3"
            strokeDasharray="8 7"
            style={{ opacity: draw }}
          />
          <motion.path
            d={sig.actual}
            fill="none"
            stroke={COLORS.actual}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pathLength: draw }}
          />
        </svg>
      </div>

      {/* 3. The case: filed, deadline, escalation, verification. */}
      <div className="relative">
        <ol className="mt-4 space-y-1.5 text-sm" aria-label="Case timeline">
          {EVENTS.map((e) => (
            <Event key={e.text} progress={progress} {...e} />
          ))}
        </ol>

        {/* 4. The family's one message (over the finished timeline on phones). */}
        <motion.p
          lang="hi"
          style={{ opacity: bubble, y: bubbleY }}
          className="absolute inset-x-0 bottom-0 rounded-2xl rounded-bl-sm bg-[#1f6f4a] px-3 py-2 text-xs leading-snug text-white shadow-lg motion-reduce:relative motion-reduce:mt-3 sm:relative sm:mt-3 sm:text-sm"
        >
          <span className="mb-0.5 block text-[11px] font-semibold text-white" lang="en">
            WhatsApp · SuryaSaathi
          </span>
          {message}
        </motion.p>
      </div>
    </div>
  );
}

function Node({
  label,
  icon: Icon,
  index,
  progress,
}: {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  index: number;
  progress: MotionValue<number>;
}) {
  const at = AT.travel[0] + ((AT.travel[1] - AT.travel[0]) * index) / (NODES.length - 1);
  const color = useTransform(progress, [at - 0.02, at], [DIM, BRIGHT]);
  const iconColor = useTransform(progress, [at - 0.02, at], [DIM, COLORS.actual]);
  return (
    <motion.li style={{ color }} className="flex flex-col items-center gap-1.5 text-center">
      <motion.span
        style={{ color: iconColor }}
        className="flex size-10 items-center justify-center rounded-xl border border-separator bg-surface-secondary"
      >
        <Icon className="size-5" />
      </motion.span>
      <span className="text-[11px] leading-tight sm:text-xs">{label}</span>
    </motion.li>
  );
}

function Event({
  at,
  text,
  progress,
}: {
  at: number;
  text: string;
  progress: MotionValue<number>;
}) {
  const color = useTransform(progress, [at - 0.03, at], [DIM, BRIGHT]);
  const scale = useTransform(progress, [at - 0.03, at], [0, 1]);
  return (
    <motion.li style={{ color }} className="flex items-center gap-2">
      <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full border border-separator">
        <motion.span
          style={{ scale }}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-accent text-[#14121C]"
        >
          <CheckIcon className="size-3.5" strokeWidth={3} />
        </motion.span>
      </span>
      {text}
    </motion.li>
  );
}
