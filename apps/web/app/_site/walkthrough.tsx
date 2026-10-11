"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    title: "Every roof reports itself",
    text: "A DISCOM data logger, the inverter's cloud or a camera clip sends yesterday's reading to AWS IoT Core. The family does nothing.",
  },
  {
    title: "Compared with what the sun allowed",
    text: "Satellite sunlight and haze for that exact roof and day give the output it should have made.",
  },
  {
    title: "Smog, dust or fault, told apart",
    text: "Smog drops both lines together. Dust widens the gap every dry day. A fault collapses output overnight.",
  },
  {
    title: "Claimed, chased, verified",
    text: "A free-maintenance claim goes to the vendor with evidence. Miss the deadline and the DISCOM steps in. When output recovers, the family hears once.",
  },
];

const NODES = [
  ["Rooftop", "3 kW · Dwarka"],
  ["Inverter", "9.1 kWh today"],
  ["Data logger", "every 15 min"],
  ["AWS IoT Core", "MQTT over TLS"],
  ["Agents", "Strands + Bedrock"],
];

const VERDICTS = [
  { name: "Smog in the air", why: "Already counted in “expected”", hit: false },
  { name: "Inverter fault", why: "No fault code, no sudden drop", hit: false },
  { name: "Dust on panels", why: "Gap widens every dry day; rain reset it", hit: true },
];

const TIMELINE = [
  ["Complaint sent to the vendor", "Chart, readings and ₹ lost attached"],
  ["Deadline missed", "No visit within 3 days"],
  ["Escalated to the DISCOM", "Full case file, automatically"],
  ["Fix verified from new readings", "Performance back to 96%"],
];
const TL_AT = [0.08, 0.28, 0.48, 0.68];

// Fourteen days of expected and actual, as in the prototype.
const EXP = [118, 112, 116, 113, 120, 115, 111, 117, 114, 121, 115, 117, 113, 116].map(
  (v) => v * 1.25 - 112,
);
const ACT = [170, 120, 126, 128, 140, 140, 144, 156, 156, 170, 168, 176, 180, 188].map(
  (v) => v * 1.25 - 112,
);
const pts = (a: number[]) => a.map((y, i) => `${20 + i * 37},${y.toFixed(1)}`).join(" ");

const clamp = (v: number) => Math.max(0, Math.min(1, v));

interface View {
  step: number;
  /** Progress within the step, 0–1. */
  lp: number;
}

/**
 * The scroll-driven walkthrough: a 440vh section whose sticky panel stays pinned through
 * all four steps. Nothing above it may clip overflow, or sticky stops working.
 */
