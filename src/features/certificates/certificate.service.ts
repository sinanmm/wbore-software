import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { getCategoryCode, formatDate } from "@/lib/utils";
import { CertificateGenerator } from "./certificate.generator";
import { Role, CertificateSummary } from "@/types";
import { canGenerateCertificate, canRevokeCertificate } from "@/lib/rbac";

export function toCertificateSummary(
  cert: any,
  record?: any,
  application?: any
): CertificateSummary {
  const rec = record || cert.record;
  const canonicalRecordId = rec?.recordId || cert.recordId;
  const catName = rec?.category?.name || application?.categoryName || "General";
  const isValid = cert.status === "ACTIVE";

  return {
    id: cert.id,
    certificateNumber: cert.certificateNumber,
    recordId: canonicalRecordId,
    recipientName: cert.recipientName,
    recordTitle: cert.recordTitle,
    achievementResult: cert.achievementResult,
    achievementDate: cert.achievementDate,
    issueDate: cert.issueDate,
    location: cert.location,
    verificationCode: cert.verificationCode,
    qrCodeDataUrl: cert.qrCodeDataUrl || null,
    status: cert.status,
    createdAt: cert.createdAt,
    updatedAt: cert.updatedAt,
    // Compatibility fields
    applicationId: application?.id || cert.id,
    category: catName,
    achievementTitle: cert.recordTitle,
    place: cert.location,
    pdfUrl: `/api/certificates/${cert.id}/download`,
    certificatePdfUrl: `/api/certificates/${cert.id}/download`,
    verificationStatus: isValid ? "VALID" : cert.status,
    verificationUrl: `/verify?code=${cert.verificationCode}`,
    qrCodeUrl: cert.qrCodeDataUrl || null,
    generatedAt: cert.issueDate || cert.createdAt,
    record: rec || null,
    application: application || null,
  };
}

