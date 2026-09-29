import { NextResponse } from "next/server";
import { CertificateService } from "@/features/certificates/certificate.service";
import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === Role.VERIFICATION_OFFICER) {
      return NextResponse.json(
        { error: "Forbidden: Verification officers cannot generate certificates" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId is required" },
        { status: 400 }
      );
    }

    const certificate = await CertificateService.generateCertificateForApplication(
      applicationId,
      session.userId
    );

    return NextResponse.json({
      success: true,
      certificate,
      message: `Certificate generated successfully. Record ID: ${certificate.recordId}`,
    });
  } catch (error: any) {
    console.error("Certificate generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate certificate" },
      { status: 500 }
    );
  }
}
