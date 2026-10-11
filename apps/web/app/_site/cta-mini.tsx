"use client";

import { useEffect, useRef } from "react";

const CHIPS = [
  { label: "Dust found", tone: "b" },
  { label: "Claim filed", tone: "a" },
  { label: "Deadline missed", tone: "bad" },
  { label: "Escalated", tone: "bad" },
  { label: "Verified · 96%", tone: "ok" },
];
const LOOP_MS = 7000;

/** The CTA's preview: the month's chart draws in and the case chips light up, on a loop. */
export function CtaMini() {
  const box = useRef<HTMLDivElement>(null);
  const reveal = useRef<SVGGElement>(null);
  const chips = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const show = (k: number) => {
      const w = Math.min(1, k / 0.45);
      if (reveal.current)
        reveal.current.style.clipPath = `inset(0 ${((1 - w) * 100).toFixed(2)}% 0 0)`;
      chips.current.forEach((c, i) => c?.classList.toggle("on", k > 0.3 + i * 0.1));
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show(1);
      return;
    }
    let frame = 0;
    let t0 = 0;
    const loop = (now: number) => {
      if (!t0) t0 = now;
      show(((now - t0) % LOOP_MS) / LOOP_MS);
      frame = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(frame);
      if (e?.isIntersecting) frame = requestAnimationFrame(loop);
    });
    if (box.current) io.observe(box.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="cta-r" ref={box} aria-label="Preview of the demo">
      <div className="mini">
        <div className="top" style={{ marginBottom: 8 }}>
          <span>3 kW · Dwarka</span>
          <span className="chip">Simulated</span>
        </div>
        <svg viewBox="0 0 320 120" aria-hidden="true">
          <g ref={reveal} style={{ clipPath: "inset(0 100% 0 0)" }}>
            <polyline
              points="10,30 60,28 110,31 160,29 210,32 260,30 310,29"
              fill="none"
              stroke="var(--blue)"
              strokeWidth="3"
              strokeDasharray="8 6"
              strokeLinecap="round"
            />
            <polyline
              points="10,36 60,46 110,58 160,70 200,82 214,38 260,36 310,35"
              fill="none"
              stroke="#F5A524"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
      <div className="case-row">
        {CHIPS.map((c, i) => (
          <span
            key={c.label}
            ref={(el) => {
              chips.current[i] = el;
            }}
            className={`chip ${c.tone}`}
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
