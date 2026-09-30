import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { getCategoryCode, formatDate } from "@/lib/utils";
import { CertificateGenerator } from "./certificate.generator";
import { Role } from "@prisma/client";
import { canGenerateCertificate } from "@/lib/rbac";

export class CertificateService {
  /**
   * Generates a unique sequential Record ID: WBRE-[CATEGORY]-[YEAR]-[NUMBER]
   * Example: WBRE-TEC-2026-000101
   */
  /**
   * Generates a unique sequential Record ID: WBRE-[CATEGORY]-[YEAR]-[SEQUENCE]
   * Example: WBRE-TEC-2026-000101
   */
  public static async generateRecordId(category: string, client = db): Promise<string> {
    const year = new Date().getFullYear();
    const categoryCode = getCategoryCode(category);
    const prefix = `WBRE-${categoryCode}-${year}-`;

    const latest = await client.certificate.findFirst({
      where: {
        recordId: {
          startsWith: prefix,
        },
      },
      orderBy: {
        recordId: "desc",
      },
      select: {
        recordId: true,
      },
    });

    let nextSeq = 101;
    if (latest?.recordId) {
      const parts = latest.recordId.split("-");
      const lastSeqStr = parts[parts.length - 1];
      const parsed = parseInt(lastSeqStr, 10);
      if (!isNaN(parsed) && parsed >= 101) {
        nextSeq = parsed + 1;
      }
    }

    const sequence = String(nextSeq).padStart(6, "0");
    return `${prefix}${sequence}`;
  }

