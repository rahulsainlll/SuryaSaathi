import { Sparkline } from "./sparkline";
import type { Diagnosis, LiveSystem } from "./types";

const SOURCE_LABEL: Record<string, string> = {
  data_logger: "Data logger",
  inverter_cloud: "Inverter cloud",
  camera_clip: "Camera clip",
  whatsapp_photo: "WhatsApp photo",
};

const DIAGNOSIS_CHIP: Record<string, string> = {
  healthy: "chip ok",
  smog: "chip b",
  dust: "chip a",
  fault: "chip bad",
};

const DIAGNOSIS_LABEL: Record<string, string> = {
  healthy: "Healthy",
  smog: "Smog",
  dust: "Dust",
  fault: "Inverter fault",
};

export function diagnosisLabel(d: Diagnosis): string {
  return d ? (DIAGNOSIS_LABEL[d] ?? d) : "No reading yet";
}

/** "dwarka" is how the zone is stored; it is a place name on screen. */
function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * What the agent says about this roof when there is no fresh diagnosis. While a case is
 * open the agent waits rather than re-diagnosing, so `diagnosis` is null — showing "No
 * reading yet" there is wrong, and alarming next to a perfectly good percentage.
 */
function statusChip(system: LiveSystem): { chip: string; label: string } {
  if (system.diagnosis) {
    return {
      chip: DIAGNOSIS_CHIP[system.diagnosis] ?? "chip",
      label: diagnosisLabel(system.diagnosis),
    };
  }
  if (system.status === "open_case") return { chip: "chip a", label: "Case open" };
  if (system.latestReadingDate) return { chip: "chip", label: "Waiting on the vendor" };
  return { chip: "chip", label: "No reading yet" };
}

/** One rooftop: how it is doing today, and the last month of expected against actual. */
export function RoofCard({ system }: { system: LiveSystem }) {
  const points = system.series.filter((p) => p.actualKwh !== null && p.expectedKwh !== null);
  const performance = system.performance === null ? null : Math.round(system.performance * 100);
  const status = statusChip(system);
  const summary = `${system.systemId}: ${
    performance === null ? "no reading yet" : `${performance}% of expected`
  }, ${status.label.toLowerCase()}. Expected against actual kWh over ${points.length} days.`;

  return (
    <article className="card stack g12 live-roof">
      <div className="live-roof-head">
        <div className="stack g8">
          <span className="eyebrow">{titleCase(system.zone ?? "Delhi")}</span>
          <h3 className="as-h3">{system.systemId}</h3>
        </div>
        <span className={`${status.chip} live-pill`}>{status.label}</span>
      </div>

      <div className="live-figures">
        <div>
          <span className="live-figure">{performance === null ? "—" : `${performance}%`}</span>
          <span className="small muted">of expected</span>
        </div>
        <div>
          <span className="live-figure-sm">
            {system.actualKwh === null ? "—" : system.actualKwh.toFixed(1)}
          </span>
          <span className="small muted">kWh made</span>
        </div>
        <div>
          <span className="live-figure-sm">
            {system.expectedKwh === null ? "—" : system.expectedKwh.toFixed(1)}
          </span>
          <span className="small muted">kWh expected</span>
        </div>
      </div>

      {points.length > 1 ? (
        <Sparkline points={points} label={summary} />
      ) : (
        <p className="small muted">Not enough readings yet to draw a month.</p>
      )}

      <p className="small muted">
        {SOURCE_LABEL[system.dataSource ?? ""] ?? "Data logger"}
        {system.latestReadingDate ? ` · reading for ${system.latestReadingDate}` : ""}
      </p>
    </article>
  );
}
