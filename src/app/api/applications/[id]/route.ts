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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "VERIFICATION_OFFICER") {
      return NextResponse.json(
        { error: "Forbidden: Verification Officers are not permitted to adjudicate applications." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, internalNotes, rejectionReason, requestedInfo } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status field is required (APPROVED, REJECTED, UNDER_REVIEW, PENDING)" },
        { status: 400 }
      );
    }

    // Reject requires rejection reason as specified in prompt
    if (status === "REJECTED" && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return NextResponse.json(
        { error: "A rejection reason is required when rejecting an application." },
        { status: 400 }
      );
    }

    const updated = await ApplicationService.updateStatus({
      applicationId: id,
      status,
      adminUserId: session.userId,
      internalNotes,
      rejectionReason,
      requestedInfo,
    });

    const refreshed = await ApplicationService.getApplicationById(id);

    return NextResponse.json({
      success: true,
      application: refreshed || updated,
      message:
        status === "APPROVED"
          ? "Application approved and official Certificate issued successfully."
          : `Application status updated to ${status}.`,
    });
  } catch (error: any) {
    console.error("PATCH application error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update application" },
      { status: 500 }
    );
  }
}