export class CertificateService {
  /**
   * Generates a unique sequential Record ID: WBRE-[CATEGORY]-[YEAR]-[SEQUENCE]
   * Example: WBRE-TEC-2026-000101
   */
  public static async generateRecordId(category: string, client = db): Promise<string> {
    const year = new Date().getFullYear();
    const categoryCode = getCategoryCode(category);
    const prefix = `WBRE-${categoryCode}-${year}-`;

    const latest = await client.record.findFirst({
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
   * Generates and stores an official certificate and record for an approved application.
   * Requires SUPER_ADMIN or ADMIN role.
   */
  public static async generateCertificateForApplication(
    applicationId: string,
    adminUserId?: string,
    adminRole?: Role
  ): Promise<CertificateSummary> {
    if (adminRole && !canGenerateCertificate(adminRole)) {
      throw new Error("FORBIDDEN: Verification Officers are not permitted to generate certificates.");
    }

    // 1. Load application
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { evidences: true, statusHistory: true },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    // 2. Status validation: Application MUST be in APPROVED status
    if (application.status !== "APPROVED" && application.status !== "CERTIFICATE_GENERATED") {
      throw new Error(
        `Invalid status: Cannot generate certificate for application in ${application.status} status. The application must be approved first.`
      );
    }

    // 3. Idempotency Check: Return existing certificate if already generated
    const existingCert = await db.certificate.findFirst({
      where: {
        OR: [
          { recordTitle: application.proposedTitle, recipientName: application.applicantName },
          { record: { title: application.proposedTitle } },
        ],
      },
      include: {
        record: {
          include: { category: true },
        },
      },
    });

    if (existingCert) {
      return toCertificateSummary(existingCert, existingCert.record, application);
    }

    // 4. Ensure RecordCategory exists
    const categoryName = application.categoryName || "General";
    const categorySlug = categoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "general";

    const category = await db.recordCategory.upsert({
      where: { slug: categorySlug },
      update: {},
      create: {
        name: categoryName,
        slug: categorySlug,
        description: `Records in ${categoryName}`,
        iconName: "Award",
      },
    });

    // 5. Generate unique tracking identifiers
    let recordId = await this.generateRecordId(categoryName);
    let certificateNumber = await this.generateCertificateNumber();

    // Verify uniqueness against existing database records
    let attempts = 0;
    while (attempts < 5) {
      const [existingRecord, existingCertCheck] = await Promise.all([
        db.record.findUnique({ where: { recordId } }),
        db.certificate.findUnique({ where: { certificateNumber } }),
      ]);

      if (!existingRecord && !existingCertCheck) break;

      attempts++;
      const offset = attempts;
      const year = new Date().getFullYear();
      const catCode = getCategoryCode(categoryName);
      recordId = `WBRE-${catCode}-${year}-${String(101 + offset).padStart(6, "0")}`;
      certificateNumber = `WBRE-CERT-${year}-${String(101 + offset).padStart(6, "0")}`;
    }

    const dateFormatted = formatDate(application.proposedDate || new Date());

    // 6. Generate high-resolution PDF
    let generatedResult;
    try {
      generatedResult = await CertificateGenerator.generate({
        recipientName: application.applicantName,
        category: categoryName,
        achievementTitle: application.proposedTitle,
        place: application.location,
        recordId,
        certificateNumber,
        dateOfRecognition: dateFormatted,
      });
    } catch (genErr: any) {
      throw new Error(`Certificate PDF generation failed: ${genErr.message}`);
    }

    const { qrCodeDataUrl } = generatedResult;
    const recordSlug = `${application.proposedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${recordId.toLowerCase()}`;
    const verificationCode = `VER-${certificateNumber.replace(/[^A-Z0-9]/g, "")}`;

    // 7. Persist Record, Certificate, and History atomically
    const result = await db.$transaction(async (tx) => {
      const record = await tx.record.create({
        data: {
          recordId,
          slug: recordSlug,
          title: application.proposedTitle,
          shortDescription: application.description.slice(0, 200),
          fullDescription: application.description,
          resultValue: application.measuredMetric || "Verified",
          measurementUnit: application.measuredMetric || "Standard",
          recordDate: application.proposedDate || new Date(),
          verificationDate: new Date(),
          country: application.country,
          location: application.location,
          status: "ACTIVE",
          categoryId: category.id,
          certificateNumber,
        },
        include: { category: true },
      });

      const certificate = await tx.certificate.create({
        data: {
          certificateNumber,
          recordId: record.id,
          recipientName: application.applicantName,
          recordTitle: application.proposedTitle,
          achievementResult: application.measuredMetric || "Verified",
          achievementDate: application.proposedDate || new Date(),
          issueDate: new Date(),
          location: application.location,
          verificationCode,
          qrCodeDataUrl,
          status: "ACTIVE",
        },
      });

      await tx.recordHistory.create({
        data: {
          recordId: record.id,
          eventDate: new Date(),
          eventType: "ESTABLISHED",
          title: "Record Established",
          description: `Official Certificate ${certificateNumber} issued to ${application.applicantName}`,
        },
      });

      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: "APPROVED",
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          status: "APPROVED",
          note: `Certificate ${certificateNumber} generated with Record ID ${recordId}`,
          updatedBy: adminUserId || "SYSTEM",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: "CERTIFICATE_GENERATED",
          entity: "APPLICATION",
          entityId: applicationId,
          details: `Generated Certificate ${certificateNumber} with Record ID ${recordId} for ${application.applicantName}`,
        },
      });

      return { certificate, record };
    });

    return toCertificateSummary(result.certificate, result.record, application);
  }

