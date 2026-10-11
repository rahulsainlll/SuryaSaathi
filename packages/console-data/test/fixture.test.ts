import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { consoleFixture } from "../src/index.js";

const read = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../../schemas/fixtures/console/${name}`, import.meta.url), "utf8"),
  );

describe("console-fleet fixture", () => {
  it("matches what the summaries produce now (run `pnpm --filter @suryasaathi/console-data fixtures`)", () => {
    const { fleet, expected } = consoleFixture();
    expect(read("fleet.json")).toEqual(fleet);
    expect(read("expected.json")).toEqual(expected);
  });
});
