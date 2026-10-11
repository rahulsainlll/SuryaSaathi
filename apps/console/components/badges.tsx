import { Chip } from "@heroui/react";
import type { CaseSummary, SystemSummary } from "@suryasaathi/console-data";

/** Shown wherever the figures come from simulated systems. */
export function SimulatedBadge({ simulated = true }: { simulated?: boolean }) {
  if (!simulated) return null;
  return (
    <Chip color="warning" variant="soft" size="sm">
      <span aria-hidden="true">●</span> Simulated data
    </Chip>
  );
}

const CASE_STATUS: Record<
  CaseSummary["status"],
  { label: string; color: "accent" | "danger" | "default" | "success" }
> = {
  filed: { label: "Filed", color: "accent" },
  escalated: { label: "Escalated", color: "danger" },
  fixed: { label: "Awaiting verification", color: "default" },
  verified: { label: "Verified", color: "success" },
};

export function CaseStatusChip({ status }: { status: CaseSummary["status"] }) {
  const s = CASE_STATUS[status];
  return (
    <Chip color={s.color} variant="soft" size="sm">
      {s.label}
    </Chip>
  );
}

export function PastDeadlineChip({ days }: { days: number }) {
  return (
    <Chip color="danger" variant="soft" size="sm">
      {days > 0 ? `${days} day${days === 1 ? "" : "s"} overdue` : "Deadline passed"}
    </Chip>
  );
}

const CAUSE: Record<string, { label: string; className: string }> = {
  dust: { label: "Dust", className: "bg-dust" },
  fault: { label: "Fault", className: "bg-fault" },
  other: { label: "Other", className: "bg-smog" },
};

export function CauseLabel({ cause }: { cause: string }) {
  const c = CAUSE[cause] ?? CAUSE.other!;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`size-2 rounded-full ${c.className}`} />
      {c.label}
    </span>
  );
}

const SYSTEM_STATUS: Record<
  SystemSummary["status"],
  { label: string; color: "success" | "warning" | "danger" }
> = {
  healthy: { label: "Healthy", color: "success" },
  underperforming: { label: "Underperforming", color: "warning" },
  open_case: { label: "Open case", color: "danger" },
};

export function SystemStatusChip({ status }: { status: SystemSummary["status"] }) {
  const s = SYSTEM_STATUS[status];
  return (
    <Chip color={s.color} variant="soft" size="sm">
      {s.label}
    </Chip>
  );
}
