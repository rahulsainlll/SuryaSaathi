export interface SimConfig {
  /** Days the simulation runs for. */
  days: number;
  /** First simulated day, YYYY-MM-DD. */
  startDate: string;
  seed: number;
  capacityKw: number;
  /** Peak sun hours: clear-sky kWh per kW per day. */
  peakSunHours: number;
  /** Rupees per kWh, used only to show the loss. */
  tariffInr: number;
  /** Days the vendor gets to fix a problem. */
  deadlineDays: number;
  /** Lifetime energy on the meter before day 0, kWh. */
  initialTotalKwh: number;
  /** Things that happen without the viewer pressing anything, by day. */
  script: Record<number, "smog" | "fault">;
  /** Days it rained overnight. */
  rainDays: number[];
  firstCaseNumber: number;
  systemId: string;
  deviceId: string;
  vendorId: string;
  vendorName: string;
}

/** The prototype's scenario: a 3 kW roof in Dwarka, Delhi, from 29 Sep 2026. */
export const defaultConfig: SimConfig = {
  days: 30,
  startDate: "2026-09-29",
  seed: 42,
  capacityKw: 3,
  peakSunHours: 4.3,
  tariffInr: 7,
  deadlineDays: 3,
  initialTotalKwh: 2730.4,
  script: { 6: "smog", 22: "fault" },
  rainDays: [0],
  firstCaseNumber: 142,
  systemId: "SS-000123",
  deviceId: "SS-DL-000123",
  vendorId: "VND-DL-0042",
  vendorName: "[Vendor name] Solar",
};
