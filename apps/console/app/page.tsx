"use client";

import type { CaseSummary, VendorRow } from "@suryasaathi/console-data";
import { CaseStatusChip, CauseLabel, PastDeadlineChip } from "../components/badges";
import { PerformanceChart } from "../components/charts";
import { DataTable } from "../components/data-table";
import { LoadError, Loading, PageHeader, Section, Stat } from "../components/page";
import { useQuery } from "../lib/data";
import { count, day, kwh, pctValue, rupees } from "../lib/format";
import { AppLink } from "../components/links";

export default function OverviewPage() {
  const overview = useQuery("overview", (d) => d.overview());
  const cases = useQuery("cases", (d) => d.cases());
  const vendors = useQuery("vendors", (d) => d.vendors());

  if (overview.error) return <LoadError error={overview.error} />;
  if (!overview.data) return <Loading rows={6} />;
  const o = overview.data;
  const queue = (cases.data?.cases ?? []).filter((c) => c.status === "escalated" || c.pastDeadline);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`Every rooftop system the agents watch, over the last ${o.windowDays} days.`}
        asOf={o.asOf}
        simulated={o.simulated}
      />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Systems watched" value={count(o.systemsWatched)} />
        <Stat
          label="Underperforming"
          value={count(o.underperforming)}
          hint={`${Math.round((100 * o.underperforming) / Math.max(o.systemsWatched, 1))}% of systems`}
          tone={o.underperforming ? "warning" : undefined}
        />
        <Stat label="Open cases" value={count(o.openCases)} />
        <Stat
          label="Past deadline"
          value={count(o.pastDeadline)}
          tone={o.pastDeadline ? "danger" : undefined}
          hint="Escalated or overdue"
        />
        <Stat label="Energy lost" value={kwh(o.energyLostKwh)} hint={`Last ${o.windowDays} days`} />
        <Stat
          label="Money lost"
          value={rupees(o.moneyLostInr)}
          hint={`At ₹${o.tariffInr} per kWh`}
        />
      </dl>

      <Section title="Fleet performance">
        <PerformanceChart points={o.fleet} label="Fleet performance" />
        <p className="mt-2 text-xs text-muted">
          Performance is what the fleet made against what it should have made given each day’s
          sunlight and haze. Systems under 90% count as underperforming.
        </p>
      </Section>

      <div className="grid gap-x-6 xl:grid-cols-2">
        <Section title="Escalation queue" actions={<AppLink href="/cases">All cases</AppLink>}>
          <DataTable<CaseSummary>
            label="Escalation queue"
            rows={queue.slice(0, 6)}
            rowKey={(c) => c.caseId}
            empty="No case is past its deadline."
            columns={[
              {
                id: "case",
                label: "Case",
                rowHeader: true,
                render: (c) => <AppLink href={`/cases/${c.caseId}`}>{c.caseId}</AppLink>,
              },
              { id: "cause", label: "Cause", render: (c) => <CauseLabel cause={c.cause} /> },
              { id: "vendor", label: "Vendor", render: (c) => c.vendorName },
              {
                id: "status",
                label: "Status",
                render: (c) => (
                  <span className="flex flex-wrap gap-1">
                    <CaseStatusChip status={c.status} />
                    {c.pastDeadline && <PastDeadlineChip days={c.daysOverdue} />}
                  </span>
                ),
              },
              { id: "deadline", label: "Deadline", render: (c) => day(c.deadlineDate) },
            ]}
          />
        </Section>
        <Section
          title="Vendors with the most underperformance"
          actions={<AppLink href="/vendors">Leaderboard</AppLink>}
        >
          <DataTable<VendorRow>
            label="Vendors"
            rows={(vendors.data?.vendors ?? []).slice(0, 6)}
            rowKey={(v) => v.vendorId}
            columns={[
              {
                id: "vendor",
                label: "Vendor",
                rowHeader: true,
                render: (v) => <AppLink href={`/vendors/${v.vendorId}`}>{v.name}</AppLink>,
              },
              {
                id: "under",
                label: "Underperforming",
                align: "end",
                render: (v) => pctValue(v.underperformingPct),
              },
              { id: "open", label: "Open cases", align: "end", render: (v) => v.openCases },
              {
                id: "late",
                label: "Past deadline",
                align: "end",
                render: (v) =>
                  v.pastDeadline ? (
                    <span className="font-semibold text-danger">{v.pastDeadline}</span>
                  ) : (
                    0
                  ),
              },
            ]}
          />
        </Section>
      </div>
    </>
  );
}
