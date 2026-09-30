import { Role } from "@prisma/client";

/**
 * World Book of Record Excellence (WBRE) Role-Based Access Control (RBAC)
 *
 * Roles:
 * - SUPER_ADMIN: Full administrative access (users, settings, applications, certificates, adjudication, evidence)
 * - ADMIN: Adjudication management, evidence review, approve/reject applications, certificate issuance, add/remove evidence
 * - VERIFICATION_OFFICER: View applications, review evidence, preview/download evidence, inspect certificates, audit lookups.
 *   RESTRICTED: Cannot approve, reject, generate certificates, revoke certificates, manage users, or add/remove evidence.
 */

export const RolePermissions = {
  // User Management
  MANAGE_USERS: [Role.SUPER_ADMIN],

  // Settings & System Engine
  MANAGE_SETTINGS: [Role.SUPER_ADMIN],

  // Application Adjudication
  VIEW_APPLICATIONS: [Role.SUPER_ADMIN, Role.ADMIN, Role.VERIFICATION_OFFICER],
  START_REVIEW: [Role.SUPER_ADMIN, Role.ADMIN, Role.VERIFICATION_OFFICER],
  APPROVE_APPLICATION: [Role.SUPER_ADMIN, Role.ADMIN],
  REJECT_APPLICATION: [Role.SUPER_ADMIN, Role.ADMIN],

  // Evidence Operations
  VIEW_EVIDENCE: [Role.SUPER_ADMIN, Role.ADMIN, Role.VERIFICATION_OFFICER],
  DOWNLOAD_EVIDENCE: [Role.SUPER_ADMIN, Role.ADMIN, Role.VERIFICATION_OFFICER],
  UPLOAD_EVIDENCE: [Role.SUPER_ADMIN, Role.ADMIN],
  REMOVE_EVIDENCE: [Role.SUPER_ADMIN, Role.ADMIN],
  DOWNLOAD_DOSSIER: [Role.SUPER_ADMIN, Role.ADMIN, Role.VERIFICATION_OFFICER],

  // Certificate Operations
  VIEW_CERTIFICATES: [Role.SUPER_ADMIN, Role.ADMIN, Role.VERIFICATION_OFFICER],
  GENERATE_CERTIFICATE: [Role.SUPER_ADMIN, Role.ADMIN],
  REVOKE_CERTIFICATE: [Role.SUPER_ADMIN, Role.ADMIN],

  // Verification Operations
  PERFORM_VERIFICATION: [Role.SUPER_ADMIN, Role.ADMIN, Role.VERIFICATION_OFFICER],
  VIEW_AUDIT_LOGS: [Role.SUPER_ADMIN, Role.ADMIN, Role.VERIFICATION_OFFICER],
} as const;

export type Permission = keyof typeof RolePermissions;

/**
 * Checks whether the specified role has the required permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = RolePermissions[permission] as readonly Role[];
  return allowedRoles.includes(role);
}

export function canViewApplications(role: Role): boolean {
  return hasPermission(role, "VIEW_APPLICATIONS");
}

/**
 * Checks whether the role is permitted to start reviewing an application.
 */
export function canStartReview(role: Role): boolean {
  return hasPermission(role, "START_REVIEW");
}

/**
 * Checks whether the role is permitted to approve applications.
 */
export function canApproveApplication(role: Role): boolean {
  return hasPermission(role, "APPROVE_APPLICATION");
}

/**
 * Checks whether the role is permitted to reject applications.
 */
export function canRejectApplication(role: Role): boolean {
  return hasPermission(role, "REJECT_APPLICATION");
}

/**
 * Checks whether the role is permitted to generate or reissue certificates.
 */
export function canGenerateCertificate(role: Role): boolean {
  return hasPermission(role, "GENERATE_CERTIFICATE");
}

/**
 * Checks whether the role is permitted to revoke certificates.
 */
export function canRevokeCertificate(role: Role): boolean {
  return hasPermission(role, "REVOKE_CERTIFICATE");
}

/**
 * Checks whether the role is permitted to view certificates.
 */
export function canViewCertificates(role: Role): boolean {
  return hasPermission(role, "VIEW_CERTIFICATES");
}

/**
 * Checks whether the role is permitted to manage admin staff users.
 */
export function canManageUsers(role: Role): boolean {
  return hasPermission(role, "MANAGE_USERS");
}

/**
 * Checks whether the role is permitted to upload additional evidence.
 */
export function canUploadEvidence(role: Role): boolean {
  return hasPermission(role, "UPLOAD_EVIDENCE");
}

/**
 * Checks whether the role is permitted to delete/remove evidence.
 */
export function canRemoveEvidence(role: Role): boolean {
  return hasPermission(role, "REMOVE_EVIDENCE");
}

/**
 * Checks whether the role is permitted to download evidence or dossiers.
 */
export function canDownloadEvidence(role: Role): boolean {
  return hasPermission(role, "DOWNLOAD_EVIDENCE");
}
