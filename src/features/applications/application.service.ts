import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import {
  ApplicationStatus,
  Role,
  ApplicationDetail,
  ApplicationEvidenceSummary,
  CertificateSummary,
} from "@/types";
import { ApplicationSubmissionInput } from "@/lib/validation";
import { canApproveApplication, canRejectApplication, canStartReview } from "@/lib/rbac";

export interface CreateEvidenceFileInput {
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export function toApplicationDetail(
  app: any,
  cert?: CertificateSummary | null
): ApplicationDetail {
  const evidences: ApplicationEvidenceSummary[] = (app.evidences || []).map((e: any) => ({
    id: e.id,
    applicationId: e.applicationId,
    fileName: e.fileName,
    originalName: e.originalName,
    fileType: e.fileType,
    fileSize: e.fileSize,
    fileUrl: e.fileUrl,
    storageProvider: e.storageProvider || "LOCAL",
    evidenceCategory: e.evidenceCategory || "GENERAL",
    uploadedBy: e.uploadedBy || "APPLICANT",
    status: e.status || "PENDING",
    rejectionReason: e.rejectionReason || null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }));

  const lastRejection = app.statusHistory?.find?.((h: any) => h.status === "REJECTED");
  const lastRequested = app.statusHistory?.find?.((h: any) => h.status === "MORE_INFORMATION_REQUIRED");

  return {
    id: app.id,
    applicationNumber: app.applicationNumber,
    applicantType: app.applicantType || "Individual",
    applicantName: app.applicantName,
    organizationName: app.organizationName || null,
    email: app.email,
    phone: app.phone,
    country: app.country,
    stateRegion: app.stateRegion || null,
    city: app.city || app.location || "",
    proposedTitle: app.proposedTitle,
    categoryName: app.categoryName,
    description: app.description,
    measuredMetric: app.measuredMetric || "",
    knownBenchmark: app.knownBenchmark || null,
    significance: app.significance || "",
    proposedDate: app.proposedDate || null,
    location: app.location,
    expectedParticipants: app.expectedParticipants ?? 1,
    attemptType: app.attemptType || "Individual",
    evidencePlan: app.evidencePlan || "[]",
    additionalNotes: app.additionalNotes || null,
    status: app.status,
    assignedReviewerId: app.assignedReviewerId || null,
    internalNotes: app.internalNotes || null,
    guidelinesDocument: app.guidelinesDocument || null,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    evidences,
    evidenceFiles: evidences,
    statusHistory: app.statusHistory || [],
    certificate: cert || null,
    // Compatibility fields for legacy views
    applicantEmail: app.email,
    applicantPhone: app.phone,
    category: app.categoryName,
    achievementTitle: app.proposedTitle,
    place: app.location,
    address: [app.city, app.stateRegion, app.country].filter(Boolean).join(", ") || app.location,
    supportingDetails: app.significance || app.knownBenchmark || null,
    rejectionReason: lastRejection?.note || null,
    requestedInfo: lastRequested?.note || null,
  };
}

export class ApplicationService {
  /**
   * Generates a unique sequential application number.
   * Format: WBRE-APP-YYYY-XXXXXX
   */
  public static async generateApplicationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WBRE-APP-${year}-`;

    const count = await db.application.count({
      where: {
        OR: [
          { applicationNumber: { startsWith: prefix } },
          { applicationNumber: { startsWith: `APP-${year}-` } },
        ],
      },
    });

    const sequence = String(count + 1).padStart(6, "0");
    return `${prefix}${sequence}`;
  }

  /**
   * Submits a new application with optional evidence files.
   * Public submission workflow against the production database schema.
   */
  public static async submitApplication(
    data: ApplicationSubmissionInput,
    evidenceFiles: CreateEvidenceFileInput[] = [],
    ipAddress?: string
  ): Promise<ApplicationDetail> {
    const applicationNumber = await this.generateApplicationNumber();
    const place = data.place || data.country;
    const addressParts = (data.address || "").split(",").map((s) => s.trim());
    const city = addressParts[0] || place;
    const stateRegion = addressParts.slice(1).join(", ") || null;

    const application = await db.application.create({
      data: {
        applicationNumber,
        applicantType: "Individual",
        applicantName: data.fullName,
        email: data.email,
        phone: data.phone,
        country: data.country,
        stateRegion,
        city,
        proposedTitle: data.achievementTitle,
        categoryName: data.category,
        description: data.description,
        measuredMetric: data.achievementTitle,
        knownBenchmark: data.supportingDetails || null,
        significance: data.supportingDetails || data.description.slice(0, 300),
        location: place,
        expectedParticipants: 1,
        attemptType: "Individual",
        evidencePlan: JSON.stringify(evidenceFiles.map((f) => f.originalName)),
        additionalNotes: data.supportingDetails || null,
        status: "SUBMITTED",
        evidences: {
          create: evidenceFiles.map((file) => ({
            fileName: file.fileName,
            originalName: file.originalName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            fileSize: file.fileSize,
            storageProvider: "LOCAL",
            evidenceCategory: "GENERAL",
            uploadedBy: "APPLICANT",
            status: "PENDING",
          })),
        },
        statusHistory: {
          create: [
            {
              status: "SUBMITTED",
              note: `Application submitted by ${data.fullName}`,
              updatedBy: "PUBLIC_APPLICANT",
            },
          ],
        },
      },
      include: {
        evidences: true,
        statusHistory: true,
      },
    });

    await recordAuditLog({
      applicationId: application.id,
      action: "APPLICATION_SUBMITTED",
      details: `Application ${applicationNumber} submitted by ${data.fullName}`,
      ipAddress: ipAddress || null,
    });

    return toApplicationDetail(application);
  }

  /**
   * Get application by ID with evidence, status history, and certificate.
   */
  public static async getApplicationById(id: string): Promise<ApplicationDetail | null> {
    const app = await db.application.findUnique({
      where: { id },
      include: {
        evidences: {
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!app) return null;

    // Locate related certificate if one was issued
    const cert = await db.certificate.findFirst({
      where: {
        OR: [
          { recordTitle: app.proposedTitle, recipientName: app.applicantName },
          { record: { title: app.proposedTitle } },
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

    let certSummary: CertificateSummary | null = null;
    if (cert) {
      certSummary = {
        id: cert.id,
        certificateNumber: cert.certificateNumber,
        recordId: cert.record?.recordId || cert.recordId,
        recipientName: cert.recipientName,
        recordTitle: cert.recordTitle,
        achievementResult: cert.achievementResult,
        achievementDate: cert.achievementDate,
        issueDate: cert.issueDate,
        location: cert.location,
        verificationCode: cert.verificationCode,
        qrCodeDataUrl: cert.qrCodeDataUrl,
        status: cert.status,
        createdAt: cert.createdAt,
        updatedAt: cert.updatedAt,
        category: cert.record?.category?.name || app.categoryName,
        achievementTitle: cert.recordTitle,
        place: cert.location,
        pdfUrl: `/api/certificates/${cert.id}/download`,
        certificatePdfUrl: `/api/certificates/${cert.id}/download`,
        verificationStatus: cert.status === "ACTIVE" ? "VALID" : cert.status,
        verificationUrl: `/verify?code=${cert.verificationCode}`,
        qrCodeUrl: cert.qrCodeDataUrl,
        generatedAt: cert.issueDate,
      };
    }

    return toApplicationDetail(app, certSummary);
  }

  /**
   * Get application by Application Number (e.g. WBRE-APP-2026-000001 or APP-2026-000001)
   */
  public static async getApplicationByNumber(
    applicationNumber: string
  ): Promise<ApplicationDetail | null> {
    const app = await db.application.findUnique({
      where: { applicationNumber },
      include: {
        evidences: true,
        statusHistory: true,
      },
    });

    if (!app) return null;

    return toApplicationDetail(app);
  }

  /**
   * List applications with filtering, search, and server-side pagination.
   */
  public static async listApplications(params: {
    status?: ApplicationStatus;
    search?: string;
    category?: string;
    country?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
    skip?: number;
    take?: number;
  }) {
    const { status, search, category, country, dateFrom, dateTo } = params;

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize || params.take) || 20));
    const skip = params.skip !== undefined ? params.skip : (page - 1) * pageSize;
    const take = pageSize;

    const where: any = {};

    if (status) {
      if (status === "PENDING" || status === "SUBMITTED") {
        where.status = { in: ["SUBMITTED", "PENDING"] };
      } else if (status === "UNDER_REVIEW" || status === "UNDER_INITIAL_REVIEW") {
        where.status = { in: ["UNDER_INITIAL_REVIEW", "UNDER_REVIEW", "UNDER_VERIFICATION"] };
      } else if (status === "APPROVED" || status === "CERTIFICATE_GENERATED") {
        where.status = { in: ["APPROVED", "CERTIFICATE_GENERATED"] };
      } else {
        where.status = status;
      }
    }

    if (category) {
      where.categoryName = { contains: category, mode: "insensitive" };
    }

    if (country) {
      where.country = { contains: country, mode: "insensitive" };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (search) {
      where.OR = [
        { applicationNumber: { contains: search, mode: "insensitive" } },
        { applicantName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { proposedTitle: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      db.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          evidences: {
            select: { id: true, fileType: true, fileSize: true, originalName: true, status: true },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
      }),
      db.application.count({ where }),
    ]);

    const mappedItems: ApplicationDetail[] = items.map((item) => toApplicationDetail(item));

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Secure, canonical status mutation method.
   * Centralizes all RBAC enforcement, controlled state transitions, and audit logging.
   */
  public static async updateStatus(params: {
    applicationId: string;
    status: ApplicationStatus;
    adminUserId?: string;
    adminUserRole?: Role;
    actor?: { userId: string; role: Role };
    internalNotes?: string;
    rejectionReason?: string;
    requestedInfo?: string;
  }) {
    const {
      applicationId,
      status,
      internalNotes,
      rejectionReason,
      requestedInfo,
    } = params;

    const actorUserId = params.actor?.userId || params.adminUserId;
    const actorRole = params.actor?.role || params.adminUserRole;

    if (!actorRole) {
      throw new Error("UNAUTHORIZED: Actor role is required for status mutations.");
    }

    if (status === "CERTIFICATE_GENERATED") {
      throw new Error(
        "Invalid action: Certificate generation cannot be directly requested via status update. Applications must be approved first."
      );
    }

    // Fail-fast RBAC checks before database queries
    if (status === "APPROVED" && !canApproveApplication(actorRole)) {
      throw new Error(
        "FORBIDDEN: Verification Officers are not permitted to adjudicate or approve applications."
      );
    }

    if (status === "REJECTED" && !canRejectApplication(actorRole)) {
      throw new Error(
        "FORBIDDEN: Verification Officers are not permitted to reject applications."
      );
    }

    if (
      (status === "UNDER_REVIEW" || status === "UNDER_INITIAL_REVIEW") &&
      !canStartReview(actorRole)
    ) {
      throw new Error(
        "FORBIDDEN: User does not have permission to start application review."
      );
    }

    if (status === "REJECTED" && (!rejectionReason || rejectionReason.trim().length === 0)) {
      throw new Error("A rejection reason is required when rejecting an application.");
    }

    const existing = await db.application.findUnique({
      where: { id: applicationId },
    });

    if (!existing) {
      throw new Error("Application not found.");
    }

    // ==========================================
    // 1. APPROVAL WORKFLOW
    // ==========================================
    if (status === "APPROVED") {
      if (existing.status === "REJECTED") {
        throw new Error("Invalid transition: Cannot approve an application that has already been rejected.");
      }

      if (
        !existing.applicantName?.trim() ||
        !existing.categoryName?.trim() ||
        !existing.proposedTitle?.trim() ||
        !existing.description?.trim() ||
        !existing.location?.trim()
      ) {
        throw new Error("Invalid application: Required applicant or achievement information is missing for approval.");
      }

      const updated = await db.application.update({
        where: { id: applicationId },
        data: {
          status: "APPROVED",
          ...(internalNotes !== undefined && { internalNotes }),
        },
      });

      await db.applicationStatusHistory.create({
        data: {
          applicationId,
          status: "APPROVED",
          note: internalNotes || "Application approved. Awaiting certificate generation.",
          updatedBy: actorUserId || String(actorRole),
        },
      });

      await recordAuditLog({
        userId: actorUserId || null,
        applicationId: existing.id,
        action: "APPLICATION_APPROVED",
        details: `Application ${existing.applicationNumber} approved by ${actorRole}. Awaiting certificate generation.`,
      });

      return toApplicationDetail(updated);
    }

    // ==========================================
    // 2. REJECTION WORKFLOW
    // ==========================================
    if (status === "REJECTED") {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error("A rejection reason is required when rejecting an application.");
      }

      const updated = await db.application.update({
        where: { id: applicationId },
        data: {
          status: "REJECTED",
          ...(internalNotes !== undefined && { internalNotes }),
        },
      });

      await db.applicationStatusHistory.create({
        data: {
          applicationId,
          status: "REJECTED",
          note: rejectionReason.trim(),
          updatedBy: actorUserId || String(actorRole),
        },
      });

      await recordAuditLog({
        userId: actorUserId || null,
        applicationId,
        action: "APPLICATION_REJECTED",
        details: `Reason: ${rejectionReason.trim()}`,
      });

      return toApplicationDetail(updated);
    }

    // ==========================================
    // 3. UNDER REVIEW WORKFLOW
    // ==========================================
    if (status === "UNDER_REVIEW" || status === "UNDER_INITIAL_REVIEW") {
      if (existing.status === "REJECTED") {
        throw new Error(
          "Invalid transition: Cannot move a rejected application back into review directly."
        );
      }

      const dbStatus = "UNDER_INITIAL_REVIEW";
      const updated = await db.application.update({
        where: { id: applicationId },
        data: {
          status: dbStatus,
          ...(internalNotes !== undefined && { internalNotes }),
        },
      });

      await db.applicationStatusHistory.create({
        data: {
          applicationId,
          status: dbStatus,
          note: requestedInfo
            ? `Requested Info: ${requestedInfo}`
            : `Review started by ${actorRole}`,
          updatedBy: actorUserId || String(actorRole),
        },
      });

      await recordAuditLog({
        userId: actorUserId || null,
        applicationId,
        action: "APPLICATION_REVIEW_STARTED",
        details: requestedInfo
          ? `Requested Info: ${requestedInfo}`
          : `Review started by ${actorRole}`,
      });

      return toApplicationDetail(updated);
    }

    // ==========================================
    // 4. RESET TO PENDING / SUBMITTED (ADMIN ONLY)
    // ==========================================
    if (status === "PENDING" || status === "SUBMITTED") {
      if (actorRole !== Role.SUPER_ADMIN && actorRole !== Role.ADMIN) {
        throw new Error("FORBIDDEN: Only administrators can reset application status to SUBMITTED.");
      }

      const updated = await db.application.update({
        where: { id: applicationId },
        data: {
          status: "SUBMITTED",
          ...(internalNotes !== undefined && { internalNotes }),
        },
      });

      await db.applicationStatusHistory.create({
        data: {
          applicationId,
          status: "SUBMITTED",
          note: `Application status reset to SUBMITTED by ${actorRole}`,
          updatedBy: actorUserId || String(actorRole),
        },
      });

      await recordAuditLog({
        userId: actorUserId || null,
        applicationId,
        action: "STATUS_CHANGED_TO_PENDING",
        details: `Application status reset to SUBMITTED by ${actorRole}`,
      });

      return toApplicationDetail(updated);
    }

    throw new Error(`Unsupported status transition to ${status}`);
  }

  /**
   * Save internal notes without changing status.
   */
  public static async saveInternalNotes(
    applicationId: string,
    notes: string,
    adminUserId?: string,
    actorRole?: string
  ) {
    if (typeof notes !== "string") {
      notes = "";
    }
    if (notes.length > 10000) {
      throw new Error("Internal notes exceed maximum limit of 10,000 characters.");
    }

    const updated = await db.application.update({
      where: { id: applicationId },
      data: { internalNotes: notes },
    });

    await recordAuditLog({
      userId: adminUserId || null,
      applicationId,
      action: "INTERNAL_NOTE_UPDATED",
      details: `Internal notes updated by ${actorRole || "staff"} (${notes.length} characters)`,
    });

    return toApplicationDetail(updated);
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
      db.application.count({ where: { status: { in: ["SUBMITTED", "PENDING"] } } }),
      db.application.count({
        where: { status: { in: ["UNDER_INITIAL_REVIEW", "UNDER_REVIEW", "UNDER_VERIFICATION"] } },
      }),
      db.certificate.count(),
      db.application.count({ where: { status: "REJECTED" } }),
      db.application.count({ where: { status: { in: ["APPROVED", "CERTIFICATE_GENERATED"] } } }),
      db.application.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          evidences: true,
          statusHistory: true,
        },
      }),
      db.certificate.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          record: {
            include: {
              category: true,
            },
          },
        },
      }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    const mappedRecentApps = recentApplications.map((app) => toApplicationDetail(app));
    const mappedRecentCerts: CertificateSummary[] = recentCertificates.map((cert) => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      recordId: cert.record?.recordId || cert.recordId,
      recipientName: cert.recipientName,
      recordTitle: cert.recordTitle,
      achievementResult: cert.achievementResult,
      achievementDate: cert.achievementDate,
      issueDate: cert.issueDate,
      location: cert.location,
      verificationCode: cert.verificationCode,
      qrCodeDataUrl: cert.qrCodeDataUrl,
      status: cert.status,
      createdAt: cert.createdAt,
      updatedAt: cert.updatedAt,
      category: cert.record?.category?.name || "General",
      achievementTitle: cert.recordTitle,
      place: cert.location,
      pdfUrl: `/api/certificates/${cert.id}/download`,
      certificatePdfUrl: `/api/certificates/${cert.id}/download`,
      verificationStatus: cert.status === "ACTIVE" ? "VALID" : cert.status,
      verificationUrl: `/verify?code=${cert.verificationCode}`,
      qrCodeUrl: cert.qrCodeDataUrl,
      generatedAt: cert.issueDate,
    }));

    const mappedAuditLogs = recentAuditLogs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      timestamp: log.createdAt,
      createdAt: log.createdAt,
      user: log.user,
      application: log.entityId
        ? { applicationNumber: log.entityId, applicantName: "" }
        : null,
    }));

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
      recentApplications: mappedRecentApps,
      recentCertificates: mappedRecentCerts,
      recentAuditLogs: mappedAuditLogs,
    };
  }
}
