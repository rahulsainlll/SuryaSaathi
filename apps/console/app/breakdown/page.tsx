"use client";

import type { CauseRow, ZoneRow } from "@suryasaathi/console-data";
import Link from "next/link";
import { CauseLabel } from "../../components/badges";
import { DataTable } from "../../components/data-table";
import { LoadError, Loading, PageHeader, Section } from "../../components/page";
import { useQuery } from "../../lib/data";
import { kwh } from "../../lib/format";

const BAR: Record<CauseRow["cause"], string> = {
  dust: "bg-dust",
  fault: "bg-fault",
  other: "bg-smog",
};
const DESCRIPTION: Record<CauseRow["cause"], string> = {
  dust: "Shortfall while a dust case was open.",
  fault: "Shortfall while a fault case was open.",
  other: "Shortfall with no case open: dust still building before detection, or small dips.",
};

export default function BreakdownPage() {
  const q = useQuery("breakdown", (d) => d.breakdown());
  if (q.error) return <LoadError error={q.error} />;
  if (!q.data) return <Loading />;
  const { causes, zones } = q.data;
  const max = Math.max(...causes.map((c) => c.energyLostKwh), 1);

  return (
    <>
      <PageHeader
        title="Causes and zones"
        subtitle="Where the energy goes and which parts of the city need attention."
        asOf={q.data.asOf}
        simulated={q.data.simulated}
      />
      <Section title="Energy lost by cause">
        <ul className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-sm">
          {causes.map((c) => (
            <li key={c.cause}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  <CauseLabel cause={c.cause} />
                </span>
                <span className="text-sm tabular-nums">
                  <strong>{kwh(c.energyLostKwh)}</strong>
                  {c.cause !== "other" && (
                    <span className="text-muted">
                      {" "}
                      · {c.cases} cases, {c.openCases} open
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-default" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${BAR[c.cause]}`}
                  style={{ width: `${(100 * c.energyLostKwh) / max}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{DESCRIPTION[c.cause]}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="By zone">
        <DataTable<ZoneRow>
          label="Zones"
          rows={zones}
          rowKey={(z) => z.zone}
          initialSort={{ column: "lost", direction: "descending" }}
          columns={[
            {
              id: "zone",
              label: "Zone",
              rowHeader: true,
              sortValue: (z) => z.zone,
              render: (z) => (
                <Link
                  className="font-medium underline-offset-2 hover:underline"
                  href={`/cases?zone=${encodeURIComponent(z.zone)}`}
                >
                  {z.zone}
                </Link>
              ),
            },
            {
              id: "systems",
              label: "Systems",
              align: "end",
              sortValue: (z) => z.systems,
              render: (z) => z.systems,
            },
            {
              id: "under",
              label: "Underperforming",
              align: "end",
              sortValue: (z) => z.underperforming,
              render: (z) => z.underperforming,
            },
            {
              id: "open",
              label: "Open cases",
              align: "end",
              sortValue: (z) => z.openCases,
              render: (z) => z.openCases,
            },
            {
              id: "late",
              label: "Past deadline",
              align: "end",
              sortValue: (z) => z.pastDeadline,
              render: (z) =>
                z.pastDeadline ? (
                  <span className="font-semibold text-danger">{z.pastDeadline}</span>
                ) : (
                  0
                ),
            },
            {
              id: "lost",
              label: "Energy lost",
              align: "end",
              sortValue: (z) => z.energyLostKwh,
              render: (z) => kwh(z.energyLostKwh),
            },
          ]}
        />
      </Section>
    </>
  );
}
