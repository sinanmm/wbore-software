import { NextResponse } from "next/server";
import { storage, ALLOWED_EVIDENCE_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/storage";

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

    // Size limit validation (50MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the maximum limit of 50MB` },
        { status: 400 }
      );
    }

    // MIME type validation
    const mime = file.type || "application/octet-stream";
    const isAllowed =
      ALLOWED_EVIDENCE_MIME_TYPES.includes(mime) ||
      mime.startsWith("image/") ||
      mime.startsWith("video/") ||
      mime === "application/pdf";

    if (!isAllowed) {
      return NextResponse.json(
        { error: `File format ${mime} is not supported. Allowed: PDF, JPG, PNG, MP4.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await storage.uploadFile(
      buffer,
      file.name,
      "evidence",
      mime
    );

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileUrl.split("/").pop() || file.name,
      originalName: file.name,
      fileType: mime,
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
