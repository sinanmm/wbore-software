import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { validateEvidenceFile, sanitizeFilename } from "@/lib/file-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string" || file.size === 0) {
      return NextResponse.json(
        { error: "No valid file uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Comprehensive file security check: extension, MIME, dangerous file check, magic bytes
    const validation = validateEvidenceFile(buffer, file.name, file.type);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "File format or content is not supported." },
        { status: 400 }
      );
    }

    const safeFilename = sanitizeFilename(file.name);

    const uploadResult = await storage.uploadFile(
      buffer,
      safeFilename,
      "evidence",
      validation.detectedMime || "application/octet-stream"
    );

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.storageKey.split("/").pop() || safeFilename,
      originalName: safeFilename,
      fileType: validation.detectedMime || "application/octet-stream",
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
