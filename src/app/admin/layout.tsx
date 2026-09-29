"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If on admin login page, display clean standalone layout without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const getPageTitle = (path: string) => {
    if (path.includes("/applications/")) return "Application Review & Adjudication";
    if (path.includes("/applications")) return "Application Management";
    if (path.includes("/certificates")) return "Certificate Registry";
    if (path.includes("/verification")) return "Verification Audit";
    if (path.includes("/users")) return "User Management";
    if (path.includes("/settings")) return "System Settings";
    return "Adjudication Dashboard";
  };

  return (
    <div className="min-h-screen flex bg-[#050914] text-slate-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader title={getPageTitle(pathname)} />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
