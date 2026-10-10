import type { SimState } from "./simulation.js";

/** The sources a device message can come from in the demo. */
export type DeviceSource = "data_logger" | "inverter_cloud" | "camera_clip";

export const FAULT_CODE = "E-07";

/** The raw message a device or connector sends for a day, before ingest normalises it. */
export function deviceMessage(state: SimState, day: number, source: DeviceSource) {
  const record = state.days[day];
  if (!record) throw new RangeError(`No reading for day ${day}`);
  const { config } = state;
  const ts = record.reading.receivedAt;
  const today = record.actualKwh;
  const faulty = record.reading.faultCode !== undefined;
  const base = { deviceId: config.deviceId, vendorId: config.vendorId, ts };

  switch (source) {
    case "data_logger":
      return {
        ...base,
        source,
        energy_today_kwh: round(today, 2),
        energy_total_kwh: round(record.totalKwh, 1),
        peak_power_kw: round(today / 4.6, 2),
        status: faulty ? "FAULT" : "NORMAL",
        fault_code: faulty ? FAULT_CODE : null,
        fw: "1.0.3",
      };
    case "inverter_cloud":
      return {
        ...base,
        source,
        api: "[maker] cloud v2",
        daily_yield_kwh: round(today, 2),
        lifetime_kwh: round(record.totalKwh, 1),
        inverter_state: faulty ? "Fault" : "Generating",
        alarm: faulty ? "Grid relay fault" : null,
      };
    case "camera_clip":
      return {
        ...base,
        source,
        image: `s3://suryasaathi-snaps/${config.deviceId}/${record.date}.jpg`,
        read_by: "bedrock-vision",
        reading: {
          e_today: round(today, 1),
          e_total: Math.round(record.totalKwh),
          status: faulty ? `FAULT ${FAULT_CODE}` : "NORMAL",
        },
        confidence: 0.97,
      };
  }
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}
