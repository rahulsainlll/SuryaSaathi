/** The shape of GET /public/live, served by services/live-api. */

export type Diagnosis = "healthy" | "smog" | "dust" | "fault" | null;
export type CaseStatus = "open" | "filed" | "escalated" | "fixed" | "verified";

export interface SeriesPoint {
  date: string;
  actualKwh: number | null;
  expectedKwh: number | null;
}

export interface LiveSystem {
  systemId: string;
  zone: string | null;
  dataSource: string | null;
  capacityKw: number | null;
  latestReadingDate: string | null;
  latestReadingAt: string | null;
  actualKwh: number | null;
  expectedKwh: number | null;
  performance: number | null;
  diagnosis: Diagnosis;
  status: string | null;
  series: SeriesPoint[];
}

export interface LiveDecision {
  systemId: string;
  date: string;
  at: string | null;
  diagnosis: Diagnosis;
  action: string | null;
  reason: string | null;
  reasonSource: "agent" | "rules" | null;
  caseId: string | null;
}

export interface LiveCase {
  caseId: string;
  systemId: string;
  cause: string | null;
  status: CaseStatus;
  vendorDeadline: string | null;
  openedAt: string | null;
  verifiedAt: string | null;
  resolvedBy: string | null;
  familyMessage: string | null;
}

export interface LiveCounters {
  systems: number;
  readings: number;
  decisions: number;
  agentDecisions: number;
  casesOpened: number;
  casesVerified: number;
  casesEscalated: number;
}

export interface LivePayload {
  asOf: string;
  simulated: boolean;
  windowDays: number;
  systems: LiveSystem[];
  decisions: LiveDecision[];
  cases: LiveCase[];
  counters: LiveCounters;
  model: { provider: string; modelId: string };
}
