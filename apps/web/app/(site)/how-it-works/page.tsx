import type { Metadata } from "next";
import { Walkthrough } from "../../_site/walkthrough";
import { delay, RevealHeading } from "../../_site/words";

export const metadata: Metadata = {
  title: "How it works · SuryaSaathi",
  description:
    "Follow one reading from a 3 kW roof in Dwarka, through the diagnosis, to the family's single WhatsApp message.",
};

const RULES = [
  {
    name: "Performance",
    text: "Actual ÷ expected, where expected already includes that day's haze.",
    chip: "Measure",
    tone: "",
  },
  {
    name: "Smog",
    text: "Expected is low but performance stays above 90%.",
    chip: "No action",
    tone: "",
  },
  {
    name: "Dust",
    text: "3-day average below 91% and falling over 5 dry days. Closes itself if rain restores it.",
    chip: "Claim cleaning",
    tone: "a",
  },
  {
    name: "Fault",
    text: "Performance below 60% overnight, or the inverter reports a fault code.",
    chip: "Claim repair",
    tone: "a",
  },
  {
    name: "Verified fix",
    text: "Performance back above 93% after the visit.",
    chip: "Close case",
    tone: "ok",
  },
];

const SOURCES = [
  {
    tag: "New Delhi roofs",
    tone: "b",
    name: "Data logger",
    text: "Fitted by the DISCOM at installation; reads the inverter every 15 minutes.",
  },
  {
    tag: "WiFi inverters",
    tone: "b",
    name: "Inverter cloud",
    text: "The maker's cloud API, pulled once a day with the family's consent.",
  },
  {
    tag: "Any roof, any age",
    tone: "b",
    name: "Camera clip",
    text: "An ESP32-CAM on FreeRTOS photographs the inverter screen. No wiring touched.",
  },
  {
    tag: "Fallback",
    tone: "",
    name: "WhatsApp photo",
    text: "The family sends a picture of the screen; Amazon Bedrock reads the numbers.",
  },
];

const FAMILY = [
  ["Vendor installs, QR sticker on the inverter", "Consent recorded once"],
  ["Readings arrive every day", "The family does nothing"],
  ["Problem found, claim filed, fix verified", "All automatic"],
  ["One WhatsApp message, in Hindi", "Plus a monthly money report"],
];

const DISCOM = [
  ["Open the console", "Health and ₹ being lost, by zone"],
  ["Check the vendor leaderboard", "Who's slow, who's overdue"],
  ["Work the escalation queue", "Readings, chart and notices attached"],
  ["Act on repeat offenders", "Under rules that already allow it"],
];

function Flow({ items }: { items: string[][] }) {
  return (
    <ol className="tl" style={{ marginTop: 6 }}>
      {items.map(([title, detail]) => (
        <li className="done" key={title}>
          <span className="b" />
          <div>
            <b>{title}</b>
            <span>{detail}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorks() {
  return (
    <>
      <section className="hero page-tight">
        <div className="wrap stack g20">
          <span className="eyebrow">How it works</span>
          <RevealHeading as="h1" className="h1 page hero-load">
            From a reading on a roof to a fixed panel.
          </RevealHeading>
          <p className="lead fade hero-load" style={{ maxWidth: 640 }}>
            Scroll to follow one reading from a 3 kW roof in Dwarka, through the diagnosis, to the
            family&apos;s single WhatsApp message.
          </p>
        </div>
      </section>

      <Walkthrough />

      <section className="s">
        <div className="wrap stack g28">
          <div className="stack g16" style={{ maxWidth: 680 }}>
            <span className="eyebrow">Diagnosis rules · v1</span>
            <RevealHeading>Simple rules the agent can explain</RevealHeading>
            <p className="lead fade">
              The rules decide; the model explains each decision in plain words and acts through
              tools. Every decision is logged with its reason.
            </p>
          </div>
          <div className="rules fade">
            {RULES.map((r) => (
              <div className="rule" key={r.name}>
                <b>{r.name}</b>
                <span className="muted">{r.text}</span>
                <span className={`chip ${r.tone}`}>{r.chip}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s alt">
        <div className="wrap stack g28">
          <div className="stack g16" style={{ maxWidth: 680 }}>
            <span className="eyebrow">Works with any roof</span>
            <RevealHeading>No new hardware on most roofs</RevealHeading>
          </div>
          <div className="grid c4">
            {SOURCES.map((s, i) => (
              <article className="card stack g8 fade" key={s.name} style={delay(i * 100)}>
                <span className={`chip ${s.tone} self-start`}>{s.tag}</span>
                <h3>{s.name}</h3>
                <p className="muted small">{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap grid c2" style={{ gap: 24 }}>
          <article className="card stack g16 fade">
            <span className="eyebrow">The family&apos;s flow</span>
            <h3 style={{ fontSize: 26 }}>Consent once. Then only good news.</h3>
            <Flow items={FAMILY} />
          </article>
          <article className="card stack g16 fade" style={delay(120)}>
            <span className="eyebrow">The DISCOM&apos;s flow</span>
            <h3 style={{ fontSize: 26 }}>Cases arrive already investigated.</h3>
            <Flow items={DISCOM} />
          </article>
        </div>
      </section>
    </>
  );
}
