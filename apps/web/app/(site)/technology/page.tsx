import type { Metadata } from "next";
import { REPO } from "../../_site/content";
import { Layers } from "../../_site/layers";
import { delay, RevealHeading } from "../../_site/words";

export const metadata: Metadata = {
  title: "Technology · SuryaSaathi",
  description:
    "Serverless, end to end, on AWS: IoT Core, Lambda, Strands Agents on Amazon Bedrock, Step Functions, DynamoDB, Cedar and more, all defined in AWS CDK.",
};

const LAYERS = [
  { name: "Ingest", services: ["AWS IoT Core", "EventBridge", "End User Messaging Social"] },
  {
    name: "Agents",
    services: ["AWS Lambda", "Strands Agents", "Amazon Bedrock", "Amazon Transcribe"],
  },
  { name: "Memory & rules", services: ["DynamoDB", "Amazon S3", "OpenSearch", "Cedar"] },
  {
    name: "Act & report",
    services: ["Step Functions", "SES + SNS", "Amplify", "Cognito (demo sign-in)", "CloudWatch"],
  },
];

const OPEN_SOURCE = [
  ["Strands Agents", "Runs the diagnosis, accountability and messenger agents."],
  ["Cedar", "Consent and access checked before every agent tool call."],
  ["OpenSearch", "Searchable inverter manuals and fault codes."],
  ["AWS CDK", "The whole stack as code; one command deploys it."],
  ["FreeRTOS", "Runs on the camera-clip hardware."],
];

const WHY = [
  [
    "AWS IoT Core",
    "Per-device certificates; scales to millions of devices; routes messages without servers.",
  ],
  ["Amazon Bedrock", "Agent reasoning, reading screen photos, and messages in Hindi and English."],
  [
    "AWS Step Functions",
    "Waits days for a vendor at near-zero cost, with a visual audit trail per case.",
  ],
  ["Amazon DynamoDB", "Millisecond lookups by system ID at any scale; old raw readings age out."],
  ["Amazon EventBridge", "Daily expected-output runs, connector pulls and nightly rollups."],
  ["End User Messaging Social", "WhatsApp in and out, connected directly to AWS."],
];

export default function Technology() {
  return (
    <>
      <section className="hero page">
        <div className="wrap stack g20">
          <span className="eyebrow">Technology</span>
          <RevealHeading as="h1" className="h1 page hero-load">
            Serverless, end to end, on AWS.
          </RevealHeading>
          <p className="lead fade hero-load" style={{ maxWidth: 660 }}>
            Four layers, one reading&apos;s path. Idle costs stay near zero, and a nightly rollup
            means the DISCOM console never scans raw readings.
          </p>
        </div>
      </section>

      <section style={{ padding: "24px 0 104px" }}>
        <div className="wrap grid c2" style={{ gap: 24, alignItems: "start" }}>
          <Layers layers={LAYERS} />
          <div className="card stack g16 fade">
            <span className="eyebrow">AWS open source</span>
            <div className="stack g12">
              {OPEN_SOURCE.map(([name, text]) => (
                <div key={name}>
                  <b>{name}</b>
                  <p className="muted small">{text}</p>
                </div>
              ))}
            </div>
            <a className="btn btn-ink self-start" href={REPO}>
              Read the code on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="s alt">
        <div className="wrap stack g28">
          <div className="stack g16" style={{ maxWidth: 680 }}>
            <span className="eyebrow">Why each service</span>
            <RevealHeading>Every service does one job</RevealHeading>
          </div>
          <div className="grid c3">
            {WHY.map(([name, text]) => (
              <div className="card stack g8 fade" key={name}>
                <b>{name}</b>
                <p className="muted small">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap grid c2" style={{ gap: 48, alignItems: "center" }}>
          <div className="stack g16">
            <span className="eyebrow">Hardware</span>
            <RevealHeading>A camera clip for roofs with nothing</RevealHeading>
            <p className="lead fade">
              An ESP32-CAM on FreeRTOS, clipped by the vendor in front of the inverter, photographs
              the screen every hour. Bedrock reads the numbers. It works with any brand and never
              touches the wiring.
            </p>
          </div>
          <div className="card fade" style={{ padding: 32, ...delay(0) }}>
            <svg
              viewBox="0 0 440 220"
              role="img"
              aria-label="A small camera module clipped onto an inverter screen"
              style={{ width: "100%", height: "auto" }}
            >
              <rect
                x="90"
                y="40"
                width="240"
                height="160"
                rx="18"
                fill="var(--soft)"
                stroke="var(--line)"
                strokeWidth="3"
              />
              <rect
                x="122"
                y="70"
                width="176"
                height="70"
                rx="8"
                fill="color-mix(in srgb,#8B7CF6 25%,var(--soft))"
              />
              <text x="140" y="112" fontFamily="var(--mono)" fontSize="20" fill="var(--ink)">
                E-TODAY 9.1
              </text>
              <rect
                x="250"
                y="16"
                width="120"
                height="84"
                rx="14"
                fill="var(--panel)"
                stroke="#F5A524"
                strokeWidth="4"
              />
              <circle cx="310" cy="58" r="22" fill="none" stroke="#F5A524" strokeWidth="6" />
              <circle cx="310" cy="58" r="8" fill="#F5A524" />
            </svg>
          </div>
        </div>
      </section>
    </>
  );
}
