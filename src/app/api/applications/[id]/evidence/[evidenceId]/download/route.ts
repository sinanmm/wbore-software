import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { EvidenceService } from "@/features/evidence/evidence.service";
import { canDownloadEvidence } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/applications/[id]/evidence/[evidenceId]/download
 * Secure server-side download endpoint for an individual evidence file.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canDownloadEvidence(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to download evidence files." },
        { status: 403 }
      );
    }

    const { id, evidenceId } = await params;

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await EvidenceService.downloadEvidence({
      applicationId: id,
      evidenceId,
      actor: {
        userId: session.userId,
        role: session.role,
      },
      ipAddress: clientIp,
    });

    const safeFilename = encodeURIComponent(result.filename);

    return new NextResponse(new Uint8Array(result.fileBuffer), {
      headers: {
        "Content-Type": result.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${result.filename}"; filename*=UTF-8''${safeFilename}`,
        "Content-Length": String(result.fileBuffer.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Evidence download error:", error);
    const isForbidden = error.message?.includes("FORBIDDEN");
    const isNotFound = error.message?.includes("not found");

    return NextResponse.json(
      { error: error.message || "Failed to download evidence file" },
      { status: isForbidden ? 403 : isNotFound ? 404 : 500 }
    );
  }
}
