import React from "react";
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { UsersTableView } from "@/components/admin/users-table-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  let users: any[] = [];

  try {
    users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });
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
