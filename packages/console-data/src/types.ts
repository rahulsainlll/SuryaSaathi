import type {
  Breakdown,
  CaseDetail,
  CaseList,
  CaseSummary,
  ConsoleCaseCause,
  ConsoleCaseStatus,
  Overview,
  ReadingRow,
  SearchIndex,
  SystemDetail,
  SystemList,
  VendorDetail,
  VendorList,
} from "@suryasaathi/schemas";

export type * from "@suryasaathi/schemas";

/** Case list filters. "open" means any status but verified. */
export interface CaseFilters {
  status?: ConsoleCaseStatus | "open";
  cause?: ConsoleCaseCause;
  vendorId?: string;
  zone?: string;
}

/**
 * Everything the console reads. The mock adapter computes it from a generated fleet; the
 * API adapter fetches it from services/console-api. Both return console.schema.json shapes.
 */
export interface ConsoleData {
  readonly kind: "mock" | "api";
  overview(): Promise<Overview>;
  vendors(): Promise<VendorList>;
  vendor(vendorId: string): Promise<VendorDetail | null>;
  cases(filters?: CaseFilters): Promise<CaseList>;
  case(caseId: string): Promise<CaseDetail | null>;
  systems(query?: string): Promise<SystemList>;
  system(systemId: string): Promise<SystemDetail | null>;
  breakdown(): Promise<Breakdown>;
  search(): Promise<SearchIndex>;
}

/**
 * The raw data the summaries are computed from: what DynamoDB holds (systems, readings with
 * the agent's annotations, cases). The rollups service reads the same shape from its tables.
 */
export interface Fleet {
  asOf: string;
  tariffInr: number;
  windowDays: number;
  vendors: { vendorId: string; name: string }[];
  systems: FleetSystem[];
  cases: FleetCase[];
}

export interface FleetSystem {
  systemId: string;
  dsain?: string;
  vendorId: string;
  dataSource: "data_logger" | "inverter_cloud" | "camera_clip" | "whatsapp_photo";
  consent: boolean;
  consentRecordedAt?: string;
  capacityKw: number;
  location: { lat: number; lon: number; zone: string };
  installedOn?: string;
  simulated: boolean;
  /** Oldest first; one row per day. */
  readings: ReadingRow[];
}

export type FleetCase = Omit<
  CaseSummary,
  "vendorName" | "zone" | "pastDeadline" | "daysOverdue" | "daysOpen"
> & {
  reason: string;
  familyMessage?: string;
};
