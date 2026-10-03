import { Role } from "@/types";

/**
 * Canonical Workflow Stages for WBRE Record Adjudication.
 *
 * Stage 1: LODGED
 *   Statuses: EVIDENCE_SUBMITTED, SUBMITTED, PENDING, LODGED
 *   Allowed action: [ START REVIEW ] (SUPER_ADMIN, ADMIN, VERIFICATION_OFFICER, REVIEWER)
 *
 * Stage 2: UNDER_REVIEW
 *   Statuses: UNDER_INITIAL_REVIEW, UNDER_REVIEW, UNDER_VERIFICATION
 *   Allowed actions for SUPER_ADMIN & ADMIN: [ APPROVE APPLICATION ], [ REJECT APPLICATION ], [ REQUEST INFO ]
 *   Verification Officer: Restricted from approve/reject (audit & evidence review only)
 *
 * Stage 3: APPROVED / REJECTED
 *   Status APPROVED: [ GENERATE CERTIFICATE ] (SUPER_ADMIN, ADMIN only)
 *   Status REJECTED: Finalized rejection state with mandatory reason
 *
 * Stage 4: CERTIFICATE_GENERATED
 *   Status CERTIFICATE_GENERATED: [ VIEW CERTIFICATE ], [ DOWNLOAD CERTIFICATE ], [ OPEN VERIFICATION ]
 */
export type ApplicationStage =
  | "LODGED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CERTIFICATE_GENERATED"
  | "UNKNOWN";

export const STAGE_1_STATUSES = [
  "EVIDENCE_SUBMITTED",
  "SUBMITTED",
  "PENDING",
  "LODGED",
] as const;

export const STAGE_2_STATUSES = [
  "UNDER_INITIAL_REVIEW",
  "UNDER_REVIEW",
  "UNDER_VERIFICATION",
] as const;

/**
 * Returns true if the status represents the first lodged / pending review stage.
 */
export function isStage1Lodged(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  return (STAGE_1_STATUSES as readonly string[]).includes(s);
}

/**
 * Returns true if the status represents active review / verification.
 */
export function isStage2UnderReview(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  return (STAGE_2_STATUSES as readonly string[]).includes(s);
}

/**
 * Returns true if the status represents formal approval.
 */
export function isStage3Approved(status?: string | null): boolean {
  if (!status) return false;
  return status.trim().toUpperCase() === "APPROVED";
}

/**
 * Returns true if the status represents rejection.
 */
export function isStage3Rejected(status?: string | null): boolean {
  if (!status) return false;
  return status.trim().toUpperCase() === "REJECTED";
}

/**
 * Returns true if the status represents an issued / generated certificate.
 */
export function isStage4CertificateGenerated(
  status?: string | null,
  hasCertificate?: boolean
): boolean {
  if (hasCertificate) return true;
  if (!status) return false;
  return status.trim().toUpperCase() === "CERTIFICATE_GENERATED";
}

/**
 * Resolves the canonical adjudication stage from status and certificate availability.
 */
export function getApplicationStage(
  status?: string | null,
  hasCertificate?: boolean
): ApplicationStage {
  if (isStage4CertificateGenerated(status, hasCertificate)) {
    return "CERTIFICATE_GENERATED";
  }
  if (isStage3Approved(status)) {
    return "APPROVED";
  }
  if (isStage3Rejected(status)) {
    return "REJECTED";
  }
  if (isStage2UnderReview(status)) {
    return "UNDER_REVIEW";
  }
  if (isStage1Lodged(status)) {
    return "LODGED";
  }
  return "UNKNOWN";
}

/**
 * Formats a raw status string into a clean, human-readable label.
 */
