import { describe, expect, it } from "vitest";
import { dateOf, formatDay, readingTime } from "../src/dates.js";
import { nextRandom } from "../src/rng.js";
import { actualKwh, clearSkyKwh, expectedKwh, FAULT_OUTPUT, SMOG_HAZE } from "../src/world.js";

describe("nextRandom", () => {
  it("is deterministic for a seed", () => {
    const run = (seed: number) => {
      const values: number[] = [];
      let state = seed;
      for (let i = 0; i < 5; i++) {
        const next = nextRandom(state);
        values.push(next.value);
        state = next.state;
      }
      return values;
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });

  it("returns values in [0, 1)", () => {
    let state = 7;
    for (let i = 0; i < 1000; i++) {
      const next = nextRandom(state);
      expect(next.value).toBeGreaterThanOrEqual(0);
      expect(next.value).toBeLessThan(1);
      state = next.state;
    }
  });
});

describe("expected output", () => {
  it("is capacity times peak sun hours on a clear day", () => {
    expect(clearSkyKwh(3, 4.3)).toBeCloseTo(12.9);
    expect(expectedKwh(3, 4.3, 0)).toBeCloseTo(12.9);
  });

  it("falls with haze", () => {
    expect(expectedKwh(3, 4.3, SMOG_HAZE)).toBeCloseTo(12.9 * 0.62);
  });
});

describe("actual output", () => {
  it("loses the soiled share", () => {
    expect(actualKwh(10, 0.1, false, 1)).toBeCloseTo(9);
  });

  it("collapses with a fault", () => {
    expect(actualKwh(10, 0, true, 1)).toBeCloseTo(10 * FAULT_OUTPUT);
  });

  it("caps sensor noise at +1%", () => {
    expect(actualKwh(10, 0, false, 1.5)).toBeCloseTo(10.1);
  });
});

describe("dates", () => {
  it("counts days from the start date across months", () => {
    expect(dateOf("2026-09-29", 0)).toBe("2026-09-29");
    expect(dateOf("2026-09-29", 2)).toBe("2026-10-01");
    expect(formatDay("2026-09-29", 3)).toBe("2 Oct");
    expect(readingTime("2026-09-29", 1)).toBe("2026-09-30T13:00:00.000Z");
  });
});
