import { diagnosisLabel } from "./roof-card";
import type { LiveDecision } from "./types";

const CHIP: Record<string, string> = {
  healthy: "chip ok",
  smog: "chip b",
  dust: "chip a",
  fault: "chip bad",
};

const ACTION: Record<string, string> = {
  none: "No action",
  open_case: "Case filed",
  close_case: "Case closed",
  wait: "Waiting for the vendor",
};

/**
 * What the agent decided, newest first. The reason is the interesting part: when
 * reasonSource is "agent" the sentence was written by Claude for that reading, not
 * chosen from a template.
 */
export function DecisionFeed({ decisions }: { decisions: LiveDecision[] }) {
  if (decisions.length === 0) {
    return <p className="muted">No decisions yet. They appear as readings arrive.</p>;
  }
  return (
    <ol className="live-feed">
      {decisions.map((d) => (
        <li key={`${d.systemId}-${d.date}`} className="live-feed-item">
          <div className="live-feed-head">
            <span className={CHIP[d.diagnosis ?? ""] ?? "chip"}>{diagnosisLabel(d.diagnosis)}</span>
            <span className="small muted">{d.systemId}</span>
            <span className="small muted">{d.date}</span>
            {d.reasonSource === "agent" ? (
              <span className="chip b live-written">Written by the agent</span>
            ) : (
              <span className="small faintish">From the rules</span>
            )}
          </div>
          <p className="live-reason">{d.reason}</p>
          <span className="small muted">{ACTION[d.action ?? ""] ?? d.action}</span>
        </li>
      ))}
    </ol>
  );
}
