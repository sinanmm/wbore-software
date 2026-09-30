import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { EvidenceService } from "@/features/evidence/evidence.service";
import { canUploadEvidence, canDownloadEvidence } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/applications/[id]/evidence
 * Lists all evidence files for the application.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canDownloadEvidence(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const files = await EvidenceService.getEvidenceForApplication(id);
    return NextResponse.json(files);
  } catch (error: any) {
    console.error("List evidence error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch evidence files" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications/[id]/evidence
 * Admin endpoint: Upload additional evidence received by WBRE staff.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC: Only SUPER_ADMIN and ADMIN can upload additional evidence
    if (!canUploadEvidence(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Verification Officers are not permitted to upload additional evidence." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const evidenceCategory = formData.get("category")?.toString() || "Supplementary Evidence";
    const notes = formData.get("notes")?.toString() || "";

    if (!file || typeof file === "string" || file.size === 0) {
      return NextResponse.json({ error: "A valid file is required." }, { status: 400 });
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const buffer = Buffer.from(await file.arrayBuffer());

    const evidence = await EvidenceService.uploadAdminEvidence({
      applicationId: id,
      fileBuffer: buffer,
      filename: file.name,
      declaredMime: file.type,
      evidenceCategory,
      notes,
      actor: {
        userId: session.userId,
        role: session.role,
      },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      evidence,
      message: `Additional evidence "${evidence.originalName}" attached successfully.`,
    });
  } catch (error: any) {
    console.error("Upload evidence error:", error);
    const isForbidden = error.message?.includes("FORBIDDEN");
    const isValidationError =
      error.message?.includes("exceeds") ||
      error.message?.includes("not supported") ||
      error.message?.includes("signature") ||
      error.message?.includes("limit");

    return NextResponse.json(
      { error: error.message || "Failed to upload evidence" },
      { status: isForbidden ? 403 : isValidationError ? 400 : 500 }
    );
  }
}
