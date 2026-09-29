import React from "react";
import Link from "next/link";
import { ApplicationService } from "@/features/applications/application.service";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ApplicationsTableView } from "@/components/admin/applications-table-view";
import { Search, Filter, FileText, ArrowRight, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; category?: string }>;
}) {
  const { status, search, category } = await searchParams;

  let items: any[] = [];
  let total = 0;

  try {
    const res = await ApplicationService.listApplications({
      status: status as any,
      search,
      category,
      take: 100,
    });
    items = res.items;
    total = res.total;
  } catch (err) {
    console.error("List applications error:", err);
  }

  const statuses = [
    { label: "All", value: "" },
    { label: "Pending", value: "PENDING" },
    { label: "Under Review", value: "UNDER_REVIEW" },
    { label: "Approved", value: "APPROVED" },
    { label: "Cert Issued", value: "CERTIFICATE_GENERATED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
            Candidate Applications ({total})
          </h2>
          <p className="text-xs text-slate-400">
            Adjudicate incoming record applications and manage evidence dossiers.
          </p>
        </div>

        {/* Search Input */}
        <form method="GET" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search candidate, number..."
              className="h-9 pl-9 pr-3 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 w-56 sm:w-64"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {statuses.map((tab) => {
          const isActive = (status || "") === tab.value;
          return (
            <Link
              key={tab.label}
              href={`/admin/applications${tab.value ? `?status=${tab.value}` : ""}`}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Applications Table */}
      <ApplicationsTableView applications={items} />
    </div>
  );
}
