import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { canDownloadEvidence, canRemoveEvidence } from "@/lib/rbac";
import { recordAuditLog } from "@/lib/audit";
import { validateFileMagicBytes } from "@/lib/file-security";
import { EvidenceService } from "@/features/evidence/evidence.service";

export const dynamic = "force-dynamic";

/**
 * Resolves the accurate and safe MIME type for an evidence file.
 */
function resolveSafeMimeType(buffer: Buffer, declaredType: string, filename: string): string {
  // 1. Check magic bytes
  const magic = validateFileMagicBytes(buffer);
  if (magic.valid && magic.detectedMime) {
    return magic.detectedMime;
  }

  // 2. Check declared MIME type if valid
  const lowerDeclared = (declaredType || "").toLowerCase().trim();
  if (
    lowerDeclared.startsWith("image/") ||
    lowerDeclared.startsWith("video/") ||
    lowerDeclared === "application/pdf" ||
    lowerDeclared.includes("word") ||
    lowerDeclared.includes("officedocument")
  ) {
    return lowerDeclared;
  }

  // 3. Fallback to file extension
  const ext = (filename || "").toLowerCase().split(".").pop();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

/**
 * GET /api/applications/[id]/evidence/[evidenceId]
 * Canonical secure authenticated evidence endpoint.
 * Supports inline browser rendering for safe previewable formats, and attachment download when ?download=true.
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
    const url = new URL(request.url);
    const isDownload =
      url.searchParams.get("download") === "true" ||
      url.searchParams.get("download") === "1";

    const evidence = await db.applicationEvidence.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence || evidence.applicationId !== id) {
      return NextResponse.json(
        { error: "Evidence file not found on this application." },
        { status: 404 }
      );
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await storage.getFile(evidence.fileUrl);
    } catch {
      return NextResponse.json(
        { error: "Unable to load this evidence file. The physical file was not found in storage." },
        { status: 404 }
      );
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const mimeType = resolveSafeMimeType(
      fileBuffer,
      evidence.fileType,
      evidence.originalName || evidence.fileName
    );

    // Prevent stored XSS from untrusted script/HTML/SVG formats
    const isDangerousMime =
      mimeType.includes("html") ||
      mimeType.includes("javascript") ||
      mimeType.includes("svg") ||
      mimeType.includes("xml");

    const safeContentType = isDangerousMime ? "application/octet-stream" : mimeType;
    const shouldAttach = isDownload || isDangerousMime || safeContentType === "application/octet-stream";
    const dispositionType = shouldAttach ? "attachment" : "inline";

    const safeFilename = (evidence.originalName || evidence.fileName || "evidence")
      .replace(/["\r\n]/g, "_");

    // Audit log
    await recordAuditLog({
      userId: session.userId,
      applicationId: id,
      action: isDownload ? "EVIDENCE_DOWNLOADED" : "EVIDENCE_VIEWED",
      details: `${isDownload ? "Downloaded" : "Previewed"} evidence file "${safeFilename}" (${mimeType})`,
      ipAddress: clientIp,
    });

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": safeContentType,
        "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
        "Content-Length": String(fileBuffer.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    console.error("Evidence retrieval error:", error);
    const isForbidden = error.message?.includes("FORBIDDEN");
    const isNotFound = error.message?.includes("not found");

    return NextResponse.json(
      { error: "Unable to load this evidence file. Please try again." },
      { status: isForbidden ? 403 : isNotFound ? 404 : 500 }
    );
  }
}

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