  /**
   * Generates a unique sequential Certificate Number: WBRE-CERT-[YEAR]-[SEQUENCE]
   * Example: WBRE-CERT-2026-000101
   */
  public static async generateCertificateNumber(client = db): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WBRE-CERT-${year}-`;

    const latest = await client.certificate.findFirst({
      where: {
        certificateNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        certificateNumber: "desc",
      },
      select: {
        certificateNumber: true,
      },
    });

    let nextSeq = 101;
    if (latest?.certificateNumber) {
      const parts = latest.certificateNumber.split("-");
      const lastSeqStr = parts[parts.length - 1];
      const parsed = parseInt(lastSeqStr, 10);
      if (!isNaN(parsed) && parsed >= 101) {
        nextSeq = parsed + 1;
      }
    }

    const sequence = String(nextSeq).padStart(6, "0");
    return `${prefix}${sequence}`;
  }

  /**
   * Generates and stores an official certificate for an approved application.
   * Requires SUPER_ADMIN or ADMIN role.
   * Enforces strict idempotency, concurrency safety, and storage-database consistency.
   */
  public static async generateCertificateForApplication(
    applicationId: string,
    adminUserId?: string,
    adminRole?: Role
  ) {
    if (adminRole && !canGenerateCertificate(adminRole)) {
      throw new Error("FORBIDDEN: Verification Officers are not permitted to generate certificates.");
    }

    // 1. Load application with existing certificate
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { certificate: true },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    // 2. Idempotency Check: Return existing certificate if already generated
    if (application.certificate) {
      return application.certificate;
    }

    // 3. Status validation: Application MUST be in APPROVED status
    if (application.status !== "APPROVED" && application.status !== "CERTIFICATE_GENERATED") {
      throw new Error(
        `Invalid status: Cannot generate certificate for application in ${application.status} status. The application must be approved first.`
      );
    }

    // 4. Generate unique tracking identifiers
    let recordId = await this.generateRecordId(application.category);
    let certificateNumber = await this.generateCertificateNumber();

    // Verify uniqueness against existing database records
    let attempts = 0;
    while (attempts < 5) {
      const [existingRecord, existingCert] = await Promise.all([
        db.certificate.findUnique({ where: { recordId } }),
        db.certificate.findUnique({ where: { certificateNumber } }),
      ]);

      if (!existingRecord && !existingCert) break;

      attempts++;
      const offset = attempts;
      const year = new Date().getFullYear();
      const catCode = getCategoryCode(application.category);
      recordId = `WBRE-${catCode}-${year}-${String(101 + offset).padStart(6, "0")}`;
      certificateNumber = `WBRE-CERT-${year}-${String(101 + offset).padStart(6, "0")}`;
    }

    const dateFormatted = formatDate(new Date());

    // 5. Generate high-resolution PDF and store via StorageAdapter
    let generatedResult;
    try {
      generatedResult = await CertificateGenerator.generate({
        recipientName: application.applicantName,
        category: application.category,
        achievementTitle: application.achievementTitle,
        place: application.place,
        recordId,
        certificateNumber,
        dateOfRecognition: dateFormatted,
      });
    } catch (genErr: any) {
      throw new Error(`Certificate PDF generation failed: ${genErr.message}`);
    }

    const { pdfUrl, storageKey, qrCodeDataUrl, verificationUrl } = generatedResult;

    // 6. Persist to database atomically with rollback of storage on failure
    try {
      const certificate = await db.$transaction(async (tx) => {
        // Double-check inside transaction to prevent race conditions
        const existingTxCert = await tx.certificate.findUnique({
          where: { applicationId: application.id },
        });

        if (existingTxCert) {
          return existingTxCert;
        }

        const createdCert = await tx.certificate.create({
          data: {
            applicationId: application.id,
            recordId,
            certificateNumber,
            recipientName: application.applicantName,
            category: application.category,
            achievementTitle: application.achievementTitle,
            place: application.place,
            issueDate: new Date(),
            pdfUrl,
            certificatePdfUrl: pdfUrl,
            verificationStatus: "VALID",
            qrCodeUrl: qrCodeDataUrl,
            verificationUrl,
          },
        });

        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: "CERTIFICATE_GENERATED",
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminUserId || null,
            applicationId: application.id,
            action: "CERTIFICATE_GENERATED",
            details: `Generated Certificate ${certificateNumber} with Record ID ${recordId} for ${application.applicantName}`,
          },
        });

        return createdCert;
      });

      return certificate;
    } catch (dbErr: any) {
      // Storage consistency cleanup: Remove uploaded PDF if database transaction failed
      try {
        const { storage } = await import("@/lib/storage");
        await storage.deleteFile(storageKey || pdfUrl);
      } catch (cleanupErr) {
        console.warn("Storage rollback cleanup warning:", cleanupErr);
      }

      // Check if failure was due to duplicate concurrent insertion
      if (dbErr.code === "P2002") {
        const concurrentCert = await db.certificate.findUnique({
          where: { applicationId },
        });
        if (concurrentCert) {
          return concurrentCert;
        }
      }

      throw new Error(`Database error during certificate registration: ${dbErr.message}`);
    }
  }

  /**
   * Summary metrics for certificate registry: total, valid, revoked counts.
   */
  public static async getCertificateCounts() {
    const [total, valid, revoked] = await Promise.all([
      db.certificate.count(),
      db.certificate.count({ where: { verificationStatus: "VALID" } }),
      db.certificate.count({ where: { verificationStatus: "REVOKED" } }),
    ]);

    return { total, valid, revoked };
  }

  /**
   * Paginated and filtered certificate query for administrative registry.
   */
  public static async getCertificatesPaged(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "ALL" | "VALID" | "REVOKED";
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search filter across Record ID, Certificate Number, Recipient Name, Achievement Title
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { recordId: { contains: q, mode: "insensitive" } },
        { certificateNumber: { contains: q, mode: "insensitive" } },
        { recipientName: { contains: q, mode: "insensitive" } },
        { achievementTitle: { contains: q, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (params.status && params.status !== "ALL") {
      where.verificationStatus = params.status;
    }

    // Category filter
    if (params.category && params.category.trim() && params.category !== "ALL") {
      where.category = { contains: params.category.trim(), mode: "insensitive" };
    }

    // Date range filter on issueDate
    if (params.dateFrom || params.dateTo) {
      where.issueDate = {};
      if (params.dateFrom) {
        const fromDate = new Date(params.dateFrom);
        if (!isNaN(fromDate.getTime())) {
          where.issueDate.gte = fromDate;
        }
      }
      if (params.dateTo) {
        const toDate = new Date(params.dateTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          where.issueDate.lte = toDate;
        }
      }
    }

    const [total, certificates, counts] = await Promise.all([
      db.certificate.count({ where }),
      db.certificate.findMany({
        where,
        orderBy: { generatedAt: "desc" },
        skip,
        take: limit,
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              applicantEmail: true,
              country: true,
            },
          },
        },
      }),
      this.getCertificateCounts(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      certificates,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      counts,
    };
  }

  /**
   * Look up certificate by ID or Record ID with originating application and audit history.
   */
  public static async getCertificateByIdWithHistory(idOrRecordId: string) {
    const cleanId = idOrRecordId.trim();

    const cert = await db.certificate.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { recordId: { equals: cleanId, mode: "insensitive" } },
          { certificateNumber: { equals: cleanId, mode: "insensitive" } },
        ],
      },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            applicantName: true,
            applicantEmail: true,
            applicantPhone: true,
            country: true,
            address: true,
            category: true,
            achievementTitle: true,
            description: true,
            place: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!cert) return null;

    // Load related audit logs for certificate lifecycle
    const auditLogs = await db.auditLog.findMany({
      where: {
        applicationId: cert.applicationId,
        action: {
          in: ["CERTIFICATE_GENERATED", "CERTIFICATE_REVOKED", "CERTIFICATE_VERIFIED"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      ...cert,
      auditLogs,
    };
  }

  /**
   * Revoke an existing certificate (SUPER_ADMIN or ADMIN only).
   * Strictly validates mandatory non-empty reason.
   * Returns idempotent response if already revoked.
   * Does NOT modify the historical PDF file in storage.
   */
  public static async revokeCertificate(params: {
    certificateId: string;
    reason: string;
    actor: { userId: string; role: Role };
  }) {
    const { canRevokeCertificate } = await import("@/lib/rbac");

    if (!canRevokeCertificate(params.actor.role)) {
      throw new Error("FORBIDDEN: Verification Officers are not permitted to revoke certificates.");
    }

    const cleanReason = (params.reason || "").trim();
    if (!cleanReason) {
      throw new Error("Revocation reason is mandatory and cannot be empty or whitespace only.");
    }

    const cleanId = params.certificateId.trim();

    const cert = await db.certificate.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { recordId: { equals: cleanId, mode: "insensitive" } },
          { certificateNumber: { equals: cleanId, mode: "insensitive" } },
        ],
      },
    });

    if (!cert) {
      throw new Error("Certificate not found.");
    }

    // Idempotency check: If already revoked, return without creating duplicate events
    if (cert.verificationStatus === "REVOKED") {
      return {
        certificate: cert,
        alreadyRevoked: true,
        message: `Certificate ${cert.certificateNumber} (${cert.recordId}) is already revoked.`,
      };
    }

    const updated = await db.certificate.update({
      where: { id: cert.id },
      data: {
        verificationStatus: "REVOKED",
      },
    });

    const auditPayload = {
      certificateId: cert.id,
      applicationId: cert.applicationId,
      recordId: cert.recordId,
      certificateNumber: cert.certificateNumber,
      reason: cleanReason,
      actorUserId: params.actor.userId,
      actorRole: params.actor.role,
      timestamp: new Date().toISOString(),
    };

    await recordAuditLog({
      userId: params.actor.userId,
      applicationId: cert.applicationId,
      action: "CERTIFICATE_REVOKED",
      details: JSON.stringify(auditPayload),
    });

    return {
      certificate: updated,
      alreadyRevoked: false,
      message: `Certificate ${cert.certificateNumber} (${cert.recordId}) revoked successfully.`,
    };
  }

  /**
   * Look up certificate by Record ID or Certificate Number
   */
  public static async findByRecordOrCertNumber(identifier: string) {
    const cleanId = identifier.trim().toUpperCase();

    return await db.certificate.findFirst({
      where: {
        OR: [
          { recordId: { equals: cleanId, mode: "insensitive" } },
          { certificateNumber: { equals: cleanId, mode: "insensitive" } },
        ],
      },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            applicantName: true,
            category: true,
            achievementTitle: true,
            description: true,
            place: true,
            country: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * List all generated certificates
   */
  public static async getAllCertificates(limit = 100) {
    return await db.certificate.findMany({
      orderBy: { generatedAt: "desc" },
      take: limit,
      include: {
        application: {
          select: {
            applicationNumber: true,
            applicantEmail: true,
            country: true,
          },
        },
      },
    });
  }
}

