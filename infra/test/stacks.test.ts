import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { addStacks } from "../lib/index.js";

describe("infra", () => {
  it("defines one stack per service", () => {
    const stacks = addStacks(new App());

    expect(Object.values(stacks).map((s) => s.stackName)).toEqual([
      "SuryaSaathi-Agents",
      "SuryaSaathi-Ingest",
      "SuryaSaathi-ExpectedOutput",
      "SuryaSaathi-Whatsapp",
      "SuryaSaathi-Rollups",
    ]);
  });

  it("synthesizes every stack", () => {
    for (const stack of Object.values(addStacks(new App()))) {
      expect(Template.fromStack(stack).toJSON()).toBeDefined();
    }
  });
});
