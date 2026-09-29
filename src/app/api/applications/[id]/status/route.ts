import { NextResponse } from "next/server";
import { ApplicationService } from "@/features/applications/application.service";
import { updateApplicationStatusSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateApplicationStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status update payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await ApplicationService.updateStatus({
      applicationId: id,
      status: parsed.data.status,
      adminUserId: session.userId,
      internalNotes: parsed.data.internalNotes,
      rejectionReason: parsed.data.rejectionReason,
      requestedInfo: parsed.data.requestedInfo,
    });

    const refreshed = await ApplicationService.getApplicationById(id);

    return NextResponse.json({
      success: true,
      application: refreshed || updated,
      message: `Status updated to ${parsed.data.status}`,
    });
  } catch (error: any) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
