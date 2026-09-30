import { NextResponse } from "next/server";
import { ApplicationService } from "@/features/applications/application.service";
import { getSession } from "@/lib/auth";
import { saveNotesSchema } from "@/lib/validation";

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
    const parsed = saveNotesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid notes payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await ApplicationService.saveInternalNotes(
      id,
      parsed.data.notes,
      session.userId,
      session.role
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
