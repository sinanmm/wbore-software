import { NextResponse } from "next/server";
import { ApplicationService } from "@/features/applications/application.service";
import { updateApplicationStatusSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";
import { canApproveApplication, canRejectApplication, canStartReview } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * DELEGATION ENDPOINT: POST /api/applications/[id]/status
 *
 * Safely delegates to the canonical ApplicationService.updateStatus logic
 * with full RBAC enforcement, transition validation, and transaction safety.
 * Canonical direct endpoint: PATCH /api/applications/[id]
 */
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
      const issue = parsed.error.issues[0]?.message || "Invalid status update payload";
      return NextResponse.json(
        { error: issue, details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { status, internalNotes, rejectionReason, requestedInfo } = parsed.data;

    // RBAC: Check start review permission
    if (
      (status === "UNDER_REVIEW" || status === "UNDER_INITIAL_REVIEW") &&
      !canStartReview(session.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden: You are not permitted to start reviewing applications." },
        { status: 403 }
      );
    }

    // RBAC: Verification officers cannot approve or reject applications
    if (status === "APPROVED" && !canApproveApplication(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Verification Officers are not permitted to approve applications." },
        { status: 403 }
      );
    }

    if (status === "REJECTED" && !canRejectApplication(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Verification Officers are not permitted to reject applications." },
        { status: 403 }
      );
    }

    const updated = await ApplicationService.updateStatus({
      applicationId: id,
      status,
      actor: {
        userId: session.userId,
        role: session.role,
      },
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
          ? "Application approved successfully. Awaiting certificate generation."
          : `Status updated to ${status}`,
    });
  } catch (error: any) {
    console.error("Status update delegation error:", error);
    const isForbidden = error.message?.includes("FORBIDDEN");
    const isTransitionError =
      error.message?.includes("Invalid transition") ||
      error.message?.includes("Invalid action") ||
      error.message?.includes("rejection reason is required");

    return NextResponse.json(
      { error: error.message || "Failed to update status" },
      { status: isForbidden ? 403 : isTransitionError ? 400 : 500 }
    );
  }
}
