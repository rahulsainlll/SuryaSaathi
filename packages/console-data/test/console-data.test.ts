import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createApiAdapter,
  createMockAdapter,
  generateFleet,
  type ConsoleData,
  type Fleet,
} from "../src/index.js";

const require = createRequire(import.meta.url);
const schema = (n: string) =>
  JSON.parse(
    readFileSync(require.resolve(`@suryasaathi/schemas/schemas/${n}.schema.json`), "utf8"),
  );
const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, schemas: [schema("console")] });
addFormats.default(ajv);
const BASE = "https://suryasaathi.dev/schemas/console.schema.json#/$defs/";
function expectShape(def: string, data: unknown) {
  const ok = ajv.validate(BASE + def, data);
  expect(ok, ajv.errorsText()).toBe(true);
}

const AS_OF = "2026-10-10";
let fleet: Fleet;
let data: ConsoleData;
beforeAll(() => {
  fleet = generateFleet({ asOf: AS_OF });
  data = createMockAdapter(fleet);
});

describe("generated fleet", () => {
  it("is deterministic and spans 48 systems, 6 vendors and 6 zones over 30 days", () => {
    expect(generateFleet({ asOf: AS_OF })).toEqual(fleet);
    expect(fleet.systems).toHaveLength(48);
    expect(new Set(fleet.systems.map((s) => s.vendorId)).size).toBe(6);
    expect(new Set(fleet.systems.map((s) => s.location.zone)).size).toBe(6);
    expect(
      fleet.systems.every((s) => s.readings.length === 30 && s.readings.at(-1)!.date === AS_OF),
    ).toBe(true);
  });

  it("has dust and fault cases, escalations, rain closures and verified fixes", () => {
    const has = (pred: (c: Fleet["cases"][number]) => boolean) => fleet.cases.some(pred);
    expect(has((c) => c.cause === "dust")).toBe(true);
    expect(has((c) => c.cause === "fault")).toBe(true);
    expect(has((c) => Boolean(c.escalatedDate))).toBe(true);
    expect(has((c) => c.resolvedBy === "rain")).toBe(true);
    expect(has((c) => c.resolvedBy === "vendor" && Boolean(c.familyMessage))).toBe(true);
    expect(fleet.cases.every((c) => c.reason.length > 0)).toBe(true);
  });

  it("names cases like the deployed agent and rewrites the decisions to match", () => {
    const c = fleet.cases[0]!;
    expect(c.caseId).toBe(`${c.systemId}-${c.openedDate.replaceAll("-", "")}`);
    const reasons = fleet.systems.flatMap((s) =>
      s.readings.flatMap((r) => r.reasons.map((x) => x.text)),
    );
    expect(reasons.some((t) => t.includes(`Case ${c.caseId}`))).toBe(true);
    expect(reasons.some((t) => /SS-\d{4}\b/.test(t))).toBe(false);
  });
});

describe("mock adapter responses match the console schema", () => {
  it("overview, lists, breakdown and search", async () => {
    expectShape("Overview", await data.overview());
    expectShape("VendorList", await data.vendors());
    expectShape("CaseList", await data.cases());
    expectShape("SystemList", await data.systems());
    expectShape("Breakdown", await data.breakdown());
    expectShape("SearchIndex", await data.search());
  });

  it("every vendor, case and system detail", async () => {
    for (const v of (await data.vendors()).vendors)
      expectShape("VendorDetail", await data.vendor(v.vendorId));
    for (const c of (await data.cases()).cases)
      expectShape("CaseDetail", await data.case(c.caseId));
    for (const s of (await data.systems()).systems)
      expectShape("SystemDetail", await data.system(s.systemId));
  });

  it("returns null for unknown ids", async () => {
    expect(await data.case("nope")).toBeNull();
    expect(await data.system("nope")).toBeNull();
    expect(await data.vendor("nope")).toBeNull();
  });
});

