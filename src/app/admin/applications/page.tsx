import React from "react";
import Link from "next/link";
import { ApplicationService } from "@/features/applications/application.service";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <FileText className="h-8 w-8 mx-auto text-slate-600" />
            <p>No applications match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-5 py-4">App Number</th>
                  <th className="px-5 py-4">Applicant & Email</th>
                  <th className="px-5 py-4">Category & Location</th>
                  <th className="px-5 py-4">Achievement Title</th>
                  <th className="px-5 py-4 text-center">Evidence</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Submitted</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-amber-400">
                      {app.applicationNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-white">{app.applicantName}</p>
                      <p className="text-[11px] text-slate-400">{app.applicantEmail}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-200">{app.category}</p>
                      <p className="text-[11px] text-slate-400">{app.place}</p>
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px] truncate font-medium text-slate-200">
                      {app.achievementTitle}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] border border-slate-700">
                        {app.evidenceFiles?.length || 0} files
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/admin/applications/${app.id}`}>
                        <Button variant="gold" size="sm" className="h-8 text-xs font-semibold">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
