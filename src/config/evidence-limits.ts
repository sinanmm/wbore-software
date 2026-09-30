/**
 * Canonical WBRE Evidence Upload Limits & Configuration
 *
 * This file is the single source of truth for evidence file constraints across
 * the entire platform, including server-side validation, database storage safeguards,
 * and client-side UI forms / uploaders.
 */

export const MAX_FILE_SIZE_MB = 25;
export const MAX_TOTAL_SIZE_MB = 250;
export const MAX_FILE_COUNT = 10;

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 26,214,400 bytes (25 MB)
export const MAX_TOTAL_EVIDENCE_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024; // 262,144,000 bytes (250 MB)
export const MAX_DOSSIER_SIZE_BYTES = MAX_TOTAL_EVIDENCE_SIZE_BYTES; // 250 MB for dossier ZIP export

export const EVIDENCE_LIMITS = {
  MAX_FILE_SIZE_MB,
  MAX_TOTAL_SIZE_MB,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_EVIDENCE_SIZE_BYTES,
  MAX_DOSSIER_SIZE_BYTES,
} as const;
