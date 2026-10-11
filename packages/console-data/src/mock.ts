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
import type { ConsoleData, Fleet } from "./types.js";

/** Yesterday in UTC: the mock fleet's last simulated day. */
export function defaultAsOf(now: Date = new Date()): string {
  return new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
}

/** The console's data computed in the browser from a generated fleet; needs no AWS. */
export function createMockAdapter(
  fleet: Fleet = generateFleet({ asOf: defaultAsOf() }),
): ConsoleData {
  return {
    kind: "mock",
    overview: async () => overview(fleet),
    vendors: async () => vendorList(fleet),
    vendor: async (id) => vendorDetail(fleet, id),
    cases: async (filters) => caseList(fleet, filters),
    case: async (id) => caseDetail(fleet, id),
    systems: async (query) => systemList(fleet, query),
    system: async (id) => systemDetail(fleet, id),
    breakdown: async () => breakdown(fleet),
    search: async () => searchIndex(fleet),
  };
}
