import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { EvidenceService } from "@/features/evidence/evidence.service";
import { canDownloadEvidence } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/applications/[id]/evidence/dossier
 * Compiles and returns a complete ZIP dossier of all evidence files for an application.
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
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to download evidence dossiers." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await EvidenceService.createDossierZip({
      applicationId: id,
      actor: {
        userId: session.userId,
        role: session.role,
      },
      ipAddress: clientIp,
    });

    const safeZipName = encodeURIComponent(result.zipFilename);

    return new NextResponse(new Uint8Array(result.zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.zipFilename}"; filename*=UTF-8''${safeZipName}`,
        "Content-Length": String(result.zipBuffer.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Dossier generation error:", error);
    const isForbidden = error.message?.includes("FORBIDDEN");
    const isNotFound = error.message?.includes("not found");
    const isSizeError = error.message?.includes("exceeds");

    return NextResponse.json(
      { error: error.message || "Failed to generate evidence dossier" },
      { status: isForbidden ? 403 : isSizeError ? 413 : isNotFound ? 404 : 500 }
    );
  }
}