export function Walkthrough() {
  const section = useRef<HTMLElement>(null);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const ndot = useRef<HTMLDivElement>(null);
  const railFill = useRef<HTMLElement>(null);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const reveal = useRef<SVGGElement>(null);
  const perf = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>({ step: 0, lp: 0 });
  const [reduced, setReduced] = useState(false);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the preference once
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const update = (p: number) => {
    const step = Math.min(3, Math.floor(p * 4));
    const lp = clamp(p * 4 - step);
    const bar = bars.current[step];
    if (bar) bar.style.transform = `scaleX(${lp})`;
    if (step === 0) {
      const n = nodes.current;
      const centre = (el: HTMLDivElement | null | undefined) =>
        el ? el.offsetTop + el.offsetHeight / 2 : 0;
      const a = centre(n[0]);
      const b = centre(n[4]);
      const y = a + (b - a) * Math.min(1, lp * 1.15);
      if (ndot.current) ndot.current.style.transform = `translateY(${(y - 10).toFixed(1)}px)`;
      const rail = railFill.current?.parentElement;
      if (railFill.current && rail)
        railFill.current.style.transform = `scaleY(${clamp((y - a) / rail.clientHeight)})`;
      n.forEach((el) => el?.classList.toggle("on", centre(el) <= y + 2));
    }
    if (step === 1) {
      const k = Math.min(1, lp * 1.2);
      if (reveal.current)
        reveal.current.style.clipPath = `inset(0 ${((1 - k) * 100).toFixed(2)}% 0 0)`;
      if (perf.current) perf.current.textContent = `${Math.round(100 - 22 * k)}%`;
    }
    setView((v) => (v.step === step && Math.abs(v.lp - lp) < 0.02 ? v : { step, lp }));
  };

  useMotionValueEvent(scrollYProgress, "change", update);
  useEffect(() => {
    // Place the panel for wherever the page loaded (e.g. a refresh mid-section).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs with the scroll position once
    update(scrollYProgress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  const { step, lp } = view;
  const caseState =
    lp > 0.68 ? "Verified" : lp > 0.48 ? "Escalated" : lp > 0.28 ? "Overdue" : "Filed";
  const caseTone = lp > 0.68 ? "ok" : lp > 0.28 ? "bad" : "b";

  return (
    <section className="how" ref={section}>
      <div className="sticky">
        <div className="wrap" style={{ width: "100%" }}>
          <div className="how-grid">
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className={`step${i === step ? " on" : ""}`}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span className="num">{i + 1}</span>
                  <div>
                    <h2 className="as-h3">{s.title}</h2>
                    <p>{s.text}</p>
                    <div className="bar">
                      <i
                        ref={(el) => {
                          bars.current[i] = el;
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div
              className="stage"
              role="img"
              aria-label={`Step ${step + 1}: ${STEPS[step]!.title}`}
            >
              <div className={`layer${step === 0 ? " on" : ""}`}>
                <div className="top">
                  <span>One reading, 12 Oct</span>
                  <span className="chip">Simulated</span>
                </div>
                <div className="nodes">
                  <div className="rail">
                    <i ref={railFill} />
                  </div>
                  <div className="ndot" ref={ndot} />
                  {NODES.map(([name, detail], i) => (
                    <div
                      key={name}
                      className="node"
                      ref={(el) => {
                        nodes.current[i] = el;
                      }}
                    >
                      <b>{name}</b>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`layer${step === 1 ? " on" : ""}`}>
                <div className="top">
                  <span>Expected vs actual, 14 days</span>
                  <span className="chip">Simulated</span>
                </div>
                <div className="chart">
                  <svg viewBox="0 0 520 200" aria-hidden="true">
                    <rect
                      x="36"
                      y="8"
                      width="26"
                      height="186"
                      rx="6"
                      fill="var(--blue)"
                      opacity=".1"
                    />
                    <g ref={reveal} style={{ clipPath: "inset(0 100% 0 0)" }}>
                      <polyline
                        points={pts(EXP)}
                        fill="none"
                        stroke="var(--blue)"
                        strokeWidth="3.5"
                        strokeDasharray="9 7"
                        strokeLinecap="round"
                      />
                      <polyline
                        points={pts(ACT)}
                        fill="none"
                        stroke="#F5A524"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </svg>
                </div>
                <div className="kv">
                  <div>
                    <small>Should have made</small>
                    <strong>11.6</strong>
                  </div>
                  <div>
                    <small>Made</small>
                    <strong>9.1</strong>
                  </div>
                  <div>
                    <small>Performance</small>
                    <strong ref={perf}>100%</strong>
                  </div>
                </div>
              </div>

              <div className={`layer${step === 2 ? " on" : ""}`}>
                <div className="top">
                  <span>What the agent checked</span>
                  <span className="chip">Simulated</span>
                </div>
                {VERDICTS.map((v, i) => (
                  <div
                    key={v.name}
                    className={`verdict${v.hit ? " hit" : ""}${step === 2 && (reduced || lp > 0.12 + i * 0.28) ? " on" : ""}`}
                  >
                    <div>
                      <b>{v.name}</b>
                      <span className="why">{v.why}</span>
                    </div>
                    <span className={`chip${v.hit ? " a" : ""}`}>
                      {v.hit ? "Diagnosed" : "Ruled out"}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`layer${step === 3 ? " on" : ""}`}>
                <div className="top">
                  <span>Case SS-0142 · free cleaning</span>
                  <span className={`chip ${step === 3 ? caseTone : "b"}`}>
                    {step === 3 ? caseState : "Filed"}
                  </span>
                </div>
                <ol className="tl">
                  {TIMELINE.map(([title, detail], i) => {
                    const on = step === 3 && lp > TL_AT[i]!;
                    return (
                      <li key={title} className={on ? (i === 1 ? "warn" : "done") : undefined}>
                        <span className="b" />
                        <div>
                          <b>{title}</b>
                          <span>{detail}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <div className={`wa${step === 3 && lp > 0.82 ? " on" : ""}`} lang="hi">
                  <small lang="en">The only message the family gets</small>
                  आपके panels पर धूल थी। हमने मुफ्त सफाई करवा दी। Output वापस 96% पर है।
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
