import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

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
    const cleanRecordId = decodeURIComponent(recordId).trim().toUpperCase();

    // 1. Load certificate by Record ID or Certificate Number
    const cert = await db.certificate.findFirst({
      where: {
        OR: [
          { recordId: { equals: cleanRecordId, mode: "insensitive" } },
          { certificateNumber: { equals: cleanRecordId, mode: "insensitive" } },
        ],
      },
    });

    // 2. Verify record exists
    if (!cert) {
      return NextResponse.json(
        { error: "CERTIFICATE NOT FOUND" },
        { status: 404 }
      );
    }

    // 3. Verify certificate status
    if (cert.verificationStatus === "REVOKED") {
      return NextResponse.json(
        { error: "CERTIFICATE REVOKED. This credential is no longer active or valid." },
        { status: 410 }
      );
    }

    // 4. Resolve storage key or path
    const storagePath = cert.pdfUrl || cert.certificatePdfUrl;
    if (!storagePath) {
      return NextResponse.json(
        { error: "Certificate file record unavailable." },
        { status: 404 }
      );
    }

    // 5. Verify file exists in storage abstraction
    const exists = await storage.exists(storagePath);
    if (!exists) {
      return NextResponse.json(
        { error: "Certificate document file not found in storage repository." },
        { status: 404 }
      );
    }

    // 6. Stream PDF via storage abstraction
    const pdfBuffer = await storage.getFile(storagePath);
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
