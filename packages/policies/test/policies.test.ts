import { readFileSync } from "node:fs";
import * as cedar from "@cedar-policy/cedar-wasm/nodejs";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(new URL(`../policies/${file}`, import.meta.url), "utf8");

const schema = read("schema.cedarschema");
const policies = { staticPolicies: read("access.cedar") };

describe("cedar policies", () => {
  it("parses the schema", () => {
    expect(cedar.checkParseSchema(schema).type).toBe("success");
  });

  it("validates the policies against the schema", () => {
    const answer = cedar.validate({ schema, policies });
    expect(answer.type).toBe("success");
    if (answer.type === "success") expect(answer.validationErrors).toEqual([]);
  });

  it("denies by default", () => {
    const answer = cedar.isAuthorized({
      principal: { type: "SuryaSaathi::Vendor", id: "vendor_demo" },
      action: { type: "SuryaSaathi::Action", id: "ReadSystem" },
      resource: { type: "SuryaSaathi::System", id: "ss_demo_0001" },
      context: {},
      policies,
      entities: [],
    });
    expect(answer.type).toBe("success");
    if (answer.type === "success") expect(answer.response.decision).toBe("deny");
  });
});
