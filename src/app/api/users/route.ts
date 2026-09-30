import { NextResponse } from "next/server";
import { UserService } from "@/features/users/user.service";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import { createUserSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageUsers(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Super Administrator access required" },
        { status: 403 }
      );
    }

    const users = await UserService.listUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageUsers(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can create staff users." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Validation failed";
      return NextResponse.json(
        { error: firstIssue, details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    const newUser = await UserService.createUser(
      {
        name,
        email,
        password,
        role,
      },
      session.userId
    );

    return NextResponse.json({
      success: true,
      user: newUser,
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 400 }
    );
  }
}
