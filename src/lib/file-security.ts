import path from "path";
import {
  MAX_FILE_SIZE_MB,
  MAX_TOTAL_SIZE_MB,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_EVIDENCE_SIZE_BYTES,
  MAX_DOSSIER_SIZE_BYTES,
  EVIDENCE_LIMITS,
} from "../config/evidence-limits";

export {
  MAX_FILE_SIZE_MB,
  MAX_TOTAL_SIZE_MB,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_EVIDENCE_SIZE_BYTES,
  MAX_DOSSIER_SIZE_BYTES,
  EVIDENCE_LIMITS,
};

export interface AllowedFileType {
  mime: string;
  extensions: string[];
  category: "IMAGE" | "DOCUMENT" | "VIDEO";
}

export const ALLOWED_EVIDENCE_TYPES: Record<string, AllowedFileType> = {
  // Images
  "image/jpeg": {
    mime: "image/jpeg",
    extensions: [".jpg", ".jpeg"],
    category: "IMAGE",
  },
  "image/png": {
    mime: "image/png",
    extensions: [".png"],
    category: "IMAGE",
  },
  "image/webp": {
    mime: "image/webp",
    extensions: [".webp"],
    category: "IMAGE",
  },

  // Documents
  "application/pdf": {
    mime: "application/pdf",
    extensions: [".pdf"],
    category: "DOCUMENT",
  },
  "application/msword": {
    mime: "application/msword",
    extensions: [".doc"],
    category: "DOCUMENT",
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: [".docx"],
    category: "DOCUMENT",
  },

  // Videos
  "video/mp4": {
    mime: "video/mp4",
    extensions: [".mp4"],
    category: "VIDEO",
  },
  "video/quicktime": {
    mime: "video/quicktime",
    extensions: [".mov"],
    category: "VIDEO",
  },
};

// Explicitly blocked malicious/executable extensions
export const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".sh", ".bat", ".cmd", ".com", ".msi",
  ".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs",
  ".php", ".phtml", ".php3", ".php4", ".php5", ".phps",
  ".html", ".htm", ".xhtml", ".shtml", ".svg",
  ".jar", ".py", ".pyc", ".pl", ".cgi",
  ".dll", ".so", ".dylib", ".vbs", ".ps1", ".psm1",
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
  category?: "IMAGE" | "DOCUMENT" | "VIDEO";
}

/**
 * Validates file signatures (magic bytes) to ensure file content matches its declared format.
 * Prevents disguised executable / script uploads.
 */
export function validateFileMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { valid: true, detectedMime: "image/webp" };
  }

  // 4. PDF: %PDF (25 50 44 46)
  if (buffer.toString("ascii", 0, 4) === "%PDF") {
    return { valid: true, detectedMime: "application/pdf" };
  }

  // 5. DOCX: PK\x03\x04 (Zip header 50 4B 03 04)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return {
      valid: true,
      detectedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  // 6. DOC (Legacy Compound Binary): D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return { valid: true, detectedMime: "application/msword" };
  }

  // 7. MP4 / MOV (ISO Base Media): bytes 4-8 contain ftyp, moov, mdat, or wide
  if (buffer.length >= 12) {
    const brand = buffer.toString("ascii", 4, 8);
    if (brand === "ftyp") {
      // Check major brand for QuickTime vs MP4
      const majorBrand = buffer.toString("ascii", 8, 12).toLowerCase();
      if (majorBrand.includes("qt")) {
        return { valid: true, detectedMime: "video/quicktime" };
      }
      return { valid: true, detectedMime: "video/mp4" };
    }
    if (brand === "moov" || brand === "mdat" || brand === "wide") {
      return { valid: true, detectedMime: "video/quicktime" };
    }
  }

  return { valid: false };
}

/**
 * Comprehensive server-side validation for an uploaded evidence file.
 */
export function validateEvidenceFile(
  buffer: Buffer,
  filename: string,
  declaredMime?: string
): ValidationResult {
  // 1. File size check
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "The uploaded file is empty." };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${filename}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  // 2. Extension check
  const ext = path.extname(filename).toLowerCase();
  if (!ext || ext.length < 2) {
    return { valid: false, error: `File "${filename}" is missing a valid extension.` };
  }

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Files with extension "${ext}" are strictly blocked for security reasons.`,
    };
  }

  // 3. Find matching allowed file type by extension
  const matchedType = Object.values(ALLOWED_EVIDENCE_TYPES).find((t) =>
    t.extensions.includes(ext)
  );

  if (!matchedType) {
    return {
      valid: false,
      error: `File format "${ext}" is not supported. Allowed formats: JPG, PNG, WEBP, PDF, DOC, DOCX, MP4, MOV.`,
    };
  }

  // 4. Magic bytes verification
  const magicCheck = validateFileMagicBytes(buffer);
  if (!magicCheck.valid) {
    return {
      valid: false,
      error: `File content for "${filename}" does not match its declared format (${ext}). Disguised or corrupted files are rejected.`,
    };
  }

  // Verify that magic bytes match the expected category
  const detectedType = ALLOWED_EVIDENCE_TYPES[magicCheck.detectedMime || ""];
  if (detectedType && detectedType.category !== matchedType.category) {
    return {
      valid: false,
      error: `File signature mismatch: File has ${ext} extension but content appears to be ${detectedType.category}.`,
    };
  }

  return {
    valid: true,
    detectedMime: magicCheck.detectedMime || matchedType.mime,
    category: matchedType.category,
  };
}

/**
 * Sanitizes filename to prevent directory traversal and special character exploits.
 */
export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const base = path
    .basename(filename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);

  return `${base || "evidence_file"}${ext}`;
}
