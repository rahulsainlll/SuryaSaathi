import type { LiveCase } from "./types";

const STATUS: Record<string, { chip: string; label: string }> = {
  open: { chip: "chip", label: "Open" },
  filed: { chip: "chip a", label: "Filed with vendor" },
  escalated: { chip: "chip bad", label: "Escalated to DISCOM" },
  fixed: { chip: "chip b", label: "Fixed" },
  verified: { chip: "chip ok", label: "Verified" },
};

/** Every case the agent opened on the demo roofs, newest first. */
export function CasesTable({ cases }: { cases: LiveCase[] }) {
  if (cases.length === 0) {
    return (
      <p className="muted">
        No cases yet. One opens the first time a roof shows dust or a fault rather than smog.
      </p>
    );
  }
  return (
    <div className="live-table-wrap">
      <table className="live-table">
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Roof</th>
            <th scope="col">Cause</th>
            <th scope="col">Status</th>
            <th scope="col">Vendor deadline</th>
            <th scope="col">Message to the family</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const status = STATUS[c.status] ?? { chip: "chip", label: c.status };
            return (
              <tr key={c.caseId}>
                <th scope="row" className="live-mono">
                  {c.caseId}
                </th>
                <td className="live-mono">{c.systemId}</td>
                <td>{c.cause === "fault" ? "Inverter fault" : "Dust"}</td>
                <td>
                  <span className={status.chip}>{status.label}</span>
                </td>
                <td>{c.vendorDeadline ?? "—"}</td>
                <td className="live-msg">{c.familyMessage ?? <span className="muted">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
