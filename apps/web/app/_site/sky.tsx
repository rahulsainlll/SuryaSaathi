"use client";

import { useMotionValueEvent, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Idle after this long without a pointer, the sun drifts on its own. */
const IDLE_MS = 2500;

/**
 * The footer's sky: the sun follows the pointer on a spring along its arc, and the readout
 * shows what a 3 kW roof would make at that time of day. Decorative; it only animates
 * while visible, and with reduced motion it jumps straight to the pointer.
 */
export function Sky() {
  const sky = useRef<HTMLDivElement>(null);
  const sun = useRef<HTMLDivElement>(null);
  const kw = useRef<HTMLSpanElement>(null);
  const tod = useRef<HTMLSpanElement>(null);
  const meter = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // Matches the prototype's per-frame spring (vel += Δ·0.06; vel *= 0.8 at 60 fps).
  const pos = useSpring(0.5, { stiffness: 216, damping: 14, mass: 1 });
  const lastMove = useRef(-Infinity);
  const [touch, setTouch] = useState(false);

  const render = (t: number) => {
    const el = sky.current;
    if (!el) return;
    const W = el.clientWidth;
    const H = el.clientHeight;
    // The dashed arc: a quadratic curve from (30,300) via (500,-60) to (970,300) in a 1000×300 box.
    const yv = (1 - t) * (1 - t) * 300 + 2 * (1 - t) * t * -60 + t * t * 300;
    const x = W * (0.03 + 0.94 * t);
    const y = (H * yv) / 300;
    if (sun.current) sun.current.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    const h = Math.max(0, Math.sin(Math.PI * t));
    const out = 3 * h ** 1.3;
    if (kw.current) kw.current.textContent = out.toFixed(1);
    if (meter.current) meter.current.style.transform = `scaleX(${(out / 3).toFixed(3)})`;
    el.style.setProperty("--out", (0.15 + 0.85 * h).toFixed(3));
    el.style.setProperty("--warm", (1 - h).toFixed(3));
    const mins = Math.round((6 + 12 * t) * 60);
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    if (tod.current)
      tod.current.textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "pm" : "am"}`;
  };

  useMotionValueEvent(pos, "change", render);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device once
    setTouch(matchMedia("(hover: none)").matches);
    render(pos.get());
    const onResize = () => render(pos.get());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- render reads refs only
  }, []);

  // Idle drift, only while the sky is on screen.
  useEffect(() => {
    if (reduce) return;
    const el = sky.current;
    if (!el) return;
    let frame = 0;
    const loop = (now: number) => {
      if (now - lastMove.current > IDLE_MS) pos.set(0.5 + 0.4 * Math.sin(now / 3400));
      frame = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(frame);
      if (e?.isIntersecting) frame = requestAnimationFrame(loop);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [reduce, pos]);

  const follow = (clientX: number) => {
    const el = sky.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = Math.max(0.03, Math.min(0.97, (clientX - r.left) / r.width));
    lastMove.current = performance.now();
    if (reduce) pos.jump(t);
    else pos.set(t);
  };

  return (
    <div
      className="sky"
      ref={sky}
      role="group"
      aria-label="Interactive: move across the sky to move the sun and see this roof's output"
      onPointerMove={(e) => follow(e.clientX)}
      onPointerDown={(e) => follow(e.clientX)}
    >
      <svg className="arc" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M30 300 Q500 -60 970 300"
          fill="none"
          stroke="var(--line)"
          strokeWidth="2"
          strokeDasharray="6 8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="sun" ref={sun} />
      <div className="roofs" aria-hidden="true">
        {[0, 1, 2].map((h) => (
          <div className="house" key={h}>
            <div className="arr">
              {Array.from({ length: 8 }, (_, i) => (
                <span className="pn" key={i} />
              ))}
            </div>
            <div className="wall" />
          </div>
        ))}
      </div>
      <div className="readout" aria-live="off">
        <span className="lbl">
          Live output · <span ref={tod}>12:00 pm</span>
        </span>
        <span className="k">
          <span ref={kw}>3.0</span>
          <small>kW of 3 kW</small>
        </span>
        <div className="meter">
          <i ref={meter} />
        </div>
        <p>
          {touch ? "Drag" : "Move"} across the sky. SuryaSaathi does this maths for every roof,
          every day: what the sun allowed, against what the roof made.
        </p>
      </div>
    </div>
  );
}
