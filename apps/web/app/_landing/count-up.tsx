"use client";

import { useEffect, useRef } from "react";

const DURATION_MS = 1400;

/**
 * A figure that counts up once when it scrolls into view. The server renders the final
 * value, so it reads correctly without JavaScript, with reduced motion, and to crawlers.
 */
export function CountUp({
  value,
  decimals,
  prefix,
  suffix,
}: {
  value: number;
  decimals: number;
  prefix: string;
  suffix: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen when the page loads: leave the final value alone.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.textContent = text(0);
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          el.textContent = text(value * (1 - (1 - t) ** 3));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = text(value);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per figure
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {text(value)}
    </span>
  );
}
