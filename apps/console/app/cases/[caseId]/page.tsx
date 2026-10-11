"use client";

import { Card } from "@heroui/react";
import type { TimelineEvent } from "@suryasaathi/console-data";
import { useParams } from "next/navigation";
import { CaseStatusChip, CauseLabel, PastDeadlineChip } from "../../../components/badges";
import { ExpectedActualChart } from "../../../components/charts";
import { LoadError, Loading, NotFound, PageHeader, Panel, Section } from "../../../components/page";
import { ReadingsTable } from "../../../components/tables";
import { useQuery } from "../../../lib/data";
import { dayYear } from "../../../lib/format";
import { AppLink } from "../../../components/links";

const DOT: Record<TimelineEvent["kind"], string> = {
  filed: "bg-accent",
  vendor_notified: "bg-info",
  deadline: "bg-warning",
  escalated: "bg-danger",
  discom_notified: "bg-danger",
  fixed: "bg-success",
  verified: "bg-success",
  closed_by_rain: "bg-info",
};

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="flex flex-col">
      {events.map((e, i) => (
        <li key={`${e.kind}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
          {i < events.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-4 left-[7px] h-full w-0.5 bg-separator"
            />
          )}
          <span
            aria-hidden="true"
            className={`relative mt-1 size-4 shrink-0 rounded-full ${e.upcoming ? "border-2 border-dashed border-warning bg-surface" : DOT[e.kind]}`}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{e.label}</span>
              <span className="text-sm text-muted">
                {dayYear(e.date)}
                {e.upcoming ? " · upcoming" : ""}
              </span>
            </div>
            {e.detail && <p className="text-sm text-muted">{e.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function CasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const id = decodeURIComponent(caseId);
  const q = useQuery(`case:${id}`, (d) => d.case(id));
  if (q.error) return <LoadError error={q.error} />;
  if (q.loading) return <Loading />;
  if (!q.data) return <NotFound what="Case" />;
  const { case: c, reason, familyMessage, timeline, readings } = q.data;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Cases", href: "/cases" }]}
        title={c.caseId}
        asOf={q.data.asOf}
        simulated={q.data.simulated}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <CaseStatusChip status={c.status} />
            {c.pastDeadline && <PastDeadlineChip days={c.daysOverdue} />}
            <CauseLabel cause={c.cause} />
            <span>·</span>
            <AppLink href={`/systems/${c.systemId}`}>{c.systemId}</AppLink>
            <span>·</span>
            <AppLink href={`/vendors/${c.vendorId}`}>{c.vendorName}</AppLink>
            <span>· {c.zone}</span>
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel title="Timeline">
          <Timeline events={timeline} />
        </Panel>
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Why the agent opened it">
            <p>{reason}</p>
          </Panel>
          {familyMessage && (
            <Panel
              title="The WhatsApp message the family got"
              description="Sent once the fix was verified."
            >
              <Card variant="secondary" className="rounded-bl-sm">
                <Card.Content>
                  <p lang="hi">{familyMessage}</p>
                </Card.Content>
              </Card>
            </Panel>
          )}
          <ExpectedActualChart
            readings={readings}
            label={`${c.systemId} around case ${c.caseId}`}
          />
        </div>
      </div>
      <Section title="Readings and decisions">
        <ReadingsTable readings={readings} />
      </Section>
    </>
  );
}
