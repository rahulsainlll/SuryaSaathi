/** Physical model of the roof: sunlight, haze, dust and faults. */

/** Share of sunlight lost to haze on a smog day. */
export const SMOG_HAZE = 0.38;
/** Ordinary haze is drawn uniformly from this range. */
export const BASE_HAZE = 0.06;
export const HAZE_SPREAD = 0.08;
/** Dust added to the panels every dry day, as a share of output. */
export const SOILING_PER_DAY = 0.0065;
export const MAX_SOILING = 0.4;
/** Share of output an inverter fault leaves. */
export const FAULT_OUTPUT = 0.32;

/** What the roof would make on a clear day. */
export function clearSkyKwh(capacityKw: number, peakSunHours: number): number {
  return capacityKw * peakSunHours;
}

/** What the roof should make given the day's sunlight and haze. */
export function expectedKwh(capacityKw: number, peakSunHours: number, haze: number): number {
  return clearSkyKwh(capacityKw, peakSunHours) * (1 - haze);
}

/** What the roof actually made: expected, less dust and any fault, with sensor noise. */
export function actualKwh(
  expected: number,
  soiling: number,
  faulty: boolean,
  noise: number,
): number {
  return Math.max(
    0,
    expected * (1 - soiling) * (faulty ? FAULT_OUTPUT : 1) * Math.min(noise, 1.01),
  );
}
