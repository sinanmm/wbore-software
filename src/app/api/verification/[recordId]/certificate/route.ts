import { NextResponse } from "next/server";
import { CertificateService } from "@/features/certificates/certificate.service";
import { CertificateGenerator } from "@/features/certificates/certificate.generator";
import { storage } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Public Certificate Download Endpoint
 * GET /api/verification/[recordId]/certificate
 * Safely streams the official PDF via StorageAdapter without exposing internal filesystem paths.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const { recordId } = await params;
    const cleanRecordId = decodeURIComponent(recordId).trim();

    // 1. Load certificate by Record ID or Certificate Number
    const cert = await CertificateService.findByRecordOrCertNumber(cleanRecordId);

    // 2. Verify record exists
    if (!cert) {
      return NextResponse.json(
        { error: "CERTIFICATE NOT FOUND" },
        { status: 404 }
      );
    }

    // 3. Verify certificate status
    if (cert.status === "REVOKED" || cert.verificationStatus === "REVOKED") {
      return NextResponse.json(
        { error: "CERTIFICATE REVOKED. This credential is no longer active or valid." },
        { status: 410 }
      );
    }

    let pdfBuffer: Buffer | null = null;
    const storagePath = cert.pdfUrl;
    if (storagePath && !storagePath.startsWith("/api/")) {
      try {
        pdfBuffer = await storage.getFile(storagePath);
      } catch {
        pdfBuffer = null;
      }
    }

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

    const downloadFilename = `${cert.recordId}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${downloadFilename}"`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("Public certificate stream error:", err);
    return NextResponse.json(
      { error: "Failed to stream certificate document." },
      { status: 500 }
    );
  }
}
