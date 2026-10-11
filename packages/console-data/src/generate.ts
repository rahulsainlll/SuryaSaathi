/**
 * A simulated fleet for the console's mock adapter, generated with @suryasaathi/engine:
 * every system is one engine run (dust, smog, rain and faults by seed), and each vendor
 * has a reliability that decides whether it fixes on time or gets escalated.
 */
import { familyMessage, nextRandom, runScenario, type GoldenFixture } from "@suryasaathi/engine";
import type { ReadingRow } from "@suryasaathi/schemas";
import type { Fleet, FleetCase, FleetSystem } from "./types.js";

export const ZONES = [
  { zone: "Dwarka", lat: 28.5921, lon: 77.046 },
  { zone: "Rohini", lat: 28.7383, lon: 77.0822 },
  { zone: "Saket", lat: 28.5245, lon: 77.2066 },
  { zone: "Janakpuri", lat: 28.6219, lon: 77.0878 },
  { zone: "Mayur Vihar", lat: 28.6077, lon: 77.2934 },
  { zone: "Karol Bagh", lat: 28.6519, lon: 77.1909 },
];

/** Placeholder vendors (codes, not real companies) and how often each fixes on time. */
export const VENDORS = [
  { vendorId: "VND-DL-0042", reliability: 0.95 },
  { vendorId: "VND-DL-0117", reliability: 0.85 },
  { vendorId: "VND-DL-0203", reliability: 0.6 },
  { vendorId: "VND-DL-0318", reliability: 0.35 },
  { vendorId: "VND-DL-0451", reliability: 0.1 },
  { vendorId: "VND-DL-0560", reliability: 0.75 },
];

const SOURCES: FleetSystem["dataSource"][] = [
  "data_logger",
  "data_logger",
  "inverter_cloud",
  "camera_clip",
];
const CAPACITIES = [2, 3, 3, 3, 4, 5];
export const TARIFF_INR = 7;
export const WINDOW_DAYS = 30;

export interface FleetOptions {
  systems?: number;
  /** Last simulated day, YYYY-MM-DD. */
  asOf: string;
  seed?: number;
}

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Deterministic random numbers from the engine's generator. */
function random(seed: number) {
  let state = seed;
  return () => {
    const next = nextRandom(state);
    state = next.state;
    return next.value;
  };
}

