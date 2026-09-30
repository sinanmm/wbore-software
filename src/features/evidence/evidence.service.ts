import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { recordAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";
import { canUploadEvidence, canRemoveEvidence, canDownloadEvidence } from "@/lib/rbac";
import {
  validateEvidenceFile,
  sanitizeFilename,
  MAX_FILE_COUNT,
  MAX_TOTAL_EVIDENCE_SIZE_BYTES,
  MAX_DOSSIER_SIZE_BYTES,
  MAX_TOTAL_SIZE_MB,
} from "@/lib/file-security";
import { ZipArchive } from "@/lib/zip";

export interface UploadAdminEvidenceParams {
  applicationId: string;
  fileBuffer: Buffer;
  filename: string;
  declaredMime?: string;
  evidenceCategory?: string;
  notes?: string;
  actor: { userId: string; role: Role };
  ipAddress?: string;
}

export interface RemoveEvidenceParams {
  applicationId: string;
  evidenceId: string;
  reason: string;
  actor: { userId: string; role: Role };
  ipAddress?: string;
}

export interface EvidenceAccessParams {
  applicationId: string;
  evidenceId: string;
  actor: { userId: string; role: Role };
  ipAddress?: string;
}

export class EvidenceService {
  /**
   * Retrieves all evidence files associated with an application.
   */
  public static async getEvidenceForApplication(applicationId: string) {
    return await db.evidenceFile.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Upload additional evidence received by WBRE staff.
   * Transaction safe: Automatically cleans up uploaded files if DB insertion fails.
   */
  public static async uploadAdminEvidence(params: UploadAdminEvidenceParams) {
    const {
      applicationId,
      fileBuffer,
      filename,
      declaredMime,
      evidenceCategory,
      notes,
      actor,
      ipAddress,
    } = params;

    // 1. RBAC Check
    if (!canUploadEvidence(actor.role)) {
      throw new Error("FORBIDDEN: Verification Officers are not permitted to upload additional evidence.");
    }

    // 2. Validate Application exists
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { evidenceFiles: true },
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    // 3. File Count & Total Size Limit Check
    if (application.evidenceFiles.length >= MAX_FILE_COUNT) {
      throw new Error(`Maximum file count reached (${MAX_FILE_COUNT} files limit).`);
    }

    const currentTotalSize = application.evidenceFiles.reduce((acc, f) => acc + f.fileSize, 0);
    if (currentTotalSize + fileBuffer.length > MAX_TOTAL_EVIDENCE_SIZE_BYTES) {
      throw new Error(`Total evidence files size exceeds the ${MAX_TOTAL_SIZE_MB}MB limit for this application.`);
    }

    // 4. File Security & Magic Byte Validation
    const validation = validateEvidenceFile(fileBuffer, filename, declaredMime);
    if (!validation.valid) {
      throw new Error(validation.error || "File validation failed.");
    }

    const sanitizedName = sanitizeFilename(filename);

    // 5. Store file via storage adapter
    const uploadResult = await storage.uploadFile(
      fileBuffer,
      sanitizedName,
      "evidence",
      validation.detectedMime || "application/octet-stream"
    );

    // 6. Insert database record with failure cleanup
    try {
      const evidence = await db.evidenceFile.create({
        data: {
          applicationId,
          fileName: uploadResult.storageKey.split("/").pop() || sanitizedName,
          originalName: sanitizedName,
          fileUrl: uploadResult.fileUrl,
          fileType: validation.detectedMime || "application/octet-stream",
          fileSize: fileBuffer.length,
        },
      });

      // 7. Audit log creation
      const categoryTag = evidenceCategory ? `[${evidenceCategory}]` : "";
      const noteTag = notes ? `Note: ${notes}` : "";
      const details = `Uploaded additional evidence ${categoryTag} "${sanitizedName}" (${Math.round(
        fileBuffer.length / 1024
      )} KB). ${noteTag}`.trim();

      await recordAuditLog({
        userId: actor.userId,
        applicationId,
        action: "EVIDENCE_UPLOADED",
        details,
        ipAddress: ipAddress || null,
      });

      return evidence;
    } catch (dbError) {
      // Transaction safety: Clean up physical file if DB fails
      console.error("Database insert failed during evidence upload, cleaning up storage:", dbError);
      await storage.deleteFile(uploadResult.storageKey);
      throw new Error("Failed to register evidence record in database. Storage cleaned up.");
    }
  }

  /**
   * Securely remove an evidence file with mandatory reason and audit logging.
   */
  public static async removeEvidence(params: RemoveEvidenceParams) {
    const { applicationId, evidenceId, reason, actor, ipAddress } = params;

    // 1. RBAC Check
    if (!canRemoveEvidence(actor.role)) {
      throw new Error("FORBIDDEN: Verification Officers are not permitted to remove evidence.");
    }

    // 2. Reason Validation
    if (!reason || reason.trim().length < 3) {
      throw new Error("A valid reason (minimum 3 characters) is required to remove evidence.");
    }

    // 3. Locate EvidenceFile
    const evidence = await db.evidenceFile.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence || evidence.applicationId !== applicationId) {
      throw new Error("Evidence file not found on this application.");
    }

    // 4. Delete Database Record
    await db.evidenceFile.delete({
      where: { id: evidenceId },
    });

    // 5. Delete physical file from storage
    await storage.deleteFile(evidence.fileUrl);

    // 6. Audit Log
    await recordAuditLog({
      userId: actor.userId,
      applicationId,
      action: "EVIDENCE_REMOVED",
      details: `Removed evidence "${evidence.originalName}" (${evidence.fileName}). Reason: ${reason.trim()}`,
      ipAddress: ipAddress || null,
    });

    return {
      success: true,
      removedFileName: evidence.originalName,
    };
  }

  /**
   * Retrieves an evidence file buffer for secure download with audit logging.
   */
  public static async downloadEvidence(params: EvidenceAccessParams) {
    const { applicationId, evidenceId, actor, ipAddress } = params;

    if (!canDownloadEvidence(actor.role)) {
      throw new Error("FORBIDDEN: You do not have permission to download evidence.");
    }

    const evidence = await db.evidenceFile.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence || evidence.applicationId !== applicationId) {
      throw new Error("Evidence file not found.");
    }

    const fileBuffer = await storage.getFile(evidence.fileUrl);

    // Audit log
    await recordAuditLog({
      userId: actor.userId,
      applicationId,
      action: "EVIDENCE_DOWNLOADED",
      details: `Downloaded evidence file "${evidence.originalName}"`,
      ipAddress: ipAddress || null,
    });

    return {
      fileBuffer,
      filename: evidence.originalName,
      mimeType: evidence.fileType,
      fileSize: evidence.fileSize,
    };
  }

  /**
   * Retrieves an evidence file buffer for secure browser preview with audit logging.
   */
  public static async previewEvidence(params: EvidenceAccessParams) {
    const { applicationId, evidenceId, actor, ipAddress } = params;

    if (!canDownloadEvidence(actor.role)) {
      throw new Error("FORBIDDEN: You do not have permission to view evidence.");
    }

    const evidence = await db.evidenceFile.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence || evidence.applicationId !== applicationId) {
      throw new Error("Evidence file not found.");
    }

    const fileBuffer = await storage.getFile(evidence.fileUrl);

    // Audit log
    await recordAuditLog({
      userId: actor.userId,
      applicationId,
      action: "EVIDENCE_VIEWED",
      details: `Previewed evidence file "${evidence.originalName}"`,
      ipAddress: ipAddress || null,
    });

    return {
      fileBuffer,
      filename: evidence.originalName,
      mimeType: evidence.fileType,
      fileSize: evidence.fileSize,
    };
  }

  /**
   * Generates a complete ZIP dossier of all evidence files for an application.
   */
  public static async createDossierZip(params: {
    applicationId: string;
    actor: { userId: string; role: Role };
    ipAddress?: string;
  }) {
    const { applicationId, actor, ipAddress } = params;

    if (!canDownloadEvidence(actor.role)) {
      throw new Error("FORBIDDEN: You do not have permission to download evidence dossiers.");
    }

    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        evidenceFiles: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    if (application.evidenceFiles.length === 0) {
      throw new Error("No evidence files attached to this application to build a dossier.");
    }

    // Total size check to avoid out-of-memory
    const totalRawSize = application.evidenceFiles.reduce((acc, f) => acc + f.fileSize, 0);
    if (totalRawSize > MAX_DOSSIER_SIZE_BYTES) {
      throw new Error(
        `Total dossier size (${Math.round(
          totalRawSize / (1024 * 1024)
        )}MB) exceeds the maximum allowed export limit of ${MAX_TOTAL_SIZE_MB}MB.`
      );
    }

    const zip = new ZipArchive();
    const folderPrefix = `WBRE_${application.applicationNumber}_Evidence`;

    const seenNames = new Set<string>();

    for (let i = 0; i < application.evidenceFiles.length; i++) {
      const file = application.evidenceFiles[i];
      try {
        const buffer = await storage.getFile(file.fileUrl);

        // Sanitize name and avoid collision
        let safeName = sanitizeFilename(file.originalName);
        if (seenNames.has(safeName)) {
          safeName = `${i + 1}_${safeName}`;
        }
        seenNames.add(safeName);

        const indexPrefix = String(i + 1).padStart(2, "0");
        const zipPath = `${folderPrefix}/${indexPrefix}_${safeName}`;

        zip.addFile(zipPath, buffer, file.createdAt);
      } catch (fileErr) {
        console.warn(`Could not read file ${file.fileUrl} for dossier:`, fileErr);
        // Include placeholder text for missing file rather than crashing entire ZIP
        const notice = Buffer.from(
          `Notice: File ${file.originalName} could not be read from storage during dossier compilation.\n`
        );
        zip.addFile(`${folderPrefix}/${String(i + 1).padStart(2, "0")}_MISSING_${file.originalName}.txt`, notice);
      }
    }

    const zipBuffer = zip.toBuffer();
    const zipFilename = `WBRE-${application.applicationNumber}-EVIDENCE-DOSSIER.zip`;

    // Audit log
    await recordAuditLog({
      userId: actor.userId,
      applicationId,
      action: "EVIDENCE_DOSSIER_DOWNLOADED",
      details: `Generated and downloaded complete evidence dossier (${application.evidenceFiles.length} files, ${Math.round(
        zipBuffer.length / 1024
      )} KB)`,
      ipAddress: ipAddress || null,
    });

    return {
      zipBuffer,
      zipFilename,
      fileCount: application.evidenceFiles.length,
    };
  }
}
