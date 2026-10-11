/**
 * The console-fleet fixture (packages/schemas/fixtures/console/): a small fleet as DynamoDB
 * stores it, and every console response the TypeScript computes from it. The Python
 * rollups and console-api tests load the fleet into moto and must return the same answers.
 */
import { generateFleet } from "./generate.js";
import {
  breakdown,
  caseDetail,
  caseList,
  overview,
  searchIndex,
  systemDetail,
  systemList,
  vendorDetail,
  vendorList,
} from "./summarize.js";
import type { CaseFilters, Fleet } from "./types.js";

export const FIXTURE_AS_OF = "2026-10-10";

/**
 * The fleet as the deployed tables hold it: the agent stores one reason per reading (the
 * day's last decision) and no display kind.
 */
export function storedFleet(fleet: Fleet): Fleet {
  return {
    ...fleet,
    systems: fleet.systems.map((s) => ({
      ...s,
      readings: s.readings.map((r) => {
        const last = r.reasons.at(-1);
        return { ...r, reasons: last ? [{ text: last.text, source: last.source }] : [] };
      }),
    })),
  };
}

const CASE_FILTERS: CaseFilters[] = [
  { status: "open" },
  { status: "escalated" },
  { cause: "fault" },
  { vendorId: "VND-DL-0451" },
  { zone: "Rohini", status: "verified" },
];
const SYSTEM_QUERIES = ["rohini", "vnd-dl-0042", "SS-DL-001003", "DSAIN-DL-024", "nothing"];

export function consoleFixture() {
  const fleet = storedFleet(generateFleet({ systems: 12, asOf: FIXTURE_AS_OF, seed: 7 }));
  const vendorIds = [...new Set(fleet.systems.map((s) => s.vendorId))].sort();
  const expected = {
    overview: overview(fleet),
    vendors: vendorList(fleet),
    vendor: Object.fromEntries(vendorIds.map((id) => [id, vendorDetail(fleet, id)])),
    cases: [{}, ...CASE_FILTERS].map((filters) => ({
      filters,
      response: caseList(fleet, filters),
    })),
    case: Object.fromEntries(fleet.cases.map((c) => [c.caseId, caseDetail(fleet, c.caseId)])),
    systems: ["", ...SYSTEM_QUERIES].map((q) => ({ q, response: systemList(fleet, q) })),
    system: Object.fromEntries(
      fleet.systems.map((s) => [s.systemId, systemDetail(fleet, s.systemId)]),
    ),
    breakdown: breakdown(fleet),
    search: searchIndex(fleet),
  };
  return { fleet, expected };
}
