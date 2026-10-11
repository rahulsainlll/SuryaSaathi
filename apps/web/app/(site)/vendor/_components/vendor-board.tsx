"use client";

import { useEffect, useState } from "react";
import { CasesTable } from "../../live/_components/cases-table";
import { liveConfig } from "../../live/_components/config";
import type { LivePayload } from "../../live/_components/types";

const OPEN = new Set(["open", "filed", "escalated"]);

/**
 * What a vendor owes: the cases still waiting on a visit, then the ones already closed.
 * It reads the same public endpoint as /live — the full vendor portal, with its own
 * sign-in and per-vendor scoping, is still to come.
 */
export function VendorBoard() {
  const [data, setData] = useState<LivePayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (!liveConfig.apiUrl) {
      setFailed(true);
      return;
    }
    fetch(liveConfig.apiUrl, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => !controller.signal.aborted && setFailed(true));
    return () => controller.abort();
  }, []);

  if (failed) {
    return (
      <div className="card stack g12">
        <h2 className="as-h3">The backend is offline</h2>
        <p className="muted">Nothing to show just now. The rest of the site still works.</p>
      </div>
    );
  }
  if (!data) return <div className="live-skel live-skel-card" aria-busy="true" />;

  const open = data.cases.filter((c) => OPEN.has(c.status));
  const closed = data.cases.filter((c) => !OPEN.has(c.status));

  return (
    <div className="stack g40">
      <div className="stack g16">
        <h2 className="as-h3">Waiting on you ({open.length})</h2>
        <p className="muted small">
          Each one was opened by the agent with the readings behind it. Free maintenance is owed for
          five years from installation.
        </p>
        <CasesTable cases={open} />
      </div>
      <div className="stack g16">
        <h2 className="as-h3">Closed ({closed.length})</h2>
        <CasesTable cases={closed} />
      </div>
    </div>
  );
}
