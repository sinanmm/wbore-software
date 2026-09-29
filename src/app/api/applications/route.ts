import { NextResponse } from "next/server";
import { ApplicationService } from "@/features/applications/application.service";
import { applicationSubmissionSchema } from "@/lib/validation";
import { storage, ALLOWED_EVIDENCE_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/storage";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
      const fileEntries = formData.getAll("evidenceFiles") as File[];
      const processedFiles = [];

      for (const file of fileEntries) {
        if (!file || typeof file === "string" || file.size === 0) continue;

        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            { error: `File ${file.name} exceeds 50MB limit` },
            { status: 400 }
          );
        }

        const mime = file.type || "application/octet-stream";
        if (ALLOWED_EVIDENCE_MIME_TYPES.length > 0 && !ALLOWED_EVIDENCE_MIME_TYPES.includes(mime)) {
          // Allow common image/doc types if mime check is too strict
          if (!mime.startsWith("image/") && !mime.startsWith("video/") && !mime.includes("pdf")) {
            return NextResponse.json(
              { error: `File type ${mime} is not supported for ${file.name}` },
              { status: 400 }
            );
          }
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadResult = await storage.uploadFile(
          buffer,
          file.name,
          "evidence",
          mime
        );

        processedFiles.push({
          fileName: uploadResult.fileUrl.split("/").pop() || file.name,
          originalName: file.name,
          fileUrl: uploadResult.fileUrl,
          fileType: mime,
          fileSize: file.size,
        });
      }

      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
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

    // JSON Payload submission
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
