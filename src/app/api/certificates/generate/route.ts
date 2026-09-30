import { NextResponse } from "next/server";
import { CertificateService } from "@/features/certificates/certificate.service";
import { getSession } from "@/lib/auth";
import { canGenerateCertificate } from "@/lib/rbac";
import { generateCertificateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canGenerateCertificate(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Verification Officers are not permitted to generate certificates." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = generateCertificateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "applicationId is required" },
        { status: 400 }
      );
    }

    const { applicationId } = parsed.data;

    const certificate = await CertificateService.generateCertificateForApplication(
      applicationId,
      session.userId,
      session.role
    );

    return NextResponse.json({
      success: true,
      certificate,
      message: `Certificate generated successfully. Record ID: ${certificate.recordId}`,
    });
  } catch (error: any) {
    console.error("Certificate generation error:", error);
    const isForbidden = error.message?.includes("FORBIDDEN");
    const isNotFound = error.message?.includes("Application not found");
    const isStatusError =
      error.message?.includes("Invalid status") ||
      error.message?.includes("must be approved first") ||
      error.message?.includes("too long") ||
      error.message?.includes("boundary");

    const status = isForbidden ? 403 : isNotFound ? 404 : isStatusError ? 400 : 500;

    return NextResponse.json(
      { error: error.message || "Failed to generate certificate" },
      { status }
    );
  }
}
