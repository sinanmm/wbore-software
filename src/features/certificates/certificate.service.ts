import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { getCategoryCode, formatDate } from "@/lib/utils";
import { CertificateGenerator } from "./certificate.generator";

export class CertificateService {
  /**
   * Generates a unique sequential Record ID: WBRE-[CATEGORY]-[YEAR]-[NUMBER]
   * Example: WBRE-TEC-2026-000101
   */
  public static async generateRecordId(category: string): Promise<string> {
    const year = new Date().getFullYear();
    const categoryCode = getCategoryCode(category);
    const prefix = `WBRE-${categoryCode}-${year}-`;

    const count = await db.certificate.count({
      where: {
        recordId: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(count + 101).padStart(6, "0");
    return `${prefix}${sequence}`;
  }

  /**
   * Generates a unique sequential Certificate Number: WBRE-CERT-[YEAR]-[NUMBER]
   * Example: WBRE-CERT-2026-000101
   */
  public static async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WBRE-CERT-${year}-`;

    const count = await db.certificate.count({
      where: {
        certificateNumber: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(count + 101).padStart(6, "0");
    return `${prefix}${sequence}`;
  }

  /**
   * Generates and stores an official certificate for an approved application.
   */
  public static async generateCertificateForApplication(
    applicationId: string,
    adminUserId?: string
  ) {
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { certificate: true },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    // Check if certificate already exists
    if (application.certificate) {
      return application.certificate;
    }

    const recordId = await this.generateRecordId(application.category);
    const certificateNumber = await this.generateCertificateNumber();
    const dateFormatted = formatDate(new Date());

    const { pdfUrl, qrCodeDataUrl } = await CertificateGenerator.generate({
      recipientName: application.applicantName,
      category: application.category,
      achievementTitle: application.achievementTitle,
      place: application.place,
      recordId,
      certificateNumber,
      dateOfRecognition: dateFormatted,
    });

    const certificate = await db.certificate.create({
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
        verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://wbre.org"}/verify?recordId=${recordId}`,
      },
    });

    // Update application status to CERTIFICATE_GENERATED
    await db.application.update({
      where: { id: applicationId },
      data: {
        status: "CERTIFICATE_GENERATED",
      },
    });

    // Record audit log
    await recordAuditLog({
      userId: adminUserId || null,
      applicationId: application.id,
      action: "CERTIFICATE_GENERATED",
      details: `Generated Certificate ${certificateNumber} with Record ID ${recordId}`,
    });

    return certificate;
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
