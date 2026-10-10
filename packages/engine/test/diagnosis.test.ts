import { describe, expect, it } from "vitest";
import { diagnose, type Observation } from "../src/diagnosis.js";

const CLEAR = 12.9;

/** Builds a history from daily performance values on ordinary days (expected 11.5 kWh). */
function history(performances: number[], extra: Partial<Observation>[] = []): Observation[] {
  return performances.map((p, i) => ({
    expectedKwh: 11.5,
    actualKwh: 11.5 * p,
    clearSkyKwh: CLEAR,
    rained: false,
    ...extra[i],
  }));
}

describe("diagnosis rules (v1)", () => {
  it("calls a healthy day healthy", () => {
    expect(diagnose(history([0.99, 0.98]), 1)).toBe("healthy");
  });

  it("smog: expected is low but performance stays above 90%", () => {
    const h = history([0.98, 0.97], [{}, { expectedKwh: 8, actualKwh: 7.8 }]);
    expect(diagnose(h, 1)).toBe("smog");
  });

  it("does not call smog when performance is also down", () => {
    const h = history([0.98, 0.8], [{}, { expectedKwh: 8, actualKwh: 6.4 }]);
    expect(diagnose(h, 1)).not.toBe("smog");
  });

  it("dust: 3-day average below 91% and falling over 5 dry days", () => {
    const h = history([0.99, 0.97, 0.95, 0.93, 0.91, 0.9, 0.89, 0.88]);
    expect(diagnose(h, 7)).toBe("dust");
  });

  it("does not call dust when it rained in the last 5 days", () => {
    const h = history(
      [0.99, 0.97, 0.95, 0.93, 0.91, 0.9, 0.89, 0.88],
      [{}, {}, {}, {}, {}, { rained: true }],
    );
    expect(diagnose(h, 7)).toBe("healthy");
  });

  it("does not call dust when performance is low but steady", () => {
    const h = history([0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9]);
    expect(diagnose(h, 7)).toBe("healthy");
  });

  it("does not call dust without 6 days of history", () => {
    const h = history([0.99, 0.95, 0.91, 0.89, 0.88, 0.87]);
    expect(diagnose(h, 5)).toBe("healthy");
  });

  it("fault: performance drops below 60% overnight", () => {
    expect(diagnose(history([0.97, 0.32]), 1)).toBe("fault");
  });

  it("fault: the inverter reports a fault code", () => {
    expect(diagnose(history([0.97, 0.95], [{}, { faultCode: "E-07" }]), 1)).toBe("fault");
  });

  it("does not call a fault when output was already low the day before", () => {
    expect(diagnose(history([0.5, 0.45]), 1)).toBe("healthy");
  });
});
