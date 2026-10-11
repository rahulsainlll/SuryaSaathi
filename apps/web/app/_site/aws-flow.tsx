import Image from "next/image";
import type { CSSProperties } from "react";

/** Seconds for the dot to cross all five stages. */
const CYCLE = 7;

const STAGES: {
  title: string;
  text: string;
  icons: { file: string; name: string }[];
  badge?: string;
}[] = [
  {
    title: "Every roof reports",
    text: "Readings over MQTT, or pulled once a day",
    icons: [
      { file: "AWSIoTCore", name: "AWS IoT Core" },
      { file: "AmazonEventBridge", name: "Amazon EventBridge" },
    ],
  },
  {
    title: "Compare",
    text: "What the roof made against what the sun allowed",
    icons: [{ file: "AWSLambda", name: "AWS Lambda" }],
  },
  {
    title: "Diagnose",
    text: "Smog, dust or a fault, explained in plain words",
    icons: [{ file: "AmazonBedrock", name: "Amazon Bedrock" }],
    badge: "Strands",
  },
  {
    title: "Chase",
    text: "Claim, deadline, escalation, verified fix",
    icons: [{ file: "AWSStepFunctions", name: "AWS Step Functions" }],
  },
  {
    title: "Tell",
    text: "The vendor, the DISCOM, and one WhatsApp home",
    icons: [
      { file: "AWSEndUserMessaging", name: "AWS End User Messaging" },
      { file: "AmazonSimpleEmailService", name: "Amazon SES" },
    ],
  },
];

const MEMORY: { file?: string; name: string; text: string }[] = [
  { file: "AmazonDynamoDB", name: "DynamoDB", text: "Readings and cases" },
  { file: "AmazonSimpleStorageService", name: "Amazon S3", text: "Photos and evidence" },
  { name: "Cedar", text: "Consent before every tool call" },
  { file: "AmazonCloudWatch", name: "CloudWatch", text: "Every decision logged" },
];

/**
 * How one reading moves through the AWS stack: five stages with their services, a dot that
 * travels across and lights each stage as it passes, and the memory and rules every stage
 * uses underneath. CSS only (transform and opacity); with reduced motion every stage is lit.
 */
export function AwsFlow() {
  return (
    <div className="flow fade" style={{ ["--cycle" as string]: `${CYCLE}s` } as CSSProperties}>
      <div className="flow-body">
        <div className="flow-track" aria-hidden="true">
          <div className="flow-runner">
            <span className="flow-dot" />
          </div>
        </div>
        <ol className="flow-steps">
          {STAGES.map((s, i) => (
            <li
              key={s.title}
              className="fs"
              style={
                { ["--at" as string]: `${(i * CYCLE) / (STAGES.length - 1)}s` } as CSSProperties
              }
            >
              <span className="fs-tile">
                {s.icons.map((icon) => (
                  <Image
                    key={icon.file}
                    unoptimized
                    src={`/aws/${icon.file}.svg`}
                    alt={icon.name}
                    title={icon.name}
                    width={36}
                    height={36}
                  />
                ))}
                {s.badge && <span className="fs-badge">{s.badge}</span>}
              </span>
              <span className="fs-text">
                <b>{s.title}</b>
                <small>{s.text}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flow-mem">
        <span className="flow-mem-label">Memory and rules, under every step</span>
        <ul>
          {MEMORY.map((m) => (
            <li key={m.name}>
              {m.file ? (
                <Image unoptimized src={`/aws/${m.file}.svg`} alt="" width={28} height={28} />
              ) : (
                <span className="fs-badge small" aria-hidden="true">
                  C
                </span>
              )}
              <span>
                <b>{m.name}</b>
                <small>{m.text}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
