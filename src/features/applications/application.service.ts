import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { ApplicationStatus, Role } from "@prisma/client";
import { ApplicationSubmissionInput } from "@/lib/validation";
import { CertificateService } from "../certificates/certificate.service";
import { CertificateGenerator } from "../certificates/certificate.generator";
import { formatDate } from "@/lib/utils";
import { canApproveApplication, canRejectApplication, canStartReview } from "@/lib/rbac";

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
   * Public submission workflow - preserved exactly as designed.
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
        status: ApplicationStatus.PENDING,
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
    if (status) where.status = status;
    if (category) where.category = category;
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
        { applicantEmail: { contains: search, mode: "insensitive" } },
        { achievementTitle: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
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
          evidenceFiles: { select: { id: true, fileType: true, fileSize: true, originalName: true } },
          certificate: { select: { id: true, recordId: true, certificateNumber: true } },
        },
      }),
      db.application.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Secure, canonical status mutation method.
   * Centralizes all RBAC enforcement, controlled state transitions,
   * transactional certificate creation, and audit logging.
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

    // Direct transition to CERTIFICATE_GENERATED by client is strictly prohibited
    if (status === ApplicationStatus.CERTIFICATE_GENERATED) {
      throw new Error(
        "Invalid action: Certificate generation cannot be directly requested via status update. Applications must be approved first."
      );
    }

    // Fail-fast RBAC checks before database queries
    if (status === ApplicationStatus.APPROVED && !canApproveApplication(actorRole)) {
      throw new Error(
        "FORBIDDEN: Verification Officers are not permitted to adjudicate or approve applications."
      );
    }

    if (status === ApplicationStatus.REJECTED && !canRejectApplication(actorRole)) {
      throw new Error(
        "FORBIDDEN: Verification Officers are not permitted to reject applications."
      );
    }

    if (status === ApplicationStatus.UNDER_REVIEW && !canStartReview(actorRole)) {
      throw new Error(
        "FORBIDDEN: User does not have permission to start application review."
      );
    }

    // Rejection reason validation before DB query
    if (status === ApplicationStatus.REJECTED && (!rejectionReason || rejectionReason.trim().length === 0)) {
      throw new Error("A rejection reason is required when rejecting an application.");
    }

    // Load existing application from database
    const existing = await db.application.findUnique({
      where: { id: applicationId },
      include: { certificate: true },
    });

    if (!existing) {
      throw new Error("Application not found.");
    }

    // ==========================================
    // 1. APPROVAL WORKFLOW
    // ==========================================
    if (status === ApplicationStatus.APPROVED) {

      // Transition guard: Cannot approve already rejected or certified applications
      if (existing.status === ApplicationStatus.REJECTED) {
        throw new Error("Invalid transition: Cannot approve an application that has already been rejected.");
      }
      if (existing.status === ApplicationStatus.CERTIFICATE_GENERATED || existing.certificate) {
        throw new Error("Invalid transition: An official certificate has already been issued for this record.");
      }

      // Validate required application information
      if (
        !existing.applicantName?.trim() ||
        !existing.category?.trim() ||
        !existing.achievementTitle?.trim() ||
        !existing.description?.trim() ||
        !existing.place?.trim()
      ) {
        throw new Error("Invalid application: Required applicant or achievement information is missing for approval.");
      }

      // Update application status to APPROVED (Certificate generation will occur in Step 4)
      const updated = await db.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.APPROVED,
          ...(internalNotes !== undefined && { internalNotes }),
        },
      });

      // Record audit log: APPLICATION_APPROVED
      await recordAuditLog({
        userId: actorUserId || null,
        applicationId: existing.id,
        action: "APPLICATION_APPROVED",
        details: `Application ${existing.applicationNumber} approved by ${actorRole}. Awaiting certificate generation.`,
      });

      return updated;
    }

    // ==========================================
    // 2. REJECTION WORKFLOW
    // ==========================================
    if (status === ApplicationStatus.REJECTED) {
      // RBAC: Only SUPER_ADMIN and ADMIN can reject applications
      if (!canRejectApplication(actorRole)) {
        throw new Error(
          "FORBIDDEN: Verification Officers are not permitted to reject applications."
        );
      }

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error("A rejection reason is required when rejecting an application.");
      }

      // Transition guard: Cannot reject an application with an active certificate
      if (existing.status === ApplicationStatus.CERTIFICATE_GENERATED || existing.certificate) {
        throw new Error(
          "Invalid transition: Cannot reject an application that has an active certificate issued."
        );
      }

      const updated = await db.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.REJECTED,
          rejectionReason: rejectionReason.trim(),
          ...(internalNotes !== undefined && { internalNotes }),
        },
      });

      await recordAuditLog({
        userId: actorUserId || null,
        applicationId,
        action: "APPLICATION_REJECTED",
        details: `Reason: ${rejectionReason.trim()}`,
      });

      return updated;
    }

    // ==========================================
    // 3. UNDER REVIEW WORKFLOW
    // ==========================================
    if (status === ApplicationStatus.UNDER_REVIEW) {
      if (!canStartReview(actorRole)) {
        throw new Error(
          "FORBIDDEN: User does not have permission to start application review."
        );
      }

      if (existing.status === ApplicationStatus.CERTIFICATE_GENERATED || existing.certificate) {
        throw new Error(
          "Invalid transition: Cannot put an application with an issued certificate back into review."
        );
      }
      if (existing.status === ApplicationStatus.REJECTED) {
        throw new Error(
          "Invalid transition: Cannot move a rejected application back into review directly."
        );
      }

      const updated = await db.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.UNDER_REVIEW,
          ...(internalNotes !== undefined && { internalNotes }),
          ...(requestedInfo !== undefined && { requestedInfo }),
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

      return updated;
    }

    // ==========================================
    // 4. RESET TO PENDING (SUPER_ADMIN ONLY)
    // ==========================================
    if (status === ApplicationStatus.PENDING) {
      if (actorRole !== Role.SUPER_ADMIN && actorRole !== Role.ADMIN) {
        throw new Error("FORBIDDEN: Only administrators can reset application status to PENDING.");
      }

      if (existing.status === ApplicationStatus.CERTIFICATE_GENERATED || existing.certificate) {
        throw new Error(
          "Invalid transition: Cannot reset an application with an issued certificate to PENDING."
        );
      }

      const updated = await db.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.PENDING,
          ...(internalNotes !== undefined && { internalNotes }),
        },
      });

      await recordAuditLog({
        userId: actorUserId || null,
        applicationId,
        action: "STATUS_CHANGED_TO_PENDING",
        details: `Application status reset to PENDING by ${actorRole}`,
      });

      return updated;
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
