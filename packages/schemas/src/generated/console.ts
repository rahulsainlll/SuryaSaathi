/* Generated from schemas/console.schema.json by scripts/generate.mjs. Do not edit. */

/**
 * open_case: a maintenance case is open; underperforming: latest performance below 90% with no case yet.
 */
export type SystemStatus = "healthy" | "underperforming" | "open_case";
export type ConsoleCaseCause = "dust" | "fault";
export type ConsoleCaseStatus = "filed" | "escalated" | "fixed" | "verified";
export type ConsoleDiagnosis = "healthy" | "smog" | "dust" | "fault";

/**
 * Responses of the console API (services/console-api), also produced by the console's mock adapter. Each $defs entry is one response or a part of one.
 */
export interface ConsoleApi {
  Overview?: Overview;
  VendorList?: VendorList;
  VendorDetail?: VendorDetail;
  CaseList?: CaseList;
  CaseDetail?: CaseDetail;
  SystemList?: SystemList;
  SystemDetail?: SystemDetail;
  Breakdown?: Breakdown;
  SearchIndex?: SearchIndex;
}
/**
 * GET /overview
 */
export interface Overview {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  systemsWatched: number;
  underperforming: number;
  openCases: number;
  pastDeadline: number;
  /**
   * Shortfall against expected over the window.
   */
  energyLostKwh: number;
  moneyLostInr: number;
  tariffInr: number;
  windowDays: number;
  fleet: FleetPoint[];
}
/**
 * Daily totals for a set of systems.
 */
export interface FleetPoint {
  date: string;
  expectedKwh: number;
  actualKwh: number;
  /**
   * Sum of actual / sum of expected.
   */
  performance: number | null;
  /**
   * Systems below 90% that day.
   */
  underperforming: number;
}
/**
 * GET /vendors
 */
export interface VendorList {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  vendors: VendorRow[];
}
/**
 * A vendor's standing across the systems it maintains.
 */
export interface VendorRow {
  vendorId: string;
  name: string;
  systems: number;
  underperforming: number;
  underperformingPct: number;
  openCases: number;
  pastDeadline: number;
  /**
   * Mean days from filing to a verified fix (rain closures excluded); null without fixes.
   */
  avgFixDays: number | null;
  energyLostKwh: number;
}
/**
 * GET /vendors/{vendorId}
 */
export interface VendorDetail {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  vendor: VendorRow;
  systems: SystemSummary[];
  cases: CaseSummary[];
  fleet: FleetPoint[];
}
/**
 * A monitored system as listed in the console.
 */
export interface SystemSummary {
  systemId: string;
  dsain?: string;
  vendorId: string;
  vendorName: string;
  zone: string;
  dataSource: "data_logger" | "inverter_cloud" | "camera_clip" | "whatsapp_photo";
  consent: boolean;
  capacityKw: number;
  latestPerformance: number | null;
  status: SystemStatus;
  openCaseId?: string;
  energyLostKwh: number;
  simulated: boolean;
}
/**
 * A maintenance case as listed in the console.
 */
export interface CaseSummary {
  caseId: string;
  systemId: string;
  vendorId: string;
  vendorName: string;
  zone: string;
  cause: ConsoleCaseCause;
  status: ConsoleCaseStatus;
  openedDate: string;
  deadlineDate: string;
  escalatedDate?: string;
  fixedDate?: string;
  verifiedDate?: string;
  resolvedBy?: "vendor" | "discom" | "rain";
  /**
   * Escalated, or still filed after the vendor deadline.
   */
  pastDeadline: boolean;
  daysOverdue: number;
  daysOpen: number;
}
/**
 * GET /cases
 */
export interface CaseList {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  cases: CaseSummary[];
}
/**
 * GET /cases/{caseId}
 */
export interface CaseDetail {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  case: CaseSummary;
  /**
   * Why the agent opened the case.
   */
  reason: string;
  familyMessage?: string;
  timeline: TimelineEvent[];
  readings: ReadingRow[];
}
/**
 * A step in a case's history.
 */
export interface TimelineEvent {
  date: string;
  kind:
    | "filed"
    | "vendor_notified"
    | "deadline"
    | "escalated"
    | "discom_notified"
    | "fixed"
    | "verified"
    | "closed_by_rain";
  label: string;
  detail?: string;
  /**
   * A deadline still ahead.
   */
  upcoming?: boolean;
}
/**
 * One day's reading for a system, with what the agent made of it.
 */
export interface ReadingRow {
  date: string;
  energyKwh: number;
  expectedKwh: number | null;
  /**
   * Actual / expected.
   */
  performance: number | null;
  rained: boolean;
  diagnosis: ConsoleDiagnosis | null;
  action: string | null;
  faultCode?: string;
  reasons: DecisionReason[];
}
/**
 * One plain-language reason the agent gave for a decision.
 */
export interface DecisionReason {
  text: string;
  source: "agent" | "rules";
  kind?: "neutral" | "info" | "success" | "warning" | "danger";
}
/**
 * GET /systems
 */
export interface SystemList {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  systems: SystemSummary[];
}
/**
 * GET /systems/{systemId}
 */
export interface SystemDetail {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  system: SystemSummary;
  location: SystemLocation;
  installedOn?: string;
  consentRecordedAt?: string;
  readings: ReadingRow[];
  cases: CaseSummary[];
}
/**
 * Where the system is.
 */
export interface SystemLocation {
  lat: number;
  lon: number;
  zone: string;
}
/**
 * GET /breakdown
 */
export interface Breakdown {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  causes: CauseRow[];
  zones: ZoneRow[];
}
/**
 * Cases and energy lost by cause; other is shortfall with no dust or fault case.
 */
export interface CauseRow {
  cause: "dust" | "fault" | "other";
  cases: number;
  openCases: number;
  energyLostKwh: number;
}
/**
 * A DISCOM zone's standing.
 */
export interface ZoneRow {
  zone: string;
  systems: number;
  underperforming: number;
  openCases: number;
  pastDeadline: number;
  energyLostKwh: number;
}
/**
 * GET /search
 */
export interface SearchIndex {
  /**
   * Last day with readings; every figure is as of this day.
   */
  asOf: string;
  /**
   * True when the figures come from simulated systems (show the Simulated data badge).
   */
  simulated: boolean;
  items: SearchItem[];
}
/**
 * An entry in the command palette.
 */
export interface SearchItem {
  type: "system" | "vendor" | "case";
  id: string;
  label: string;
  hint: string;
}
