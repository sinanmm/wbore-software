import { db } from "@/lib/prisma";
import { Role } from "@/types";
import { hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export class UserService {
  /**
   * List all registered staff users
   */
  public static async listUsers() {
    return await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get user by ID
   */
  public static async getUserById(id: string) {
    return await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Create a new administrator / verification officer (Super Admin only)
   */
  public static async createUser(input: CreateUserInput, actorUserId?: string) {
    const existing = await db.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new Error("A user with this email address already exists.");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await db.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await recordAuditLog({
      userId: actorUserId,
      action: "USER_CREATED",
      details: `Created user ${user.email} with role ${user.role}`,
    });

    return user;
  }

  /**
   * Update user role (Super Admin only)
   */
  public static async updateUserRole(userId: string, role: Role, actorUserId?: string) {
    const updated = await db.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await recordAuditLog({
      userId: actorUserId,
      action: "USER_ROLE_CHANGED",
      details: `Updated role of ${updated.email} to ${role}`,
    });

    return updated;
  }

  /**
   * Delete user (Super Admin only)
   */
  public static async deleteUser(userId: string, actorUserId?: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    await db.user.delete({ where: { id: userId } });

    await recordAuditLog({
      userId: actorUserId,
      action: "USER_DELETED",
      details: `Deleted user ${user.email}`,
    });

    return { success: true };
  }
}
