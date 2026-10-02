import { CertificateService } from "../certificates/certificate.service";
import { recordAuditLog } from "@/lib/audit";

export interface VerificationResult {
  isValid: boolean;
  status: "VALID" | "REVOKED" | "NOT_FOUND";
  certificate?: {
    recordId: string;
    certificateNumber: string;
    recipientName: string;
    category: string;
    achievementTitle: string;
    place: string;
    issueDate: Date;
    verificationStatus: string;
    downloadUrl: string;
    verificationUrl?: string | null;
  };
  verifiedAt: Date;
  message: string;
}

export class VerificationService {
  /**
   * Verifies a certificate by Record ID or Certificate Number.
   * Strictly enforces data privacy: never exposes database IDs, storage keys,
   * applicant email, phone, address, evidence, or internal notes.
   */
  public static async verify(
    identifier: string,
    ipAddress?: string
  ): Promise<VerificationResult> {
    if (!identifier || identifier.trim().length === 0) {
      return {
        isValid: false,
        status: "NOT_FOUND",
        verifiedAt: new Date(),
        message: "CERTIFICATE NOT FOUND. Please provide a valid Record ID.",
      };
    }

    try {
      const cert = await CertificateService.findByRecordOrCertNumber(identifier);

      if (!cert) {
        return {
          isValid: false,
          status: "NOT_FOUND",
          verifiedAt: new Date(),
          message: "CERTIFICATE NOT FOUND",
        };
      }

      const isRevoked = cert.status === "REVOKED" || cert.verificationStatus === "REVOKED";

      if (isRevoked) {
        await recordAuditLog({
          entity: "CERTIFICATE",
          entityId: cert.id,
          action: "CERTIFICATE_REVOCATION_CHECKED",
          details: `Revoked certificate queried: ${cert.recordId}`,
          ipAddress: ipAddress || null,
        });

        return {
          isValid: false,
          status: "REVOKED",
          certificate: {
            recordId: cert.recordId,
            certificateNumber: cert.certificateNumber,
            recipientName: cert.recipientName,
            category: cert.category || "General",
            achievementTitle: cert.achievementTitle || cert.recordTitle,
            place: cert.place || cert.location,
            issueDate: cert.issueDate,
            verificationStatus: "REVOKED",
            downloadUrl: `/api/verification/${encodeURIComponent(cert.recordId)}/certificate`,
            verificationUrl: cert.verificationUrl || null,
          },
          verifiedAt: new Date(),
          message: "CERTIFICATE REVOKED",
        };
      }

      await recordAuditLog({
        entity: "CERTIFICATE",
        entityId: cert.id,
        action: "CERTIFICATE_VERIFIED",
        details: `Record verified: ${cert.recordId} (${cert.certificateNumber})`,
        ipAddress: ipAddress || null,
      });

      return {
        isValid: true,
        status: "VALID",
        certificate: {
          recordId: cert.recordId,
          certificateNumber: cert.certificateNumber,
          recipientName: cert.recipientName,
          category: cert.category || "General",
          achievementTitle: cert.achievementTitle || cert.recordTitle,
          place: cert.place || cert.location,
          issueDate: cert.issueDate,
          verificationStatus: "VALID",
          downloadUrl: `/api/verification/${encodeURIComponent(cert.recordId)}/certificate`,
          verificationUrl: cert.verificationUrl || null,
        },
        verifiedAt: new Date(),
        message: "VERIFIED",
      };
    } catch (dbErr: any) {
      console.warn("Verification registry error:", dbErr.message);
      return {
        isValid: false,
        status: "NOT_FOUND",
        verifiedAt: new Date(),
        message: "CERTIFICATE NOT FOUND",
      };
    }
  }
}
