/**
 * Every console figure, computed from a Fleet. services/rollups and services/console-api
 * implement the same definitions in Python; the console-fleet fixture checks they agree.
 *
 * Definitions:
 * - Open case: status is anything but "verified".
 * - Past deadline: escalated (the vendor missed its deadline), or still filed after the
 *   deadline. A "fixed" case is waiting for verification, not on the vendor.
 * - Underperforming system: an open case, or latest performance below 90%.
 * - Energy lost: Σ max(0, expected − actual) over the window, kWh; ₹ at tariffInr per kWh.
 * - Average fix time: mean days from filing to verification, over cases a vendor or the
 *   DISCOM fixed (rain closures excluded).
 * - Cause of a day's shortfall: the cause of the system's case open that day, else "other".
 */
import type {
  Breakdown,
  CaseDetail,
  CaseList,
  CaseSummary,
  CauseRow,
  FleetPoint,
  Overview,
  ReadingRow,
  SearchIndex,
  SystemDetail,
  SystemList,
  SystemSummary,
  TimelineEvent,
  VendorDetail,
  VendorList,
  VendorRow,
  ZoneRow,
} from "@suryasaathi/schemas";
import type { CaseFilters, Fleet, FleetCase, FleetSystem } from "./types.js";

export const UNDERPERFORMING_BELOW = 0.9;

const round = (x: number, digits: number) => Number(x.toFixed(digits));
const days = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const isOpen = (c: { status: string }) => c.status !== "verified";
const shortfall = (r: ReadingRow) =>
  r.expectedKwh === null ? 0 : Math.max(0, r.expectedKwh - r.energyKwh);

export function vendorName(fleet: Fleet, vendorId: string): string {
  return fleet.vendors.find((v) => v.vendorId === vendorId)?.name ?? `Vendor ${vendorId}`;
}

function meta(fleet: Fleet) {
  return { asOf: fleet.asOf, simulated: fleet.systems.some((s) => s.simulated) };
}

// --- cases ------------------------------------------------------------------------------

export function caseSummary(fleet: Fleet, c: FleetCase): CaseSummary {
  const system = fleet.systems.find((s) => s.systemId === c.systemId);
  const pastDeadline =
    c.status === "escalated" || (c.status === "filed" && fleet.asOf > c.deadlineDate);
  const {
    caseId, systemId, vendorId, cause, status, openedDate, deadlineDate,
    escalatedDate, fixedDate, verifiedDate, resolvedBy,
  } = c; // prettier-ignore
  return {
    caseId,
    systemId,
    vendorId,
    vendorName: vendorName(fleet, vendorId),
    zone: system?.location.zone ?? "",
    cause,
    status,
    openedDate,
    deadlineDate,
    ...(escalatedDate ? { escalatedDate } : {}),
    ...(fixedDate ? { fixedDate } : {}),
    ...(verifiedDate ? { verifiedDate } : {}),
    ...(resolvedBy ? { resolvedBy } : {}),
    pastDeadline,
    daysOverdue: pastDeadline ? Math.max(0, days(deadlineDate, fleet.asOf)) : 0,
    daysOpen: days(openedDate, verifiedDate ?? fleet.asOf),
  };
}

/** Escalation queue first (escalated or past deadline, most overdue first), then newest. */
export function compareCases(a: CaseSummary, b: CaseSummary): number {
  const urgent = (c: CaseSummary) => (c.status === "escalated" || c.pastDeadline ? 1 : 0);
  return (
    urgent(b) - urgent(a) ||
    b.daysOverdue - a.daysOverdue ||
    Number(isOpen(b)) - Number(isOpen(a)) ||
    b.openedDate.localeCompare(a.openedDate) ||
    a.caseId.localeCompare(b.caseId)
  );
}

export function matchesFilters(c: CaseSummary, f: CaseFilters = {}): boolean {
  if (f.status === "open" ? !isOpen(c) : f.status && c.status !== f.status) return false;
  if (f.cause && c.cause !== f.cause) return false;
  if (f.vendorId && c.vendorId !== f.vendorId) return false;
  if (f.zone && c.zone !== f.zone) return false;
  return true;
}

