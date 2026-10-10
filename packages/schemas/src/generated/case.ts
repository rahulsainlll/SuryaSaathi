/* Generated from schemas/case.schema.json by scripts/generate.mjs. Do not edit. */

/**
 * Diagnosed cause. Smog never opens a case.
 */
export type CaseCause = "dust" | "fault";
/**
 * filed → fixed → verified, or filed → escalated (deadline missed) → fixed → verified. A dust case can also go straight to verified when rain cleans the panels.
 */
export type CaseStatus = "filed" | "escalated" | "fixed" | "verified";
/**
 * Who resolved the problem.
 */
export type CaseResolver = "vendor" | "discom" | "rain";

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
  fixedAt?: string;
  verifiedAt?: string;
  resolvedBy?: CaseResolver;
  /**
   * S3 URIs of evidence attached to the complaint.
   */
  evidence?: string[];
  /**
   * Why the agent opened the case.
   */
  reason?: string;
}
