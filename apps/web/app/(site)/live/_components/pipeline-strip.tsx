import type { LiveCounters } from "./types";

/**
 * The path one reading takes through AWS, with the live counters sitting on the step
 * that produced them. Every number here came back from the deployed backend.
 */
export function PipelineStrip({
  counters,
  model,
}: {
  counters: LiveCounters;
  model: { provider: string; modelId: string };
}) {
  const agentLabel =
    model.provider === "anthropic" ? `Strands agent · ${model.modelId}` : "Strands agent · Bedrock";
  const steps = [
    { name: "IoT Core", note: "MQTT from the roof", figure: null },
    { name: "Lambda", note: "normalise and store", figure: null },
    { name: "DynamoDB", note: "readings", figure: `${counters.readings} stored` },
    {
      name: agentLabel,
      note: "diagnosis and reason",
      figure: `${counters.agentDecisions} written`,
    },
    { name: "Step Functions", note: "case workflow", figure: `${counters.casesOpened} cases` },
    { name: "SES", note: "vendor and DISCOM", figure: `${counters.casesVerified} verified` },
  ];

  return (
    <ol className="live-pipe" aria-label="How a reading travels through AWS">
      {steps.map((step, i) => (
        <li key={step.name} className="live-pipe-step">
          <div className="live-pipe-body">
            <span className="live-pipe-name">{step.name}</span>
            <span className="small muted">{step.note}</span>
            {step.figure ? <span className="chip a live-pipe-figure">{step.figure}</span> : null}
          </div>
          {i < steps.length - 1 ? (
            <span className="live-pipe-arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
