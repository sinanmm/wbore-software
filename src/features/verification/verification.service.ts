import { CertificateService } from "../certificates/certificate.service";
import { recordAuditLog } from "@/lib/audit";

export interface VerificationResult {
  isValid: boolean;
  certificate?: {
    id: string;
    recordId: string;
    certificateNumber: string;
    recipientName: string;
    category: string;
    achievementTitle: string;
    place: string;
    issueDate: Date;
    pdfUrl: string;
    qrCodeUrl: string | null;
    verificationUrl: string | null;
  };
  application?: {
    applicationNumber: string;
    country: string;
    description: string;
    createdAt: Date;
  };
  verifiedAt: Date;
  message: string;
}

export class VerificationService {
  /**
   * Verifies a certificate by Record ID or Certificate Number.
   */
  public static async verify(
    identifier: string,
    ipAddress?: string
  ): Promise<VerificationResult> {
    if (!identifier || identifier.trim().length === 0) {
      return {
        isValid: false,
        verifiedAt: new Date(),
        message: "Please enter a valid Record ID or Certificate Number.",
      };
    }

    try {
      const cert = await CertificateService.findByRecordOrCertNumber(identifier);

      if (!cert) {
        return {
          isValid: false,
          verifiedAt: new Date(),
          message: `No active record found for "${identifier.trim()}". Please verify the ID format and try again.`,
        };
      }

      await recordAuditLog({
        applicationId: cert.applicationId,
        action: "CERTIFICATE_VERIFIED",
        details: `Record verified: ${cert.recordId} (${cert.certificateNumber})`,
        ipAddress: ipAddress || null,
      });

      return {
        isValid: true,
        certificate: {
          id: cert.id,
          recordId: cert.recordId,
          certificateNumber: cert.certificateNumber,
          recipientName: cert.recipientName,
          category: cert.category,
          achievementTitle: cert.achievementTitle,
          place: cert.place,
          issueDate: cert.issueDate,
          pdfUrl: cert.pdfUrl,
          qrCodeUrl: cert.qrCodeUrl,
          verificationUrl: cert.verificationUrl,
        },
        application: cert.application
          ? {
              applicationNumber: cert.application.applicationNumber,
              country: cert.application.country,
              description: cert.application.description,
              createdAt: cert.application.createdAt,
            }
          : undefined,
        verifiedAt: new Date(),
        message: "Certificate is authentic, officially recognized, and active in the registry.",
      };
    } catch (dbErr: any) {
      console.warn("Database connection issue during verification:", dbErr.message);
      return {
        isValid: false,
        verifiedAt: new Date(),
        message: "Database connection unavailable. Please verify DATABASE_URL is configured.",
      };
    }
  }
}
