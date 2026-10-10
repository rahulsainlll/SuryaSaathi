import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`../schemas/${name}.schema.json`, import.meta.url), "utf8"));

const ajv = new Ajv2020({ strict: true, schemas: [load("reading"), load("system"), load("case")] });
addFormats.default(ajv);

const validate = (name: string, data: unknown) =>
  ajv.validate(`https://suryasaathi.dev/schemas/${name}.schema.json`, data);

describe("schemas", () => {
  it("accepts a valid reading", () => {
    expect(
      validate("reading", {
        systemId: "ss_demo_0001",
        date: "2026-10-09",
        source: "data_logger",
        energyKwh: 12.4,
        receivedAt: "2026-10-10T01:00:00Z",
      }),
    ).toBe(true);
  });

  it("accepts a valid system", () => {
    expect(
      validate("system", {
        systemId: "ss_demo_0001",
        capacityKw: 3,
        location: { lat: 28.59, lon: 77.05, zone: "dwarka" },
        vendorId: "vendor_demo",
        discomId: "discom_demo",
        dataSource: "inverter_cloud",
        consent: { granted: true, recordedAt: "2026-04-01T10:00:00Z" },
      }),
    ).toBe(true);
  });

  it("accepts a valid case", () => {
    expect(
      validate("case", {
        caseId: "case_0001",
        systemId: "ss_demo_0001",
        vendorId: "vendor_demo",
        cause: "dust",
        status: "filed",
        openedAt: "2026-10-10T02:00:00Z",
        vendorDeadline: "2026-10-13T02:00:00Z",
      }),
    ).toBe(true);
  });

  it("rejects a smog case", () => {
    expect(validate("case", { caseId: "c", systemId: "s", cause: "smog" })).toBe(false);
  });
});
