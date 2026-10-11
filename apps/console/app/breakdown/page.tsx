"use client";

import { Label, Meter } from "@heroui/react";
import type { CauseRow, ZoneRow } from "@suryasaathi/console-data";
import { CauseLabel } from "../../components/badges";
import { DataTable } from "../../components/data-table";
import { LoadError, Loading, PageHeader, Panel, Section } from "../../components/page";
import { useQuery } from "../../lib/data";
import { kwh } from "../../lib/format";
import { AppLink } from "../../components/links";

const METER: Record<CauseRow["cause"], "warning" | "danger" | "default"> = {
  dust: "warning",
  fault: "danger",
  other: "default",
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
        <Panel description="Every kWh the fleet should have made but didn’t, by what was wrong at the time.">
          <ul className="flex flex-col gap-5">
            {causes.map((c) => (
              <li key={c.cause}>
                <Meter
                  value={c.energyLostKwh}
                  maxValue={max}
                  valueLabel={kwh(c.energyLostKwh)}
                  color={METER[c.cause]}
                >
                  <Label>
                    <CauseLabel cause={c.cause} />
                    {c.cause !== "other" && (
                      <span className="font-normal text-muted">
                        {" "}
                        · {c.cases} cases, {c.openCases} open
                      </span>
                    )}
                  </Label>
                  <Meter.Output />
                  <Meter.Track>
                    <Meter.Fill />
                  </Meter.Track>
                </Meter>
                <p className="mt-1 text-xs text-muted">{DESCRIPTION[c.cause]}</p>
              </li>
            ))}
          </ul>
        </Panel>
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
                <AppLink href={`/cases?zone=${encodeURIComponent(z.zone)}`}>{z.zone}</AppLink>
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
