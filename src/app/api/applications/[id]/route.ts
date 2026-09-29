import { NextResponse } from "next/server";
import { ApplicationService } from "@/features/applications/application.service";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const application = await ApplicationService.getApplicationById(id);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error: any) {
    console.error("Get application error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve application" },
      { status: 500 }
    );
  }
}
