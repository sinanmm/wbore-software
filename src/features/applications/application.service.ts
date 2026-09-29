import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { ApplicationStatus } from "@prisma/client";
import { ApplicationSubmissionInput } from "@/lib/validation";
import { CertificateService } from "../certificates/certificate.service";

export interface CreateEvidenceFileInput {
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export class ApplicationService {
  /**
   * Generates a unique sequential application number.
   * Format: APP-YYYY-XXXXXX (e.g. APP-2026-000001)
   */
  public static async generateApplicationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `APP-${year}-`;

    const count = await db.application.count({
      where: {
        applicationNumber: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
  }

  /**
   * Submits a new application with optional evidence files.
   */
  public static async submitApplication(
    data: ApplicationSubmissionInput,
    evidenceFiles: CreateEvidenceFileInput[] = [],
    ipAddress?: string
  ) {
    const applicationNumber = await this.generateApplicationNumber();

    const application = await db.application.create({
      data: {
        applicationNumber,
        applicantName: data.fullName,
        applicantEmail: data.email,
        applicantPhone: data.phone,
        country: data.country,
        address: data.address,
        category: data.category,
        achievementTitle: data.achievementTitle,
        description: data.description,
        place: data.place,
        supportingDetails: data.supportingDetails || null,
        status: "PENDING",
        evidenceFiles: {
          create: evidenceFiles.map((file) => ({
            fileName: file.fileName,
            originalName: file.originalName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            fileSize: file.fileSize,
          })),
        },
      },
      include: {
        evidenceFiles: true,
      },
    });

    await recordAuditLog({
      applicationId: application.id,
      action: "APPLICATION_SUBMITTED",
      details: `Application ${applicationNumber} submitted by ${data.fullName}`,
      ipAddress: ipAddress || null,
    });

    return application;
  }

  /**
   * Get application by ID with all evidence and certificate details.
   */
  public static async getApplicationById(id: string) {
    return await db.application.findUnique({
      where: { id },
      include: {
        evidenceFiles: {
          orderBy: { createdAt: "desc" },
        },
        certificate: true,
        auditLogs: {
          orderBy: { timestamp: "desc" },
          take: 20,
        },
      },
    });
  }

  /**
   * Get application by Application Number (e.g. APP-2026-000001)
   */
  public static async getApplicationByNumber(applicationNumber: string) {
    return await db.application.findUnique({
      where: { applicationNumber },
      include: {
        evidenceFiles: true,
        certificate: true,
      },
    });
  }

  /**
   * List applications with filtering, search, and pagination.
   */
  public static async listApplications(params: {
    status?: ApplicationStatus;
    search?: string;
    category?: string;
    skip?: number;
    take?: number;
  }) {
    const { status, search, category, skip = 0, take = 50 } = params;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { applicationNumber: { contains: search, mode: "insensitive" } },
        { applicantName: { contains: search, mode: "insensitive" } },
        { applicantEmail: { contains: search, mode: "insensitive" } },
        { achievementTitle: { contains: search, mode: "insensitive" } },
        { place: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      db.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          evidenceFiles: { select: { id: true, fileType: true } },
          certificate: { select: { id: true, recordId: true, certificateNumber: true } },
        },
      }),
      db.application.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Update application status and internal notes.
   */
  public static async updateStatus(params: {
    applicationId: string;
    status: ApplicationStatus;
    adminUserId?: string;
    internalNotes?: string;
    rejectionReason?: string;
    requestedInfo?: string;
  }) {
    const {
      applicationId,
      status,
      adminUserId,
      internalNotes,
      rejectionReason,
      requestedInfo,
    } = params;

    const updated = await db.application.update({
      where: { id: applicationId },
      data: {
        status,
        ...(internalNotes !== undefined && { internalNotes }),
        ...(rejectionReason !== undefined && { rejectionReason }),
        ...(requestedInfo !== undefined && { requestedInfo }),
      },
    });

    await recordAuditLog({
      userId: adminUserId || null,
      applicationId,
      action: `STATUS_CHANGED_TO_${status}`,
      details: rejectionReason
        ? `Reason: ${rejectionReason}`
        : requestedInfo
        ? `Requested Info: ${requestedInfo}`
        : undefined,
    });

    // If status is APPROVED, trigger automatic certificate generation
    if (status === "APPROVED" || status === "CERTIFICATE_GENERATED") {
      await CertificateService.generateCertificateForApplication(
        applicationId,
        adminUserId
      );
    }

    return updated;
  }

  /**
   * Save internal notes without changing status.
   */
  public static async saveInternalNotes(
    applicationId: string,
    notes: string,
    adminUserId?: string
  ) {
    const updated = await db.application.update({
      where: { id: applicationId },
      data: { internalNotes: notes },
    });

    await recordAuditLog({
      userId: adminUserId || null,
      applicationId,
      action: "INTERNAL_NOTES_UPDATED",
      details: notes.slice(0, 100),
    });

    return updated;
  }

  /**
   * Dashboard statistics summary.
   */
  public static async getDashboardStats() {
    const [
      totalApplications,
      pendingRequests,
      underReviewRequests,
      certificatesIssued,
      rejectedRequests,
      approvedRequests,
      recentApplications,
      recentCertificates,
      recentAuditLogs,
    ] = await Promise.all([
      db.application.count(),
      db.application.count({ where: { status: "PENDING" } }),
      db.application.count({ where: { status: "UNDER_REVIEW" } }),
      db.certificate.count(),
      db.application.count({ where: { status: "REJECTED" } }),
      db.application.count({ where: { status: { in: ["APPROVED", "CERTIFICATE_GENERATED"] } } }),
      db.application.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          certificate: { select: { recordId: true } },
        },
      }),
      db.certificate.findMany({
        orderBy: { generatedAt: "desc" },
        take: 5,
      }),
      db.auditLog.findMany({
        orderBy: { timestamp: "desc" },
        take: 8,
        include: {
          user: { select: { name: true, email: true } },
          application: { select: { applicationNumber: true, applicantName: true } },
        },
      }),
    ]);

    const pendingReview = pendingRequests + underReviewRequests;
    const approved = approvedRequests;
    const rejected = rejectedRequests;

    return {
      totalApplications,
      pendingReview,
      approved,
      rejected,
      certificatesIssued,
      pendingRequests,
      underReviewRequests,
      approvedCertificates: certificatesIssued,
      rejectedRequests,
      recentApplications,
      recentCertificates,
      recentAuditLogs,
    };
  }
}
