"use client";

import { Chip } from "@heroui/react";
import type { CaseSummary, ReadingRow, SystemSummary } from "@suryasaathi/console-data";
import Link from "next/link";
import { day, kwh, pct, SOURCE_LABEL } from "../lib/format";
import { CaseStatusChip, CauseLabel, PastDeadlineChip, SystemStatusChip } from "./badges";
import { DataTable } from "./data-table";

const link = "font-medium underline-offset-2 hover:underline";

export function CasesTable({ cases, label = "Cases" }: { cases: CaseSummary[]; label?: string }) {
  return (
    <DataTable<CaseSummary>
      label={label}
      rows={cases}
      rowKey={(c) => c.caseId}
      empty="No cases match."
      columns={[
        {
          id: "case",
          label: "Case",
          rowHeader: true,
          sortValue: (c) => c.caseId,
          render: (c) => (
            <Link className={link} href={`/cases/${c.caseId}`}>
              {c.caseId}
            </Link>
          ),
        },
        {
          id: "status",
          label: "Status",
          sortValue: (c) => c.status,
          render: (c) => (
            <span className="flex flex-wrap gap-1">
              <CaseStatusChip status={c.status} />
              {c.pastDeadline && <PastDeadlineChip days={c.daysOverdue} />}
            </span>
          ),
        },
        {
          id: "cause",
          label: "Cause",
          sortValue: (c) => c.cause,
          render: (c) => <CauseLabel cause={c.cause} />,
        },
        {
          id: "system",
          label: "System",
          sortValue: (c) => c.systemId,
          render: (c) => (
            <Link className={link} href={`/systems/${c.systemId}`}>
              {c.systemId}
            </Link>
          ),
        },
        {
          id: "vendor",
          label: "Vendor",
          sortValue: (c) => c.vendorName,
          render: (c) => (
            <Link className={link} href={`/vendors/${c.vendorId}`}>
              {c.vendorName}
            </Link>
          ),
        },
        { id: "zone", label: "Zone", sortValue: (c) => c.zone, render: (c) => c.zone },
        {
          id: "opened",
          label: "Opened",
          sortValue: (c) => c.openedDate,
          render: (c) => day(c.openedDate),
        },
        {
          id: "deadline",
          label: "Deadline",
          sortValue: (c) => c.deadlineDate,
          render: (c) => day(c.deadlineDate),
        },
        {
          id: "days",
          label: "Days open",
          align: "end",
          sortValue: (c) => c.daysOpen,
          render: (c) => c.daysOpen,
        },
      ]}
    />
  );
}

export function SystemsTable({
  systems,
  label = "Systems",
}: {
  systems: SystemSummary[];
  label?: string;
}) {
  return (
    <DataTable<SystemSummary>
      label={label}
      rows={systems}
      rowKey={(s) => s.systemId}
      empty="No systems match."
      columns={[
        {
          id: "system",
          label: "System",
          rowHeader: true,
          sortValue: (s) => s.systemId,
          render: (s) => (
            <Link className={link} href={`/systems/${s.systemId}`}>
              {s.systemId}
            </Link>
          ),
        },
        {
          id: "dsain",
          label: "DSAIN",
          sortValue: (s) => s.dsain ?? "",
          render: (s) => <span className="text-muted">{s.dsain ?? "–"}</span>,
        },
        {
          id: "status",
          label: "Status",
          sortValue: (s) => s.status,
          render: (s) => <SystemStatusChip status={s.status} />,
        },
        {
          id: "perf",
          label: "Latest",
          align: "end",
          sortValue: (s) => s.latestPerformance,
          render: (s) => pct(s.latestPerformance),
        },
        {
          id: "vendor",
          label: "Vendor",
          sortValue: (s) => s.vendorName,
          render: (s) => (
            <Link className={link} href={`/vendors/${s.vendorId}`}>
              {s.vendorName}
            </Link>
          ),
        },
        { id: "zone", label: "Zone", sortValue: (s) => s.zone, render: (s) => s.zone },
        {
          id: "source",
          label: "Data source",
          sortValue: (s) => s.dataSource,
          render: (s) => SOURCE_LABEL[s.dataSource],
        },
        {
          id: "lost",
          label: "Energy lost",
          align: "end",
          sortValue: (s) => s.energyLostKwh,
          render: (s) => kwh(s.energyLostKwh),
        },
      ]}
    />
  );
}

const DIAGNOSIS: Record<string, string> = {
  healthy: "Healthy",
  smog: "Smog",
  dust: "Dust",
  fault: "Fault",
};

/** Daily readings with the agent's reason for each decision, newest first. */
export function ReadingsTable({ readings }: { readings: ReadingRow[] }) {
  return (
    <DataTable<ReadingRow>
      label="Readings and decisions"
      rows={[...readings].reverse()}
      rowKey={(r) => r.date}
      empty="No readings yet."
      columns={[
        {
          id: "date",
          label: "Day",
          rowHeader: true,
          render: (r) => <span className="whitespace-nowrap">{day(r.date)}</span>,
        },
        { id: "made", label: "Made", align: "end", render: (r) => kwh(r.energyKwh) },
        {
          id: "expected",
          label: "Expected",
          align: "end",
          render: (r) => (r.expectedKwh === null ? "–" : kwh(r.expectedKwh)),
        },
        { id: "perf", label: "Perf.", align: "end", render: (r) => pct(r.performance) },
        {
          id: "diag",
          label: "Diagnosis",
          render: (r) => (
            <span className="whitespace-nowrap">
              {r.diagnosis ? DIAGNOSIS[r.diagnosis] : "Case open"}
              {r.rained ? " · rain" : ""}
              {r.faultCode ? ` · ${r.faultCode}` : ""}
            </span>
          ),
        },
        {
          id: "reason",
          label: "Agent’s reason",
          render: (r) => (
            <ul className="flex max-w-[36rem] min-w-[18rem] flex-col gap-1 whitespace-normal">
              {r.reasons.map((x, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Chip
                    size="sm"
                    variant="soft"
                    color={x.source === "agent" ? "accent" : "default"}
                    className="shrink-0"
                  >
                    {x.source === "agent" ? "Agent" : "Rules"}
                  </Chip>
                  <span>{x.text}</span>
                </li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );
}