  /**
   * Summary metrics for certificate registry: total, valid, revoked counts.
   */
  public static async getCertificateCounts() {
    const [total, valid, revoked] = await Promise.all([
      db.certificate.count(),
      db.certificate.count({ where: { status: "ACTIVE" } }),
      db.certificate.count({ where: { status: "REVOKED" } }),
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

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { certificateNumber: { contains: q, mode: "insensitive" } },
        { recipientName: { contains: q, mode: "insensitive" } },
        { recordTitle: { contains: q, mode: "insensitive" } },
        { record: { recordId: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (params.status && params.status !== "ALL") {
      where.status = params.status === "VALID" ? "ACTIVE" : params.status;
    }

    if (params.category && params.category.trim() && params.category !== "ALL") {
      where.record = {
        category: { name: { contains: params.category.trim(), mode: "insensitive" } },
      };
    }

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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          record: {
            include: {
              category: true,
            },
          },
        },
      }),
      this.getCertificateCounts(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const mappedCerts: CertificateSummary[] = certificates.map((c) =>
      toCertificateSummary(c, c.record)
    );

    return {
      certificates: mappedCerts,
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
          { certificateNumber: { equals: cleanId, mode: "insensitive" } },
          { verificationCode: { equals: cleanId, mode: "insensitive" } },
          { record: { recordId: { equals: cleanId, mode: "insensitive" } } },
        ],
      },
      include: {
        record: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!cert) return null;

    // Load related audit logs for certificate lifecycle
    const auditLogs = await db.auditLog.findMany({
      where: {
        OR: [
          { entityId: cert.id },
          { entityId: cert.record?.id },
        ],
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

    // Locate related application if available
    const app = await db.application.findFirst({
      where: {
        OR: [
          { proposedTitle: cert.recordTitle, applicantName: cert.recipientName },
          { proposedTitle: cert.record?.title },
        ],
      },
    });

    const certSummary = toCertificateSummary(cert, cert.record, app);

    return {
      ...certSummary,
      auditLogs,
    };
  }

  /**
   * Revoke an existing certificate (SUPER_ADMIN or ADMIN only).
   */
  public static async revokeCertificate(params: {
    certificateId: string;
    reason: string;
    actor: { userId: string; role: Role };
  }) {
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
          { certificateNumber: { equals: cleanId, mode: "insensitive" } },
          { record: { recordId: { equals: cleanId, mode: "insensitive" } } },
        ],
      },
      include: {
        record: true,
      },
    });

    if (!cert) {
      throw new Error("Certificate not found.");
    }

    if (cert.status === "REVOKED") {
      return {
        certificate: toCertificateSummary(cert, cert.record),
        alreadyRevoked: true,
        message: `Certificate ${cert.certificateNumber} is already revoked.`,
      };
    }

    const updated = await db.$transaction(async (tx) => {
      const c = await tx.certificate.update({
        where: { id: cert.id },
        data: { status: "REVOKED" },
        include: { record: true },
      });

      if (cert.recordId) {
        await tx.record.update({
          where: { id: cert.recordId },
          data: { status: "REVOKED" },
        });

        await tx.recordHistory.create({
          data: {
            recordId: cert.recordId,
            eventDate: new Date(),
            eventType: "REVOKED",
            title: "Certificate Revoked",
            description: cleanReason,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: params.actor.userId,
          entity: "CERTIFICATE",
          entityId: cert.id,
          action: "CERTIFICATE_REVOKED",
          details: cleanReason,
        },
      });

      return c;
    });

    return {
      certificate: toCertificateSummary(updated, updated.record),
      alreadyRevoked: false,
      message: `Certificate ${cert.certificateNumber} revoked successfully.`,
    };
  }

  /**
   * Look up certificate by Record ID or Certificate Number
   */
  public static async findByRecordOrCertNumber(
    identifier: string
  ): Promise<CertificateSummary | null> {
    const cleanId = identifier.trim();

    const cert = await db.certificate.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { certificateNumber: { equals: cleanId, mode: "insensitive" } },
          { verificationCode: { equals: cleanId, mode: "insensitive" } },
          { record: { recordId: { equals: cleanId, mode: "insensitive" } } },
        ],
      },
      include: {
        record: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!cert) return null;

    return toCertificateSummary(cert, cert.record);
  }

  /**
   * List all generated certificates
   */
  public static async getAllCertificates(limit = 100): Promise<CertificateSummary[]> {
    const certs = await db.certificate.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        record: {
          include: {
            category: true,
          },
        },
      },
    });

    return certs.map((c) => toCertificateSummary(c, c.record));
  }
}
