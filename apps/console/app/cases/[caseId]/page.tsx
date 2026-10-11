"use client";

import type { TimelineEvent } from "@suryasaathi/console-data";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CaseStatusChip, CauseLabel, PastDeadlineChip } from "../../../components/badges";
import { ExpectedActualChart } from "../../../components/charts";
import { LoadError, Loading, NotFound, PageHeader, Section } from "../../../components/page";
import { ReadingsTable } from "../../../components/tables";
import { useQuery } from "../../../lib/data";
import { dayYear } from "../../../lib/format";

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
  const link = "underline underline-offset-2";

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/cases" className="underline-offset-2 hover:underline">
            Cases
          </Link>
        }
        title={c.caseId}
        asOf={q.data.asOf}
        simulated={q.data.simulated}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <CaseStatusChip status={c.status} />
            {c.pastDeadline && <PastDeadlineChip days={c.daysOverdue} />}
            <CauseLabel cause={c.cause} />
            <span>·</span>
            <Link className={link} href={`/systems/${c.systemId}`}>
              {c.systemId}
            </Link>
            <span>·</span>
            <Link className={link} href={`/vendors/${c.vendorId}`}>
              {c.vendorName}
            </Link>
            <span>· {c.zone}</span>
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="timeline-h" className="rounded-2xl bg-surface p-4 shadow-sm">
          <h2 id="timeline-h" className="mb-4 text-lg font-semibold">
            Timeline
          </h2>
          <Timeline events={timeline} />
        </section>
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="reason-h" className="rounded-2xl bg-surface p-4 shadow-sm">
            <h2 id="reason-h" className="mb-1 text-lg font-semibold">
              Why the agent opened it
            </h2>
            <p>{reason}</p>
          </section>
          {familyMessage && (
            <section aria-labelledby="family-h" className="rounded-2xl bg-default p-4">
              <h2 id="family-h" className="mb-2 text-sm text-muted">
                The WhatsApp message the family got
              </h2>
              <p lang="hi" className="rounded-2xl rounded-bl-sm bg-surface px-3 py-2.5 shadow-sm">
                {familyMessage}
              </p>
            </section>
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
