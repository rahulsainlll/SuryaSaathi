/** Design tokens shared by the apps, for places CSS variables can't reach (charts, canvas). */

export const brand = {
  name: "SuryaSaathi",
  tagline: "An AI agent that keeps India's rooftop solar working.",
} as const;

/** The states a system's daily diagnosis can be in. */
export type Diagnosis = "healthy" | "smog" | "dust" | "fault";

/** CSS variables for each diagnosis, defined in theme.css. */
export const diagnosisColor: Record<Diagnosis, string> = {
  healthy: "var(--color-healthy)",
  smog: "var(--color-smog)",
  dust: "var(--color-dust)",
  fault: "var(--color-fault)",
};

/**
 * Chart series colours, checked with the dataviz palette validator on the light surface
 * (colour-blind separation ΔE ≥ 28, both ≥ 3:1 contrast). Liveline needs literal colours.
 */
export const chartColor = {
  /** Expected output (sunlight + haze). */
  expected: "#2f6fdb",
  /** Actual reading. */
  actual: "#c96a06",
  /** Rain bands behind the chart. */
  rain: "#8fb8f0",
} as const;