describe("figures", () => {
  it("are consistent across views", async () => {
    const o = await data.overview();
    const cases = (await data.cases()).cases;
    const systems = (await data.systems()).systems;
    const vendors = (await data.vendors()).vendors;
    const zones = (await data.breakdown()).zones;
    expect(o.simulated).toBe(true);
    expect(o.asOf).toBe(AS_OF);
    expect(o.systemsWatched).toBe(48);
    expect(o.openCases).toBe(cases.filter((c) => c.status !== "verified").length);
    expect(o.pastDeadline).toBe(cases.filter((c) => c.pastDeadline).length);
    expect(o.underperforming).toBe(systems.filter((s) => s.status !== "healthy").length);
    expect(vendors.reduce((n, v) => n + v.systems, 0)).toBe(48);
    expect(zones.reduce((n, z) => n + z.openCases, 0)).toBe(o.openCases);
    expect(o.moneyLostInr).toBe(Math.round(o.energyLostKwh * 7));
    expect(o.fleet).toHaveLength(30);
    expect(o.underperforming).toBeGreaterThan(0);
  });

  it("attributes all energy lost to a cause", async () => {
    const o = await data.overview();
    const total = (await data.breakdown()).causes.reduce((n, c) => n + c.energyLostKwh, 0);
    expect(total).toBeCloseTo(o.energyLostKwh, 1);
  });

  it("lists the escalation queue first", async () => {
    const cases = (await data.cases()).cases;
    const urgent = cases.map((c) => c.status === "escalated" || c.pastDeadline);
    const firstCalm = urgent.indexOf(false);
    expect(urgent.slice(firstCalm).every((u) => !u)).toBe(true);
    expect(urgent[0]).toBe(true);
  });

  it("filters cases and searches systems", async () => {
    const dust = (await data.cases({ cause: "dust" })).cases;
    expect(dust.length).toBeGreaterThan(0);
    expect(dust.every((c) => c.cause === "dust")).toBe(true);
    const open = (await data.cases({ status: "open", zone: "Rohini" })).cases;
    expect(open.every((c) => c.status !== "verified" && c.zone === "Rohini")).toBe(true);
    expect((await data.systems("rohini")).systems.every((s) => s.zone === "Rohini")).toBe(true);
    expect((await data.systems("SS-DL-001001")).systems.map((s) => s.systemId)).toEqual([
      "SS-DL-001001",
    ]);
  });

  it("builds a case timeline from filing to verification", async () => {
    const escalated = (await data.cases()).cases.find(
      (c) => c.escalatedDate && c.status === "verified",
    )!;
    const detail = (await data.case(escalated.caseId))!;
    expect(detail.timeline.map((e) => e.kind)).toEqual([
      "filed", "vendor_notified", "deadline", "escalated", "discom_notified", "fixed", "verified",
    ]); // prettier-ignore
    expect(detail.familyMessage).toContain("DISCOM");
    expect(detail.readings.some((r) => r.action === "open_case")).toBe(true);
  });
});

describe("API adapter", () => {
  it("calls the console API with the bearer token and maps 404 to null", async () => {
    const calls: { url: string; auth: string | null }[] = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, auth: new Headers(init?.headers).get("Authorization") });
      if (url.includes("/cases/missing")) return new Response("", { status: 404 });
      return new Response(JSON.stringify({ ok: url }), { status: 200 });
    }) as typeof fetch;
    const api = createApiAdapter({
      baseUrl: "https://api.example.com/",
      getToken: async () => "tok",
      fetch: fakeFetch,
    });
    await api.cases({ status: "open", cause: "dust" });
    await api.systems("rohini");
    expect(await api.case("missing")).toBeNull();
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.example.com/cases?status=open&cause=dust",
      "https://api.example.com/systems?q=rohini",
      "https://api.example.com/cases/missing",
    ]);
    expect(calls.every((c) => c.auth === "Bearer tok")).toBe(true);
  });

  it("raises on server errors", async () => {
    const api = createApiAdapter({
      baseUrl: "https://api.example.com",
      getToken: async () => null,
      fetch: (async () => new Response("", { status: 401 })) as unknown as typeof fetch,
    });
    await expect(api.overview()).rejects.toMatchObject({ status: 401 });
  });
});
