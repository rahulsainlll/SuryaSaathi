"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CasesTable } from "./cases-table";
import { liveConfig } from "./config";
import { DecisionFeed } from "./decision-feed";
import { PipelineStrip } from "./pipeline-strip";
import { RoofCard } from "./roof-card";
import type { LivePayload } from "./types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: LivePayload; at: number }
  | { kind: "empty"; message: string }
  | { kind: "offline"; message: string };

/** "4s ago", ticking once a second so the page visibly keeps time. */
function useSecondsSince(at: number | null): number | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (at === null) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [at]);
  return at === null ? null : Math.max(0, Math.round((Date.now() - at) / 1000));
}

export function LiveBoard() {
  const [state, setState] = useState<State>({ kind: "loading" });
  // Kept in a ref so a failed refresh can leave the last good data on screen.
  const lastGood = useRef<{ data: LivePayload; at: number } | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!liveConfig.apiUrl) {
      setState({
        kind: "offline",
        message: "This build has no NEXT_PUBLIC_LIVE_API set, so there is nothing to read.",
      });
      return;
    }
    try {
      const res = await fetch(liveConfig.apiUrl, { signal, cache: "no-store" });
      if (res.status === 503) {
        setState({
          kind: "empty",
          message:
            "The backend is up but has not rolled up any readings yet. The simulator may not have run.",
        });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LivePayload;
      if (data.systems.length === 0) {
        setState({ kind: "empty", message: "No demo rooftops are reporting yet." });
        return;
      }
      const at = Date.now();
      lastGood.current = { data, at };
      setState({ kind: "ready", data, at });
    } catch (err) {
      if (signal.aborted) return;
      // A blip should not blank a page someone is watching.
      if (lastGood.current) {
        setState({ kind: "ready", ...lastGood.current });
        return;
      }
      setState({
        kind: "offline",
        message: err instanceof Error ? err.message : "The backend could not be reached.",
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const id = setInterval(() => void load(controller.signal), liveConfig.refreshMs);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [load]);

  const age = useSecondsSince(state.kind === "ready" ? state.at : null);

  return (
    <>
      <section className="hero page-tight">
        <div className="wrap stack g20">
          <span className="eyebrow">
            <span className={`live-dot${state.kind === "ready" ? " on" : ""}`} aria-hidden="true" />
            Live from AWS
          </span>
          <h1 className="h1 page hero-load">What the agent is doing right now.</h1>
          <p className="lead fade hero-load" style={{ maxWidth: 660 }}>
            This page reads the deployed backend directly: real AWS services, real agent decisions,
            refreshed every {liveConfig.refreshMs / 1000} seconds.
          </p>
          <div className="live-meta">
            <span className="pill">Simulated rooftops · real AWS backend</span>
            {state.kind === "ready" ? (
              <span className="small muted" aria-live="polite">
                Last updated {age ?? 0}s ago · readings as of {state.data.asOf}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section style={{ padding: "8px 0 104px" }}>
        <div className="wrap stack g40">
          {state.kind === "loading" ? <Skeleton /> : null}

          {state.kind === "offline" ? (
            <div className="card stack g12">
              <h2 className="as-h3">The backend is offline</h2>
              <p className="muted">
                {state.message} The rest of the site, including the{" "}
                <a href="/demo">in-browser demo</a>, works without it.
              </p>
            </div>
          ) : null}

          {state.kind === "empty" ? (
            <div className="card stack g12">
              <h2 className="as-h3">Nothing to show yet</h2>
              <p className="muted">{state.message}</p>
            </div>
          ) : null}

          {state.kind === "ready" ? (
            <>
              <div className="stack g16">
                <h2 className="as-h3">How one reading travels</h2>
                <PipelineStrip counters={state.data.counters} model={state.data.model} />
              </div>

              <div className="stack g16">
                <h2 className="as-h3">The rooftops</h2>
                <div className="grid c3">
                  {state.data.systems.map((s) => (
                    <RoofCard key={s.systemId} system={s} />
                  ))}
                </div>
              </div>

              <div className="stack g16">
                <h2 className="as-h3">What the agent decided</h2>
                <p className="muted small">
                  {state.data.counters.agentDecisions} of {state.data.counters.decisions} reasons on
                  this page were written by the model; the rest are the rules&apos; own wording, on
                  days when nothing happened.
                </p>
                <DecisionFeed decisions={state.data.decisions} />
              </div>

              <div className="stack g16">
                <h2 className="as-h3">Cases</h2>
                <CasesTable cases={state.data.cases} />
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Skeleton() {
  return (
    <div className="stack g16" aria-busy="true" aria-label="Loading live data">
      <div className="live-skel live-skel-strip" />
      <div className="grid c3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="live-skel live-skel-card" />
        ))}
      </div>
    </div>
  );
}