export function caseList(fleet: Fleet, filters?: CaseFilters): CaseList {
  const cases = fleet.cases
    .map((c) => caseSummary(fleet, c))
    .filter((c) => matchesFilters(c, filters))
    .sort(compareCases);
  return { ...meta(fleet), cases };
}

export function caseDetail(fleet: Fleet, caseId: string): CaseDetail | null {
  const c = fleet.cases.find((x) => x.caseId === caseId);
  if (!c) return null;
  const summary = caseSummary(fleet, c);
  const system = fleet.systems.find((s) => s.systemId === c.systemId);
  const first = addDays(c.openedDate, -7);
  const last = c.verifiedDate ? addDays(c.verifiedDate, 2) : fleet.asOf;
  const readings = (system?.readings ?? []).filter((r) => r.date >= first && r.date <= last);
  return {
    ...meta(fleet),
    case: summary,
    reason: c.reason,
    ...(c.familyMessage ? { familyMessage: c.familyMessage } : {}),
    timeline: timeline(fleet, c, summary.vendorName),
    readings,
  };
}

export function timeline(fleet: Fleet, c: FleetCase, vendor: string): TimelineEvent[] {
  const work = c.cause === "fault" ? "repair" : "cleaning";
  const events: TimelineEvent[] = [
    { date: c.openedDate, kind: "filed", label: "Case filed", detail: c.reason },
    {
      date: c.openedDate,
      kind: "vendor_notified",
      label: "Vendor notified",
      detail: `Free ${work} requested from ${vendor} under the 5-year O&M obligation, with readings as evidence.`,
    },
    {
      date: c.deadlineDate,
      kind: "deadline",
      label: "Vendor deadline",
      detail: "3 days to fix before escalation.",
      ...(isOpen(c) && fleet.asOf <= c.deadlineDate ? { upcoming: true } : {}),
    },
  ];
  if (c.escalatedDate) {
    events.push(
      { date: c.escalatedDate, kind: "escalated", label: "Escalated to the DISCOM", detail: "The vendor missed the deadline." },
      { date: c.escalatedDate, kind: "discom_notified", label: "DISCOM notified", detail: "Readings, chart and evidence sent to the monitoring cell." },
    ); // prettier-ignore
  }
  if (c.fixedDate && c.resolvedBy !== "rain") {
    events.push({
      date: c.fixedDate,
      kind: "fixed",
      label: c.resolvedBy === "discom" ? "Fixed after DISCOM escalation" : "Vendor visited",
      detail: `${vendor} ${c.cause === "fault" ? "repaired the inverter" : "cleaned the panels"}.`,
    });
  }
  if (c.verifiedDate) {
    events.push(
      c.resolvedBy === "rain"
        ? { date: c.verifiedDate, kind: "closed_by_rain", label: "Closed by rain", detail: "Overnight rain cleaned the panels; no visit needed." }
        : { date: c.verifiedDate, kind: "verified", label: "Fix verified", detail: "Performance back above 93% in the next reading." },
    ); // prettier-ignore
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// --- systems ------------------------------------------------------------------------------

export function systemSummary(fleet: Fleet, s: FleetSystem): SystemSummary {
  const open = fleet.cases.filter((c) => c.systemId === s.systemId && isOpen(c));
  const latest = s.readings.at(-1);
  const latestPerformance = latest?.performance ?? null;
  const status: SystemSummary["status"] = open.length
    ? "open_case"
    : latestPerformance !== null && latestPerformance < UNDERPERFORMING_BELOW
      ? "underperforming"
      : "healthy";
  return {
    systemId: s.systemId,
    ...(s.dsain ? { dsain: s.dsain } : {}),
    vendorId: s.vendorId,
    vendorName: vendorName(fleet, s.vendorId),
    zone: s.location.zone,
    dataSource: s.dataSource,
    consent: s.consent,
    capacityKw: s.capacityKw,
    latestPerformance,
    status,
    ...(open[0] ? { openCaseId: open[0].caseId } : {}),
    energyLostKwh: round(
      windowed(fleet, s).reduce((sum, r) => sum + shortfall(r), 0),
      2,
    ),
    simulated: s.simulated,
  };
}

function windowed(fleet: Fleet, s: FleetSystem): ReadingRow[] {
  const first = addDays(fleet.asOf, -(fleet.windowDays - 1));
  return s.readings.filter((r) => r.date >= first && r.date <= fleet.asOf);
}

export function matchesQuery(s: SystemSummary, query?: string): boolean {
  const q = query?.trim().toLowerCase();
  if (!q) return true;
  return [s.systemId, s.dsain ?? "", s.vendorName, s.vendorId, s.zone].some((v) =>
    v.toLowerCase().includes(q),
  );
}

export function systemList(fleet: Fleet, query?: string): SystemList {
  const systems = fleet.systems
    .map((s) => systemSummary(fleet, s))
    .filter((s) => matchesQuery(s, query))
    .sort((a, b) => a.systemId.localeCompare(b.systemId));
  return { ...meta(fleet), systems };
}

export function systemDetail(fleet: Fleet, systemId: string): SystemDetail | null {
  const s = fleet.systems.find((x) => x.systemId === systemId);
  if (!s) return null;
  return {
    ...meta(fleet),
    system: systemSummary(fleet, s),
    location: s.location,
    ...(s.installedOn ? { installedOn: s.installedOn } : {}),
    ...(s.consentRecordedAt ? { consentRecordedAt: s.consentRecordedAt } : {}),
    readings: windowed(fleet, s),
    cases: fleet.cases
      .filter((c) => c.systemId === systemId)
      .map((c) => caseSummary(fleet, c))
      .sort(compareCases),
  };
}

// --- fleet, vendors, zones -------------------------------------------------------------------

export function fleetSeries(fleet: Fleet, systems: FleetSystem[] = fleet.systems): FleetPoint[] {
  const byDate = new Map<string, { e: number; a: number; under: number }>();
  for (const s of systems) {
    for (const r of windowed(fleet, s)) {
      if (r.expectedKwh === null) continue;
      const p = byDate.get(r.date) ?? { e: 0, a: 0, under: 0 };
      p.e += r.expectedKwh;
      p.a += r.energyKwh;
      if (r.performance !== null && r.performance < UNDERPERFORMING_BELOW) p.under += 1;
      byDate.set(r.date, p);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, p]) => ({
      date,
      expectedKwh: round(p.e, 2),
      actualKwh: round(p.a, 2),
      performance: p.e > 0 ? round(p.a / p.e, 4) : null,
      underperforming: p.under,
    }));
}

interface Tally {
  systems: number;
  underperforming: number;
  openCases: number;
  pastDeadline: number;
  energyLostKwh: number;
}

function tally(fleet: Fleet, systems: FleetSystem[]): Tally {
  const ids = new Set(systems.map((s) => s.systemId));
  const summaries = systems.map((s) => systemSummary(fleet, s));
  const cases = fleet.cases.filter((c) => ids.has(c.systemId)).map((c) => caseSummary(fleet, c));
  return {
    systems: systems.length,
    underperforming: summaries.filter((s) => s.status !== "healthy").length,
    openCases: cases.filter(isOpen).length,
    pastDeadline: cases.filter((c) => c.pastDeadline).length,
    energyLostKwh: round(
      summaries.reduce((sum, s) => sum + s.energyLostKwh, 0),
      2,
    ),
  };
}

export function overview(fleet: Fleet): Overview {
  const t = tally(fleet, fleet.systems);
  return {
    ...meta(fleet),
    systemsWatched: t.systems,
    underperforming: t.underperforming,
    openCases: t.openCases,
    pastDeadline: t.pastDeadline,
    energyLostKwh: t.energyLostKwh,
    moneyLostInr: Math.round(t.energyLostKwh * fleet.tariffInr),
    tariffInr: fleet.tariffInr,
    windowDays: fleet.windowDays,
    fleet: fleetSeries(fleet),
  };
}

export function vendorRow(fleet: Fleet, vendorId: string): VendorRow {
  const systems = fleet.systems.filter((s) => s.vendorId === vendorId);
  const t = tally(fleet, systems);
  const fixes = fleet.cases
    .filter((c) => c.vendorId === vendorId && c.verifiedDate && c.resolvedBy !== "rain")
    .map((c) => days(c.openedDate, c.verifiedDate!));
  return {
    vendorId,
    name: vendorName(fleet, vendorId),
    systems: t.systems,
    underperforming: t.underperforming,
    underperformingPct: t.systems ? round((100 * t.underperforming) / t.systems, 1) : 0,
    openCases: t.openCases,
    pastDeadline: t.pastDeadline,
    avgFixDays: fixes.length ? round(fixes.reduce((a, b) => a + b, 0) / fixes.length, 1) : null,
    energyLostKwh: t.energyLostKwh,
  };
}

export function vendorList(fleet: Fleet): VendorList {
  const ids = [...new Set(fleet.systems.map((s) => s.vendorId))].sort();
  const vendors = ids
    .map((id) => vendorRow(fleet, id))
    .sort(
      (a, b) =>
        b.pastDeadline - a.pastDeadline ||
        b.underperformingPct - a.underperformingPct ||
        a.vendorId.localeCompare(b.vendorId),
    );
  return { ...meta(fleet), vendors };
}

export function vendorDetail(fleet: Fleet, vendorId: string): VendorDetail | null {
  const systems = fleet.systems.filter((s) => s.vendorId === vendorId);
  if (!systems.length) return null;
  return {
    ...meta(fleet),
    vendor: vendorRow(fleet, vendorId),
    systems: systems
      .map((s) => systemSummary(fleet, s))
      .sort((a, b) => a.systemId.localeCompare(b.systemId)),
    cases: fleet.cases
      .filter((c) => c.vendorId === vendorId)
      .map((c) => caseSummary(fleet, c))
      .sort(compareCases),
    fleet: fleetSeries(fleet, systems),
  };
}

export function breakdown(fleet: Fleet): Breakdown {
  const lost = { dust: 0, fault: 0, other: 0 };
  for (const s of fleet.systems) {
    const own = fleet.cases.filter((c) => c.systemId === s.systemId);
    for (const r of windowed(fleet, s)) {
      const active = own.find(
        (c) => c.openedDate <= r.date && r.date <= (c.verifiedDate ?? fleet.asOf),
      );
      lost[active ? active.cause : "other"] += shortfall(r);
    }
  }
  const causes: CauseRow[] = (["dust", "fault", "other"] as const).map((cause) => {
    const cases = cause === "other" ? [] : fleet.cases.filter((c) => c.cause === cause);
    return {
      cause,
      cases: cases.length,
      openCases: cases.filter(isOpen).length,
      energyLostKwh: round(lost[cause], 2),
    };
  });
  const zoneNames = [...new Set(fleet.systems.map((s) => s.location.zone))].sort();
  const zones: ZoneRow[] = zoneNames.map((zone) => ({
    zone,
    ...tally(
      fleet,
      fleet.systems.filter((s) => s.location.zone === zone),
    ),
  }));
  return { ...meta(fleet), causes, zones };
}

export function searchIndex(fleet: Fleet): SearchIndex {
  const systems = fleet.systems.map((s) => ({
    type: "system" as const,
    id: s.systemId,
    label: s.dsain ? `${s.systemId} · ${s.dsain}` : s.systemId,
    hint: `${s.location.zone} · ${vendorName(fleet, s.vendorId)}`,
  }));
  const vendors = [...new Set(fleet.systems.map((s) => s.vendorId))].sort().map((id) => ({
    type: "vendor" as const,
    id,
    label: vendorName(fleet, id),
    hint: id,
  }));
  const cases = fleet.cases.map((c) => ({
    type: "case" as const,
    id: c.caseId,
    label: c.caseId,
    hint: `${c.cause} · ${c.status}`,
  }));
  return { ...meta(fleet), items: [...vendors, ...systems, ...cases] };
}
