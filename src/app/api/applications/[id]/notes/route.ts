import { NextResponse } from "next/server";
import { ApplicationService } from "@/features/applications/application.service";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
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
    const notes = typeof body.notes === "string" ? body.notes : "";

    const updated = await ApplicationService.saveInternalNotes(
      id,
      notes,
      session.userId
    );

    return NextResponse.json({
      success: true,
      internalNotes: updated.internalNotes,
    });
  } catch (error: any) {
    console.error("Save notes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save internal notes" },
      { status: 500 }
    );
  }
}
