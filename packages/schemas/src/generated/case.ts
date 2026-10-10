/* Generated from schemas/case.schema.json by scripts/generate.mjs. Do not edit. */

/**
 * Diagnosed cause. Smog never opens a case.
 */
export type CaseCause = "dust" | "fault";
export type CaseStatus = "open" | "vendor_notified" | "escalated" | "verified" | "closed";

/**
 * A free-maintenance claim filed with a vendor.
 */
export interface Case {
  caseId: string;
  systemId: string;
  vendorId: string;
  cause: CaseCause;
  status: CaseStatus;
  openedAt: string;
  vendorDeadline: string;
  escalatedAt?: string;
  verifiedAt?: string;
  /**
   * S3 URIs of evidence attached to the complaint.
   */
  evidence?: string[];
  /**
   * Why the agent opened the case.
   */
  reason?: string;
}
