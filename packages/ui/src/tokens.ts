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
