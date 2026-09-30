import React from "react";
import { getSession } from "@/lib/auth";
import { UserService } from "@/features/users/user.service";
import { UsersTableView } from "@/components/admin/users-table-view";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  // RBAC: Only SUPER_ADMIN is permitted to access user administration
  if (session.role !== Role.SUPER_ADMIN) {
    redirect("/admin/dashboard");
  }

  let users: any[] = [];

  try {
    // UserService.listUsers() explicitly selects only safe fields: id, name, email, role, createdAt, updatedAt
    // passwordHash is NEVER retrieved or sent to client components
    users = await UserService.listUsers();
  } catch (err) {
    console.error("Fetch users error:", err);
  }

  return (
    <UsersTableView
      initialUsers={JSON.parse(JSON.stringify(users))}
      currentUserRole={session.role}
    />
  );
}
