import { Chip } from "@heroui/react";
import type { Diagnosis } from "../tokens";

const chipColor = {
  healthy: "success",
  smog: "default",
  dust: "warning",
  fault: "danger",
} as const satisfies Record<Diagnosis, "success" | "default" | "warning" | "danger">;

const label: Record<Diagnosis, string> = {
  healthy: "Healthy",
  smog: "Smog",
  dust: "Dust",
  fault: "Fault",
};

export interface DiagnosisChipProps {
  diagnosis: Diagnosis;
}

/** A HeroUI chip showing a system's diagnosis. */
export function DiagnosisChip({ diagnosis }: DiagnosisChipProps) {
  return (
    <Chip color={chipColor[diagnosis]} variant="soft">
      {label[diagnosis]}
    </Chip>
  );
}
