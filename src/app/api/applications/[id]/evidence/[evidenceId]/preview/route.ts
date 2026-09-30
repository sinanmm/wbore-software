import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { EvidenceService } from "@/features/evidence/evidence.service";
import { canDownloadEvidence } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/applications/[id]/evidence/[evidenceId]/preview
 * Secure server-side inline preview endpoint for images and documents.
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
        { error: "Forbidden: You do not have permission to view evidence files." },
        { status: 403 }
      );
    }

    const { id, evidenceId } = await params;

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await EvidenceService.previewEvidence({
      applicationId: id,
      evidenceId,
      actor: {
        userId: session.userId,
        role: session.role,
      },
      ipAddress: clientIp,
    });

    const isHtmlOrScript =
      result.mimeType.includes("html") ||
      result.mimeType.includes("javascript") ||
      result.mimeType.includes("svg");

    // Strictly enforce safe content type to prevent stored XSS
    const safeContentType = isHtmlOrScript ? "application/octet-stream" : result.mimeType;
    const dispositionType = isHtmlOrScript ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(result.fileBuffer), {
      headers: {
        "Content-Type": safeContentType,
        "Content-Disposition": `${dispositionType}; filename="${result.filename}"`,
        "Content-Length": String(result.fileBuffer.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    console.error("Evidence preview error:", error);
    const isForbidden = error.message?.includes("FORBIDDEN");
    const isNotFound = error.message?.includes("not found");

    return NextResponse.json(
      { error: error.message || "Failed to preview evidence file" },
      { status: isForbidden ? 403 : isNotFound ? 404 : 500 }
    );
  }
}
