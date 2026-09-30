import { NextResponse } from "next/server";
import { ApplicationService } from "@/features/applications/application.service";
import { applicationSubmissionSchema } from "@/lib/validation";
import { storage } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { validateEvidenceFile, sanitizeFilename } from "@/lib/file-security";
import {
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_EVIDENCE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_TOTAL_SIZE_MB,
} from "@/config/evidence-limits";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const uploadedFilesToCleanup: string[] = [];

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const rawData = {
        fullName: formData.get("fullName")?.toString() || "",
        email: formData.get("email")?.toString() || "",
        phone: formData.get("phone")?.toString() || "",
        country: formData.get("country")?.toString() || "",
        address: formData.get("address")?.toString() || "",
        category: formData.get("category")?.toString() || "",
        achievementTitle: formData.get("achievementTitle")?.toString() || "",
        description: formData.get("description")?.toString() || "",
        place: formData.get("place")?.toString() || "",
        supportingDetails: formData.get("supportingDetails")?.toString() || "",
      };

      const parsed = applicationSubmissionSchema.safeParse(rawData);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.format() },
          { status: 400 }
        );
      }

      // Process uploaded evidence files
      const rawFileEntries = formData.getAll("evidenceFiles") as File[];
      const validFileEntries = rawFileEntries.filter(
        (f) => f && typeof f !== "string" && f.size > 0
      );

      // Check max file count
      if (validFileEntries.length > MAX_FILE_COUNT) {
        return NextResponse.json(
          { error: `Too many files uploaded. Maximum allowed is ${MAX_FILE_COUNT} files.` },
          { status: 400 }
        );
      }

      // Check total size
      const totalSize = validFileEntries.reduce((acc, f) => acc + f.size, 0);
      if (totalSize > MAX_TOTAL_EVIDENCE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `Total evidence size (${Math.round(
              totalSize / (1024 * 1024)
            )}MB) exceeds the maximum allowed limit of ${MAX_TOTAL_SIZE_MB}MB.`,
          },
          { status: 400 }
        );
      }

      const processedFiles = [];

      for (const file of validFileEntries) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            { error: `File "${file.name}" exceeds the maximum ${MAX_FILE_SIZE_MB}MB per-file limit.` },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Validate MIME type, extension, and magic bytes
        const validation = validateEvidenceFile(buffer, file.name, file.type);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error || `File "${file.name}" is not supported.` },
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

        uploadedFilesToCleanup.push(uploadResult.storageKey);

        processedFiles.push({
          fileName: uploadResult.storageKey.split("/").pop() || safeFilename,
          originalName: safeFilename,
          fileUrl: uploadResult.fileUrl,
          fileType: validation.detectedMime || "application/octet-stream",
          fileSize: file.size,
        });
      }

      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";

      const application = await ApplicationService.submitApplication(
        parsed.data,
        processedFiles,
        clientIp
      );

      return NextResponse.json({
        success: true,
        applicationId: application.id,
        applicationNumber: application.applicationNumber,
        message: "Application submitted successfully",
      });
    }

    // JSON Payload submission (without multipart evidence files)
    const jsonBody = await request.json();
    const parsed = applicationSubmissionSchema.safeParse(jsonBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const application = await ApplicationService.submitApplication(parsed.data);

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      message: "Application submitted successfully",
    });
  } catch (error: any) {
    console.error("Application submission failed:", error);

    // Transaction safety: Clean up any files that were uploaded if application creation fails
    if (uploadedFilesToCleanup.length > 0) {
      for (const storageKey of uploadedFilesToCleanup) {
        try {
          await storage.deleteFile(storageKey);
        } catch (cleanupErr) {
          console.warn("Failed to cleanup orphaned file:", storageKey, cleanupErr);
        }
      }
    }

    return NextResponse.json(
      { error: error.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as any;
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "50", 10);

    const result = await ApplicationService.listApplications({
      status,
      search,
      category,
      skip,
      take,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("List applications error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
