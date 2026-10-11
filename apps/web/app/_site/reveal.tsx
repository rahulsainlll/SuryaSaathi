"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SELECTOR = ".site [data-reveal], .site .fade, .site .draw, .site [data-count]";
const COUNT_MS = 1200;

/**
 * Adds `in` to headings, fades and charts as they scroll into view, and counts figures up,
 * as the prototype does. The hero animates with CSS instead, so it never waits for this.
 */
export function RevealObserver() {
  const path = usePathname();

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(
      (el) => !el.classList.contains("in") && !el.classList.contains("hero-load"),
    );
    if (reduce) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const frames = new Set<number>();
    const countUp = (el: HTMLElement) => {
      const to = parseFloat(el.dataset.count ?? "0");
      const dec = Number(el.dataset.dec ?? 0);
      const suf = el.dataset.suffix ?? "";
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / COUNT_MS);
        el.textContent = (to * (1 - (1 - k) ** 3)).toFixed(dec) + suf;
        if (k < 1) frames.add(requestAnimationFrame(tick));
      };
      frames.add(requestAnimationFrame(tick));
    };
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.classList.add("in");
          if (el.dataset.count !== undefined) countUp(el);
          io.unobserve(el);
        }),
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      frames.forEach(cancelAnimationFrame);
    };
  }, [path]);

  return null;
}
