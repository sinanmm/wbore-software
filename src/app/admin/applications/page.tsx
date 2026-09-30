import React from "react";
import Link from "next/link";
import { ApplicationService } from "@/features/applications/application.service";
import { Button } from "@/components/ui/button";
import { ApplicationsTableView } from "@/components/admin/applications-table-view";
import { Search, Filter, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Technology & Innovation",
  "Science & Research",
  "Sports & Athletics",
  "Arts & Culture",
  "Business & Leadership",
  "Education & Academics",
  "Humanitarian & Social",
  "Environment & Sustainability",
  "Media & Entertainment",
  "Other Distinctions",
];

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    category?: string;
    country?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const { status, search, category, country, dateFrom, dateTo, page } = await searchParams;

  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = 20;

  let items: any[] = [];
  let total = 0;
  let totalPages = 1;

  try {
    const res = await ApplicationService.listApplications({
      status: status as any,
      search,
      category,
      country,
      dateFrom,
      dateTo,
      page: currentPage,
      pageSize,
    });
    items = res.items;
    total = res.total;
    totalPages = res.totalPages;
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

  const hasActiveFilters = Boolean(
    status || search || category || country || dateFrom || dateTo
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
            Application Registry ({total})
          </h2>
          <p className="text-xs text-slate-400">
            Adjudicate incoming record applications, review evidence dossiers, and manage review states.
          </p>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl p-4 space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80">
          <span className="text-[11px] uppercase font-semibold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="h-3 w-3 text-amber-400" />
            Status:
          </span>
          {statuses.map((tab) => {
            const isActive = (status || "") === tab.value;
            // Build URL with current filters
            const params = new URLSearchParams();
            if (tab.value) params.set("status", tab.value);
            if (search) params.set("search", search);
            if (category) params.set("category", category);
            if (country) params.set("country", country);
            if (dateFrom) params.set("dateFrom", dateFrom);
            if (dateTo) params.set("dateTo", dateTo);

            return (
              <Link
                key={tab.label}
                href={`/admin/applications?${params.toString()}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Filters Form */}
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1 items-end">
          {status && <input type="hidden" name="status" value={status} />}

          {/* Search */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
              Search Candidate / Record
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search || ""}
                placeholder="Name, APP number, email, title..."
                className="h-8 pl-8 pr-2.5 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
              Category
            </label>
            <select
              name="category"
              defaultValue={category || ""}
              className="h-8 px-2 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
              Country
            </label>
            <input
              type="text"
              name="country"
              defaultValue={country || ""}
              placeholder="e.g. United Kingdom"
              className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
            />
          </div>

          {/* Date Range: From */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
              Lodged From
            </label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom || ""}
              className="h-8 px-2 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <Button type="submit" variant="gold" size="sm" className="h-8 text-xs font-semibold px-3 flex-1 shadow-gold">
              Filter
            </Button>
            {hasActiveFilters && (
              <Link href="/admin/applications">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs border-slate-700 text-slate-400 hover:text-white"
                  title="Clear all filters"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Applications Table View with Pagination */}
      <ApplicationsTableView
        applications={items}
        page={currentPage}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
      />
    </div>
  );
}
