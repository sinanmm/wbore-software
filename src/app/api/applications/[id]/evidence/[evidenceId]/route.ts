import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { EvidenceService } from "@/features/evidence/evidence.service";
import { canRemoveEvidence } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/applications/[id]/evidence/[evidenceId]
 * Secure evidence removal endpoint with mandatory justification reason.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canRemoveEvidence(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Verification Officers are not permitted to remove evidence." },
        { status: 403 }
      );
    }

    const { id, evidenceId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { error: "A valid removal justification reason (minimum 3 characters) is required." },
        { status: 400 }
      );
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await EvidenceService.removeEvidence({
      applicationId: id,
      evidenceId,
      reason,
      actor: {
        userId: session.userId,
        role: session.role,
      },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: `Evidence file "${result.removedFileName}" was removed successfully.`,
    });
  } catch (error: any) {
    console.error("Evidence removal error:", error);
    const isForbidden = error.message?.includes("FORBIDDEN");
    const isNotFound = error.message?.includes("not found");
    const isValidationError = error.message?.includes("reason");

    return NextResponse.json(
      { error: error.message || "Failed to remove evidence file" },
      { status: isForbidden ? 403 : isValidationError ? 400 : isNotFound ? 404 : 500 }
    );
  }
}