export function getStatusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  const s = status.trim().toUpperCase();
  switch (s) {
    case "EVIDENCE_SUBMITTED":
      return "Evidence Submitted";
    case "SUBMITTED":
      return "Submitted";
    case "PENDING":
      return "Pending";
    case "LODGED":
      return "Lodged";
    case "UNDER_INITIAL_REVIEW":
    case "UNDER_REVIEW":
      return "Under Review";
    case "UNDER_VERIFICATION":
      return "Under Verification";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "CERTIFICATE_GENERATED":
      return "Certificate Generated";
    case "MORE_INFORMATION_REQUIRED":
      return "More Info Required";
    case "GUIDELINES_ISSUED":
      return "Guidelines Issued";
    case "ATTEMPT_SCHEDULED":
      return "Attempt Scheduled";
    default:
      return status;
  }
}

export interface ApplicationActionsConfig {
  stage: ApplicationStage;
  // Stage 1
  canStartReview: boolean;
  // Stage 2
  canApprove: boolean;
  canReject: boolean;
  canRequestInfo: boolean;
  isVerificationOfficerRestricted: boolean;
  // Stage 3
  canGenerateCertificate: boolean;
  // Stage 4
  canViewCertificate: boolean;
  canDownloadCertificate: boolean;
  canOpenVerification: boolean;
  // Unknown / fallback handling
  isUnknownStatus: boolean;
  unknownStatusMessage?: string | null;
}

/**
 * Centralized, authoritative calculation of available actions for an application
 * based on canonical status, user role, and certificate existence.
 */
export function getApplicationActions(
  status: string | null | undefined,
  role?: string | null,
  certificate?: any
): ApplicationActionsConfig {
  const hasCertificate = !!certificate || status === "CERTIFICATE_GENERATED";
  const stage = getApplicationStage(status, hasCertificate);

  const isSuperAdmin = role === Role.SUPER_ADMIN || role === "SUPER_ADMIN";
  const isAdmin = role === Role.ADMIN || role === "ADMIN";
  const isPrivilegedAdmin = isSuperAdmin || isAdmin;
  const isVerificationOfficer =
    role === Role.VERIFICATION_OFFICER ||
    role === "VERIFICATION_OFFICER" ||
    role === Role.REVIEWER ||
    role === "REVIEWER";

  const config: ApplicationActionsConfig = {
    stage,
    canStartReview: false,
    canApprove: false,
    canReject: false,
    canRequestInfo: false,
    isVerificationOfficerRestricted: false,
    canGenerateCertificate: false,
    canViewCertificate: false,
    canDownloadCertificate: false,
    canOpenVerification: false,
    isUnknownStatus: false,
    unknownStatusMessage: null,
  };

  switch (stage) {
    case "LODGED":
      // STAGE 1: EVIDENCE_SUBMITTED, SUBMITTED, PENDING, LODGED
      // Allowed action for SUPER_ADMIN, ADMIN, VERIFICATION_OFFICER / REVIEWER: [ START REVIEW ]
      config.canStartReview = true;
      break;

    case "UNDER_REVIEW":
      // STAGE 2: UNDER_INITIAL_REVIEW, UNDER_REVIEW, UNDER_VERIFICATION
      if (isPrivilegedAdmin) {
        config.canApprove = true;
        config.canReject = true;
        config.canRequestInfo = true;
      } else if (isVerificationOfficer) {
        config.isVerificationOfficerRestricted = true;
        config.canRequestInfo = true;
      }
      break;

    case "APPROVED":
      // STAGE 3: APPROVED
      // Explicit certificate generation action for SUPER_ADMIN and ADMIN
      if (isPrivilegedAdmin && !hasCertificate) {
        config.canGenerateCertificate = true;
      }
      break;

    case "REJECTED":
      // STAGE 3: REJECTED - final state, no further actions allowed
      break;

    case "CERTIFICATE_GENERATED":
      // STAGE 4: CERTIFICATE_GENERATED
      config.canViewCertificate = true;
      config.canDownloadCertificate = true;
      config.canOpenVerification = true;
      break;

    default:
      // Unknown status: Never leave the panel silently empty!
      config.isUnknownStatus = true;
      config.unknownStatusMessage = `Workflow status requires administrator attention. Status: "${status || "UNKNOWN"}"`;
      config.canStartReview = isPrivilegedAdmin || isVerificationOfficer;
      break;
  }

  return config;
}
