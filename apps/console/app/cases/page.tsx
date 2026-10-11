"use client";

import type { CaseFilters } from "@suryasaathi/console-data";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FilterSelect } from "../../components/filter-select";
import { LoadError, Loading, PageHeader, Section } from "../../components/page";
import { CasesTable } from "../../components/tables";
import { useQuery } from "../../lib/data";
import { ZONE_OPTIONS } from "../../lib/options";

const STATUS = [
  { id: "open", label: "Open (any)" },
  { id: "filed", label: "Filed" },
  { id: "escalated", label: "Escalated" },
  { id: "fixed", label: "Awaiting verification" },
  { id: "verified", label: "Verified" },
];
const CAUSE = [
  { id: "dust", label: "Dust" },
  { id: "fault", label: "Fault" },
];

function CasesView() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const filters: CaseFilters = {
    status: (params.get("status") || undefined) as CaseFilters["status"],
    cause: (params.get("cause") || undefined) as CaseFilters["cause"],
    vendorId: params.get("vendor") || undefined,
    zone: params.get("zone") || undefined,
  };
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const all = useQuery("cases", (d) => d.cases());
  const filtered = useQuery(`cases:${params.toString()}`, (d) => d.cases(filters));
  const vendors = useQuery("vendors", (d) => d.vendors());

  if (all.error) return <LoadError error={all.error} />;
  if (!all.data) return <Loading />;
  const queue = all.data.cases.filter((c) => c.status === "escalated" || c.pastDeadline);

  return (
    <>
      <PageHeader
        title="Cases"
        subtitle="Free-maintenance claims the agents filed. Escalated and overdue cases come first."
        asOf={all.data.asOf}
        simulated={all.data.simulated}
      />
      <Section title={`Escalation queue (${queue.length})`}>
        <CasesTable cases={queue} label="Escalation queue" />
      </Section>
      <Section title="All cases">
        <div className="mb-3 flex flex-wrap items-end gap-3" role="group" aria-label="Filter cases">
          <FilterSelect
            label="Status"
            value={params.get("status") ?? ""}
            options={STATUS}
            onChange={(v) => set("status", v)}
          />
          <FilterSelect
            label="Cause"
            value={params.get("cause") ?? ""}
            options={CAUSE}
            onChange={(v) => set("cause", v)}
          />
          <FilterSelect
            label="Vendor"
            value={params.get("vendor") ?? ""}
            options={(vendors.data?.vendors ?? []).map((v) => ({ id: v.vendorId, label: v.name }))}
            onChange={(v) => set("vendor", v)}
          />
          <FilterSelect
            label="Zone"
            value={params.get("zone") ?? ""}
            options={ZONE_OPTIONS(all.data.cases)}
            onChange={(v) => set("zone", v)}
          />
        </div>
        {filtered.error ? (
          <LoadError error={filtered.error} />
        ) : filtered.data ? (
          <>
            <p className="mb-2 text-sm text-muted" aria-live="polite">
              {filtered.data.cases.length} of {all.data.cases.length} cases
            </p>
            <CasesTable cases={filtered.data.cases} label="All cases" />
          </>
        ) : (
          <Loading rows={2} />
        )}
      </Section>
    </>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CasesView />
    </Suspense>
  );
}
