"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The AWS layers lighting up in sequence: a dot travels down the rail and each layer it
 * reaches turns amber, then the cycle restarts. Runs only while on screen; with reduced
 * motion all four stay lit.
 */
export function Layers({ layers }: { layers: { name: string; services: string[] }[] }) {
  const box = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const [lit, setLit] = useState(0);
  const [geo, setGeo] = useState<{ centres: number[]; rail: number } | null>(null);

  useEffect(() => {
    // The rail runs from 30px below the top to 30px above the bottom of the box.
    const measure = () =>
      setGeo({
        centres: items.current.map((l) => (l ? l.offsetTop + l.offsetHeight / 2 : 0)),
        rail: (box.current?.clientHeight ?? 60) - 60,
      });
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- final state for reduced motion
      setLit(layers.length - 1);
      return;
    }
    let timer: ReturnType<typeof setInterval> | null = null;
    let i = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !timer) {
          timer = setInterval(() => {
            i = (i + 1) % (layers.length + 1);
            setLit(i === layers.length ? -1 : i);
          }, 1300);
        } else if (!e?.isIntersecting && timer) {
          clearInterval(timer);
          timer = null;
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
    };
  }, [layers.length]);

  const c = geo?.centres ?? [];
  const at = Math.max(0, lit);
  const first = c[0] ?? 0;
  const rail = geo?.rail || 1;

  return (
    <div className="layers" ref={box}>
      <div className="rail">
        <i style={{ transform: `scaleY(${lit < 0 ? 0 : ((c[at] ?? first) - first) / rail})` }} />
      </div>
      <div
        className="ldot"
        style={{ transform: `translateY(${((c[at] ?? first) - 10).toFixed(1)}px)` }}
      />
      {layers.map((l, k) => (
        <div
          key={l.name}
          ref={(el) => {
            items.current[k] = el;
          }}
          className={`lay${k <= lit ? " on" : ""}`}
        >
          <b>{l.name}</b>
          <div className="svc">
            {l.services.map((s) => (
              <span className="chip" key={s}>
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
