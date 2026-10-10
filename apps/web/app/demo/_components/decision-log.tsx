import { formatDay, type LogKind, type SimState } from "@suryasaathi/engine";

const DOT: Record<LogKind, string> = {
  neutral: "bg-muted",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** Everything the agents decided, newest first. */
export function DecisionLog({ sim }: { sim: SimState }) {
  const entries = [...sim.log].reverse();
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold">What the agents decided</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No readings yet.</p>
      ) : (
        <ol className="flex max-h-80 flex-col overflow-auto">
          {entries.map((e, i) => (
            <li
              key={entries.length - i}
              className="grid grid-cols-[3.75rem_0.625rem_1fr] items-start gap-2 border-b border-separator py-1.5 text-sm last:border-b-0"
            >
              <span className="pt-px text-xs text-muted tabular-nums">
                {formatDay(sim.config.startDate, e.day)}
              </span>
              <span aria-hidden="true" className={`mt-1.5 size-2 rounded-full ${DOT[e.kind]}`} />
              <span>{e.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
