/**
 * Mulberry32, the seeded generator from the prototype, with its state passed in and out
 * so the simulation stays a pure function of its inputs.
 */
export function nextRandom(state: number): { value: number; state: number } {
  let seed = state | 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: seed };
}
