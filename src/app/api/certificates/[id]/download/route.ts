import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { CertificateGenerator } from "@/features/certificates/certificate.generator";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Admin Certificate Download Endpoint
 * GET /api/certificates/[id]/download
 * 
 * Strict Admin Download Behavior:
 * - Requires active authenticated session (401 if unauthenticated).
 * - SUPER_ADMIN & ADMIN: Authorized to download certificate PDF, including REVOKED certificates
 *   (preserving historical record without modifying the underlying PDF).
 * - VERIFICATION_OFFICER: Permitted for VALID certificates; blocked from downloading REVOKED certificates (403).
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

    // 2. Find certificate by id, recordId, or certificateNumber
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
      return NextResponse.json(
        { error: "Certificate record not found." },
        { status: 404 }
      );
    }

    // 3. RBAC & Status Handling for Admin Download
    const isRevoked = cert.verificationStatus === "REVOKED";
    if (isRevoked) {
      if (session.role === "VERIFICATION_OFFICER") {
        return NextResponse.json(
          { error: "Forbidden: Verification Officers cannot download revoked certificates." },
          { status: 403 }
        );
      }
      // SUPER_ADMIN and ADMIN are permitted to download historical PDF of revoked certificates
    }

    let pdfBuffer: Buffer | null = null;

    // 4. Try reading existing PDF from storage
    const storagePath = cert.pdfUrl || cert.certificatePdfUrl;
    try {
      if (storagePath) {
        pdfBuffer = await storage.getFile(storagePath);
      }
    } catch {
      pdfBuffer = null;
    }

    // 5. Fallback if file missing from local disk: generate historical replica
    if (!pdfBuffer) {
      const generated = await CertificateGenerator.generate({
        recipientName: cert.recipientName,
        category: cert.category,
        achievementTitle: cert.achievementTitle,
        place: cert.place,
        recordId: cert.recordId,
        certificateNumber: cert.certificateNumber,
        dateOfRecognition: formatDate(cert.issueDate),
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
