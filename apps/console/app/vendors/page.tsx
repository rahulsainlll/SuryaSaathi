"use client";

import type { VendorRow } from "@suryasaathi/console-data";
import { DataTable } from "../../components/data-table";
import { EscalateButton } from "../../components/escalate-dialog";
import { LoadError, Loading, PageHeader } from "../../components/page";
import { useQuery } from "../../lib/data";
import { kwh, pctValue } from "../../lib/format";
import { AppLink } from "../../components/links";

export default function VendorsPage() {
  const vendors = useQuery("vendors", (d) => d.vendors());
  const cases = useQuery("cases", (d) => d.cases());
  if (vendors.error) return <LoadError error={vendors.error} />;
  if (!vendors.data) return <Loading />;
  const overdue = (id: string) =>
    (cases.data?.cases ?? []).filter((c) => c.vendorId === id && c.pastDeadline);

  return (
    <>
      <PageHeader
        title="Vendors"
        subtitle="How each installer keeps its free-maintenance promise. Press a column to sort."
        asOf={vendors.data.asOf}
        simulated={vendors.data.simulated}
      />
      <DataTable<VendorRow>
        label="Vendor leaderboard"
        rows={vendors.data.vendors}
        rowKey={(v) => v.vendorId}
        initialSort={{ column: "late", direction: "descending" }}
        columns={[
          {
            id: "vendor",
            label: "Vendor",
            rowHeader: true,
            sortValue: (v) => v.name,
            render: (v) => <AppLink href={`/vendors/${v.vendorId}`}>{v.name}</AppLink>,
          },
          {
            id: "systems",
            label: "Systems",
            align: "end",
            sortValue: (v) => v.systems,
            render: (v) => v.systems,
          },
          {
            id: "under",
            label: "Underperforming",
            align: "end",
            sortValue: (v) => v.underperformingPct,
            render: (v) => pctValue(v.underperformingPct),
          },
          {
            id: "open",
            label: "Open cases",
            align: "end",
            sortValue: (v) => v.openCases,
            render: (v) => v.openCases,
          },
          {
            id: "late",
            label: "Past deadline",
            align: "end",
            sortValue: (v) => v.pastDeadline,
            render: (v) =>
              v.pastDeadline ? (
                <span className="font-semibold text-danger">{v.pastDeadline}</span>
              ) : (
                0
              ),
          },
          {
            id: "fix",
            label: "Avg fix time",
            align: "end",
            sortValue: (v) => v.avgFixDays,
            render: (v) => (v.avgFixDays === null ? "–" : `${v.avgFixDays} days`),
          },
          {
            id: "lost",
            label: "Energy lost",
            align: "end",
            sortValue: (v) => v.energyLostKwh,
            render: (v) => kwh(v.energyLostKwh),
          },
          {
            id: "action",
            label: "Action",
            render: (v) =>
              v.pastDeadline > 0 ? (
                <EscalateButton vendor={v} overdue={overdue(v.vendorId)} />
              ) : (
                <span className="text-xs text-muted">On track</span>
              ),
          },
        ]}
      />
      <p className="mt-3 text-xs text-muted">
        Average fix time counts days from filing to a verified fix; cases closed by rain aren’t
        counted.
      </p>
    </>
  );
}
