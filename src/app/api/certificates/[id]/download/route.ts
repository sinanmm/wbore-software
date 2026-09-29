import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { CertificateGenerator } from "@/features/certificates/certificate.generator";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();

    // Find certificate by id, recordId, or certificateNumber
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
        { error: "Certificate record not found" },
        { status: 404 }
      );
    }

    let pdfBuffer: Buffer | null = null;

    // Try reading from storage
    try {
      if (cert.pdfUrl) {
        pdfBuffer = await storage.getFile(cert.pdfUrl);
      }
    } catch {
      pdfBuffer = null;
    }

    // If file doesn't exist yet on disk, generate it dynamically on the fly
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

    const filename = `${cert.certificateNumber || "WBRE-Certificate"}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Certificate download error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download certificate" },
      { status: 500 }
    );
  }
}
