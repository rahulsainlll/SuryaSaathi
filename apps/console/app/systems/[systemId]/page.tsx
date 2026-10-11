"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { SystemStatusChip } from "../../../components/badges";
import { ExpectedActualChart } from "../../../components/charts";
import { LoadError, Loading, NotFound, PageHeader, Section } from "../../../components/page";
import { CasesTable, ReadingsTable } from "../../../components/tables";
import { useQuery } from "../../../lib/data";
import { dayYear, kwh, pct, SOURCE_LABEL } from "../../../lib/format";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{children}</dd>
    </div>
  );
}

export default function SystemPage() {
  const { systemId } = useParams<{ systemId: string }>();
  const id = decodeURIComponent(systemId);
  const q = useQuery(`system:${id}`, (d) => d.system(id));
  if (q.error) return <LoadError error={q.error} />;
  if (q.loading) return <Loading />;
  if (!q.data) return <NotFound what="System" />;
  const { system: s, location, installedOn, consentRecordedAt, readings, cases } = q.data;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/systems" className="underline-offset-2 hover:underline">
            Systems
          </Link>
        }
        title={s.systemId}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <SystemStatusChip status={s.status} /> Latest performance {pct(s.latestPerformance)}
          </span>
        }
        asOf={q.data.asOf}
        simulated={q.data.simulated}
      />
      <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-surface p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4">
        <Field label="System ID">{s.systemId}</Field>
        <Field label="DSAIN">{s.dsain ?? "Not issued"}</Field>
        <Field label="Vendor">
          <Link className="underline underline-offset-2" href={`/vendors/${s.vendorId}`}>
            {s.vendorName}
          </Link>
        </Field>
        <Field label="Zone">{location.zone}</Field>
        <Field label="Data source">{SOURCE_LABEL[s.dataSource]}</Field>
        <Field label="Consent">
          {s.consent
            ? `Granted${consentRecordedAt ? ` ${dayYear(consentRecordedAt.slice(0, 10))}` : ""}`
            : "Not granted: no data collected"}
        </Field>
        <Field label="Capacity">{s.capacityKw} kW</Field>
        <Field label="Installed">{installedOn ? dayYear(installedOn) : "–"}</Field>
        <Field label="Location">
          {location.lat.toFixed(3)}, {location.lon.toFixed(3)}
        </Field>
        <Field label="Energy lost (window)">{kwh(s.energyLostKwh)}</Field>
        {s.openCaseId && (
          <Field label="Open case">
            <Link className="underline underline-offset-2" href={`/cases/${s.openCaseId}`}>
              {s.openCaseId}
            </Link>
          </Field>
        )}
      </dl>
      <Section title="Expected vs actual">
        <ExpectedActualChart readings={readings} label={`${s.systemId} expected vs actual`} />
      </Section>
      <Section title="Cases">
        <CasesTable cases={cases} label={`${s.systemId} cases`} />
      </Section>
      <Section title="Recent readings">
        <ReadingsTable readings={readings} />
      </Section>
    </>
  );
}
