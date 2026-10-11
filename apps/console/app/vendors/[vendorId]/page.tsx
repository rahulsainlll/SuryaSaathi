"use client";

import { useParams } from "next/navigation";
import { PerformanceChart } from "../../../components/charts";
import { EscalateButton } from "../../../components/escalate-dialog";
import { LoadError, Loading, NotFound, PageHeader, Section, Stat } from "../../../components/page";
import { CasesTable, SystemsTable } from "../../../components/tables";
import { useQuery } from "../../../lib/data";
import { kwh, pctValue } from "../../../lib/format";

export default function VendorPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const id = decodeURIComponent(vendorId);
  const q = useQuery(`vendor:${id}`, (d) => d.vendor(id));
  if (q.error) return <LoadError error={q.error} />;
  if (q.loading) return <Loading />;
  if (!q.data) return <NotFound what="Vendor" />;
  const { vendor: v, systems, cases, fleet } = q.data;
  const overdue = cases.filter((c) => c.pastDeadline);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Vendors", href: "/vendors" }]}
        title={v.name}
        subtitle={`${v.vendorId} · maintains ${v.systems} systems under the 5-year O&M obligation`}
        asOf={q.data.asOf}
        simulated={q.data.simulated}
        actions={overdue.length > 0 ? <EscalateButton vendor={v} overdue={overdue} /> : undefined}
      />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Systems" value={v.systems} />
        <Stat
          label="Underperforming"
          value={pctValue(v.underperformingPct)}
          hint={`${v.underperforming} systems`}
        />
        <Stat label="Open cases" value={v.openCases} />
        <Stat
          label="Past deadline"
          value={v.pastDeadline}
          tone={v.pastDeadline ? "danger" : undefined}
        />
        <Stat label="Avg fix time" value={v.avgFixDays === null ? "–" : `${v.avgFixDays} days`} />
        <Stat label="Energy lost" value={kwh(v.energyLostKwh)} />
      </dl>
      <Section title="Performance of this vendor’s systems">
        <PerformanceChart points={fleet} label={`${v.name} performance`} />
      </Section>
      <Section title="Cases">
        <CasesTable cases={cases} label={`${v.name} cases`} />
      </Section>
      <Section title="Systems">
        <SystemsTable systems={systems} label={`${v.name} systems`} />
      </Section>
    </>
  );
}
