import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canRevokeCertificate } from "@/lib/rbac";
import { revokeCertificateSchema } from "@/lib/validation";
import { CertificateService } from "@/features/certificates/certificate.service";

export const dynamic = "force-dynamic";

/**
 * Certificate Revocation Endpoint
 * POST /api/certificates/[id]/revoke
 * 
 * Strict RBAC: SUPER_ADMIN and ADMIN only.
 * Verification Officers are forbidden (403).
 * Unauthenticated requests are rejected (401).
 * Server strictly forces status = REVOKED, rejecting any client status manipulation.
 * Mandatory reason required (non-empty, non-whitespace).
 * Returns idempotent response if already revoked.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorize role (SUPER_ADMIN and ADMIN only)
    if (!canRevokeCertificate(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to revoke certificates." },
        { status: 403 }
      );
    }

    // 3. Resolve target certificate identifier from route params
    const { id } = await params;
    const cleanId = decodeURIComponent(id || "").trim();
    if (!cleanId) {
      return NextResponse.json(
        { error: "Missing certificate identifier" },
        { status: 400 }
      );
    }

    // 4. Parse and validate body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Server-side guard: do NOT allow the client to pass verificationStatus
    if ("verificationStatus" in body && body.verificationStatus !== "REVOKED") {
      return NextResponse.json(
        { error: "Direct mutation of verification status is not allowed." },
        { status: 400 }
      );
    }

    const validationResult = revokeCertificateSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMsg =
        validationResult.error.errors[0]?.message || "Invalid revocation payload";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { reason } = validationResult.data;

    // 5. Execute revocation logic via CertificateService
    const result = await CertificateService.revokeCertificate({
      certificateId: cleanId,
      reason,
      actor: {
        userId: session.userId,
        role: session.role,
      },
    });

    return NextResponse.json(
      {
        success: true,
        alreadyRevoked: result.alreadyRevoked,
        message: result.message,
        certificate: {
          id: result.certificate.id,
          recordId: result.certificate.recordId,
          certificateNumber: result.certificate.certificateNumber,
          recipientName: result.certificate.recipientName,
          verificationStatus: result.certificate.verificationStatus,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message && error.message.includes("Certificate not found")) {
      return NextResponse.json(
        { error: "Certificate record not found." },
        { status: 404 }
      );
    }
    if (error.message && error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    if (error.message && error.message.includes("mandatory")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("Revocation endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to process certificate revocation." },
      { status: 500 }
    );
  }
}
