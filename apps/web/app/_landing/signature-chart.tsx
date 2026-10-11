"use client";

import { motion, useReducedMotion } from "motion/react";
import { COLORS } from "./colors";
import { VIEW, type Signature } from "./signatures";

/** A cause's mini chart; it draws itself the first time it scrolls into view. */
export function SignatureChart({ sig, label }: { sig: Signature; label: string }) {
  const reduced = useReducedMotion();
  const reveal = (from: { pathLength: number } | { opacity: number }, delay: number) =>
    reduced
      ? { initial: false as const }
      : {
          initial: from,
          whileInView: "pathLength" in from ? { pathLength: 1 } : { opacity: 1 },
          viewport: { once: true, amount: 0.6 },
          transition: { duration: 1.4, delay, ease: "easeInOut" as const },
        };
  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label={label}
    >
      <line
        x1={sig.markerX}
        x2={sig.markerX}
        y1="0"
        y2={VIEW.height}
        stroke="var(--border)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      {/* The dashed expected line fades in (a drawn path can't keep its dashes). */}
      <motion.path
        d={sig.expected}
        fill="none"
        stroke={COLORS.expected}
        strokeWidth="3"
        strokeDasharray="8 7"
        strokeLinecap="round"
        {...reveal({ opacity: 0 }, 0)}
      />
      <motion.path
        d={sig.actual}
        fill="none"
        stroke={COLORS.actual}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...reveal({ pathLength: 0 }, 0.2)}
      />
    </svg>
  );
}
