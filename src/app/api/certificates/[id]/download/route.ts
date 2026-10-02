import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { CertificateService } from "@/features/certificates/certificate.service";
import { CertificateGenerator } from "@/features/certificates/certificate.generator";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Admin Certificate Download Endpoint
 * GET /api/certificates/[id]/download
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate admin user
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required to download administrative records." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const cleanId = decodeURIComponent(id || "").trim();

    // 2. Find certificate
    const cert = await CertificateService.findByRecordOrCertNumber(cleanId);

    if (!cert) {
      return NextResponse.json(
        { error: "Certificate record not found." },
        { status: 404 }
      );
    }

    // 3. RBAC & Status Handling for Admin Download
    const isRevoked = cert.status === "REVOKED" || cert.verificationStatus === "REVOKED";
    if (isRevoked) {
      if (session.role === "VERIFICATION_OFFICER" || session.role === "REVIEWER") {
        return NextResponse.json(
          { error: "Forbidden: Reviewers and Verification Officers cannot download revoked certificates." },
          { status: 403 }
        );
      }
    }

    let pdfBuffer: Buffer | null = null;

    // 4. Try reading existing PDF from storage if available
    const storagePath = cert.pdfUrl;
    if (storagePath && !storagePath.startsWith("/api/")) {
      try {
        pdfBuffer = await storage.getFile(storagePath);
      } catch {
        pdfBuffer = null;
      }
    }

    // 5. Generate high-resolution PDF if not pre-stored
    if (!pdfBuffer) {
      const generated = await CertificateGenerator.generate({
        recipientName: cert.recipientName,
        category: cert.category || "General",
        achievementTitle: cert.achievementTitle || cert.recordTitle,
        place: cert.place || cert.location,
        recordId: cert.recordId,
        certificateNumber: cert.certificateNumber,
        dateOfRecognition: formatDate(cert.achievementDate || cert.issueDate),
      });
      pdfBuffer = generated.pdfBuffer;
    }

    const filename = `${cert.certificateNumber || cert.recordId || "WBRE-Certificate"}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Admin certificate download error:", error);
    return NextResponse.json(
      { error: "Failed to download certificate." },
      { status: 500 }
    );
  }
}
