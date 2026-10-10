import { Chip } from "@heroui/react";
import { formatDay, type SimCase, type SimState } from "@suryasaathi/engine";

type StepState = "done" | "now" | "warn" | undefined;
type Steps = Partial<Record<"detect" | "filed" | "vendor" | "esc" | "verify", StepState>>;

const STEPS = [
  { key: "detect", label: "Agent detects a problem" },
  { key: "filed", label: "Complaint filed to vendor with evidence" },
  { key: "vendor", label: "Vendor fixes within 3 days" },
  { key: "esc", label: "If missed: escalated to DISCOM" },
  { key: "verify", label: "Fix verified from new readings" },
] as const;

const STATE_TEXT: Record<NonNullable<StepState>, string> = {
  done: "done",
  now: "in progress",
  warn: "missed",
};

/** The current maintenance case as a timeline, and the family's WhatsApp message. */
export function CasePanel({ sim }: { sim: SimState }) {
  const { chip, steps } = caseView(sim);
  const message = sim.familyMessages.at(-1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Maintenance case</h2>
        <Chip color={chip.color} variant="soft">
          {chip.text}
        </Chip>
      </div>
      <ol className="flex flex-col">
        {STEPS.map(({ key, label }) => {
          const state = steps[key];
          return (
            <li key={key} className="flex items-start gap-2.5 pb-2.5 text-sm">
              <span
                aria-hidden="true"
                className={
                  "mt-px grid size-5 shrink-0 place-items-center rounded-full " +
                  (state === "done"
                    ? "bg-success"
                    : state === "warn"
                      ? "bg-danger"
                      : state === "now"
                        ? "border-4 border-accent-soft bg-accent"
                        : "border-2 border-dashed border-separator")
                }
              />
              <span className={state ? "text-foreground" : "text-muted"}>
                {label}
                {state && <span className="sr-only"> ({STATE_TEXT[state]})</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="rounded-2xl bg-default p-3" aria-live="polite">
        <div className="mb-1.5 text-xs text-muted">The only message the family gets</div>
        {message ? (
          <p
            lang="hi"
            className="rounded-2xl rounded-bl-sm bg-surface px-3 py-2.5 text-sm leading-relaxed shadow-sm"
          >
            {message.text}
          </p>
        ) : (
          <p className="text-sm text-muted">
            Nothing yet. The family isn’t bothered unless there’s good news.
          </p>
        )}
      </div>
    </div>
  );
}

function caseView(sim: SimState): {
  chip: { text: string; color: "default" | "accent" | "danger" | "success" };
  steps: Steps;
} {
  const k = sim.activeCase;
  if (!k) {
    const last: SimCase | undefined = sim.closedCases.at(-1);
    if (last) {
      return {
        chip: { text: `${last.id} resolved`, color: "success" },
        steps: {
          detect: "done",
          filed: "done",
          vendor: last.resolvedBy === "vendor" ? "done" : undefined,
          esc: last.resolvedBy === "discom" ? "done" : undefined,
          verify: "done",
        },
      };
    }
    return { chip: { text: "Monitoring", color: "default" }, steps: {} };
  }
  switch (k.status) {
    case "filed":
      return {
        chip: {
          text: `${k.id} · due ${formatDay(sim.config.startDate, k.deadlineDay)}`,
          color: "accent",
        },
        steps: { detect: "done", filed: "done", vendor: "now" },
      };
    case "escalated":
      return {
        chip: { text: `${k.id} escalated`, color: "danger" },
        steps: { detect: "done", filed: "done", vendor: "warn", esc: "now" },
      };
    default:
      return {
        chip: { text: `${k.id} · checking fix`, color: "accent" },
        steps: {
          detect: "done",
          filed: "done",
          vendor: k.resolvedBy === "vendor" ? "done" : "warn",
          esc: k.resolvedBy === "discom" ? "done" : undefined,
          verify: "now",
        },
      };
  }
}