export function generateFleet({ systems: count = 48, asOf, seed = 7 }: FleetOptions): Fleet {
  const rand = random(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const startDate = addDays(asOf, -(WINDOW_DAYS - 1));
  const systems: FleetSystem[] = [];
  const cases: FleetCase[] = [];

  for (let i = 0; i < count; i++) {
    const systemId = `SS-DL-${String(1001 + i).padStart(6, "0")}`;
    const vendor = VENDORS[(i + Math.floor(i / ZONES.length)) % VENDORS.length]!;
    const place = ZONES[i % ZONES.length]!;
    const name = `Vendor ${vendor.vendorId}`;

    const script: Record<number, "smog" | "fault"> = {};
    for (let k = int(0, 3); k > 0; k--) script[int(3, 27)] = "smog";
    if (rand() < 0.3) script[int(8, 26)] = "fault";
    const rainDays = [0, ...(rand() < 0.5 ? [int(10, 24)] : [])];

    const fixture = runScenario({
      name: systemId,
      description: "",
      config: {
        seed: seed * 1000 + i,
        startDate,
        days: WINDOW_DAYS,
        capacityKw: CAPACITIES[int(0, CAPACITIES.length - 1)]!,
        script,
        rainDays,
        systemId,
        deviceId: systemId.replace("SS-", "DEV-"),
        vendorId: vendor.vendorId,
        vendorName: name,
      },
      vendorFixesOnTime: rand() < vendor.reliability,
      actions: [],
    });

    const { readings, systemCases } = convert(fixture, systemId);
    systems.push({
      systemId,
      dsain: `DSAIN-DL-${String(240000 + i * 37).padStart(7, "0")}`,
      vendorId: vendor.vendorId,
      dataSource: SOURCES[i % SOURCES.length]!,
      consent: true,
      consentRecordedAt: `${addDays(startDate, -int(30, 200))}T10:00:00Z`,
      capacityKw: fixture.config.capacityKw,
      location: {
        lat: Number((place.lat + (rand() - 0.5) * 0.04).toFixed(4)),
        lon: Number((place.lon + (rand() - 0.5) * 0.04).toFixed(4)),
        zone: place.zone,
      },
      installedOn: addDays(startDate, -int(60, 400)),
      simulated: true,
      readings,
    });
    cases.push(...systemCases);
  }

  return {
    asOf,
    tariffInr: TARIFF_INR,
    windowDays: WINDOW_DAYS,
    vendors: VENDORS.map((v) => ({ vendorId: v.vendorId, name: `Vendor ${v.vendorId}` })),
    systems,
    cases,
  };
}

/** Turns one engine run into readings (with the decisions as reasons) and cases. */
function convert(f: GoldenFixture, systemId: string) {
  const newId = (record: { openedAt: string }) =>
    `${systemId}-${record.openedAt.slice(0, 10).replaceAll("-", "")}`;
  const ids = new Map(f.cases.map((c) => [c.caseId, newId(c)]));
  const rename = (text: string) => text.replace(/SS-\d{4}/g, (old) => ids.get(old) ?? old);

  const opened = new Map(f.cases.map((c) => [c.openedAt.slice(0, 10), c]));
  const rainClosed = new Set(
    f.cases.filter((c) => c.resolvedBy === "rain").map((c) => c.verifiedAt!.slice(0, 10)),
  );

  const readings: ReadingRow[] = f.days.map((d) => {
    const reasons = f.decisions
      .filter((x) => x.day === d.day)
      .map((x) => ({ text: rename(x.text), source: "rules" as const, kind: x.kind }));
    const action = opened.has(d.date)
      ? "open_case"
      : rainClosed.has(d.date)
        ? "close_case"
        : d.case && d.diagnosis === null
          ? "wait"
          : "none";
    return {
      date: d.date,
      energyKwh: d.reading.energyKwh,
      expectedKwh: Number(d.expectedKwh.toFixed(3)),
      performance: Number((d.reading.energyKwh / d.expectedKwh).toFixed(4)),
      rained: d.rained,
      diagnosis: d.diagnosis,
      action,
      ...(d.reading.faultCode ? { faultCode: d.reading.faultCode } : {}),
      reasons,
    };
  });

  const systemCases: FleetCase[] = f.cases.map((c) => {
    const openedDate = c.openedAt.slice(0, 10);
    const verifiedDate = c.verifiedAt?.slice(0, 10);
    const openDay = f.days.find((d) => d.date === openedDate)!;
    const reason = f.decisions.find(
      (x) => x.day === openDay.day && (x.kind === "warning" || x.kind === "danger"),
    );
    const verifyDay = verifiedDate ? f.days.find((d) => d.date === verifiedDate) : undefined;
    const id = ids.get(c.caseId)!;
    return {
      caseId: id,
      systemId,
      vendorId: c.vendorId,
      cause: c.cause,
      status: c.status,
      openedDate,
      deadlineDate: c.vendorDeadline.slice(0, 10),
      ...(c.escalatedAt ? { escalatedDate: c.escalatedAt.slice(0, 10) } : {}),
      ...(c.fixedAt ? { fixedDate: c.fixedAt.slice(0, 10) } : {}),
      ...(verifiedDate ? { verifiedDate } : {}),
      ...(c.resolvedBy ? { resolvedBy: c.resolvedBy } : {}),
      reason: reason ? rename(reason.text) : "",
      ...(verifyDay && c.resolvedBy && c.resolvedBy !== "rain"
        ? {
            familyMessage: familyMessage(
              { id, cause: c.cause, resolvedBy: c.resolvedBy },
              Math.round((verifyDay.actualKwh / verifyDay.expectedKwh) * 100),
            ),
          }
        : {}),
    };
  });
  return { readings, systemCases };
}
