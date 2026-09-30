"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  Download,
  Eye,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { OFFICIAL_CATEGORIES } from "@/config/categories";

export interface CertificateRegistryItem {
  id: string;
  recordId: string;
  certificateNumber: string;
  recipientName: string;
  category: string;
  achievementTitle: string;
  place?: string | null;
  issueDate: string | Date;
  verificationStatus: "VALID" | "REVOKED";
  generatedAt: string | Date;
  applicationId: string;
  application?: {
    id: string;
    applicationNumber: string;
    applicantEmail: string;
    country: string;
  } | null;
}

export interface CertificateRegistryProps {
  certificates: CertificateRegistryItem[];
  counts: {
    total: number;
    valid: number;
    revoked: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  userRole?: string;
}

export function CertificateRegistryView({
  certificates,
  counts,
  pagination,
  userRole,
}: CertificateRegistryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search and filter state from URL params
  const [searchInput, setSearchInput] = useState(searchParams?.get("search") || "");
  const [selectedStatus, setSelectedStatus] = useState(searchParams?.get("status") || "ALL");
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get("category") || "");
  const [dateFrom, setDateFrom] = useState(searchParams?.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams?.get("dateTo") || "");

  // Revocation modal state
  const [selectedCert, setSelectedCert] = useState<CertificateRegistryItem | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revocationReason, setRevocationReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Apply filters via URL navigation
  const applyFilters = (overrides?: {
    page?: number;
    search?: string;
    status?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const params = new URLSearchParams();

    const p = overrides?.page !== undefined ? overrides.page : 1;
    if (p > 1) params.set("page", String(p));

    const s = overrides?.search !== undefined ? overrides.search : searchInput;
    if (s.trim()) params.set("search", s.trim());

    const st = overrides?.status !== undefined ? overrides.status : selectedStatus;
    if (st && st !== "ALL") params.set("status", st);

    const cat = overrides?.category !== undefined ? overrides.category : selectedCategory;
    if (cat.trim() && cat !== "ALL") params.set("category", cat.trim());

    const df = overrides?.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
    if (df) params.set("dateFrom", df);

    const dt = overrides?.dateTo !== undefined ? overrides.dateTo : dateTo;
    if (dt) params.set("dateTo", dt);

    router.push(`/admin/certificates?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ page: 1, search: searchInput });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSelectedStatus("ALL");
    setSelectedCategory("");
    setDateFrom("");
    setDateTo("");
    router.push("/admin/certificates");
  };

  const openRevokeModal = (cert: CertificateRegistryItem) => {
    setSelectedCert(cert);
    setRevocationReason("");
    setErrorMessage(null);
    setIsRevokeModalOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedCert) return;
    const cleanReason = revocationReason.trim();
    if (!cleanReason) {
      setErrorMessage("Revocation reason is mandatory and cannot be empty or whitespace only.");
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(selectedCert.id)}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cleanReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke certificate");
      }

      setIsRevokeModalOpen(false);
      setSelectedCert(null);
      setSuccessNotice(
        `Certificate ${data.certificate.certificateNumber} (${data.certificate.recordId}) has been successfully revoked.`
      );
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while revoking the certificate.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif flex items-center gap-2.5">
            <Award className="h-6 w-6 text-amber-400" />
            Official Certificate Registry
          </h2>
          <p className="text-xs text-slate-400">
            Lifecycle registry and audit record management for World Book of Record Excellence certificates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/verify" target="_blank">
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Public Verification Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successNotice && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-rose-400 hover:text-white font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Certificates
            </div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{counts.total}</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400">
            <Award className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Valid Certificates
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-1 font-mono">{counts.valid}</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
              Revoked Certificates
            </div>
            <div className="text-2xl font-bold text-rose-300 mt-1 font-mono">{counts.revoked}</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-900/30 border border-rose-700/40 flex items-center justify-center text-rose-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Record ID, Certificate Number, Recipient, Achievement..."
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          <Button type="submit" variant="gold" size="sm" className="h-9 px-4 text-xs font-semibold">
            Search
          </Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                applyFilters({ page: 1, status: e.target.value });
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="VALID">VALID</option>
              <option value="REVOKED">REVOKED</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                applyFilters({ page: 1, category: e.target.value });
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="">All Categories</option>
              {OFFICIAL_CATEGORIES.map((cat) => (
                <option key={cat.code} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Issued From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                applyFilters({ page: 1, dateFrom: e.target.value });
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Issued To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                applyFilters({ page: 1, dateTo: e.target.value });
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
        {certificates.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Award className="h-8 w-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-300">No certificates match your query.</p>
            <p className="text-[11px] text-slate-500">
              Try adjusting your search keywords, status filter, or issue date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-5 py-4">Record ID</th>
                  <th className="px-5 py-4">Certificate Number</th>
                  <th className="px-5 py-4">Recipient</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Achievement</th>
                  <th className="px-5 py-4">Issue Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {certificates.map((cert) => {
                  const isRevoked = cert.verificationStatus === "REVOKED";

                  return (
                    <tr
                      key={cert.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isRevoked ? "bg-rose-950/10" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {cert.recordId}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-200 whitespace-nowrap">
                        {cert.certificateNumber}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-white whitespace-nowrap">
                        {cert.recipientName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                        {cert.category}
                      </td>
                      <td
                        className="px-5 py-3.5 max-w-[200px] truncate text-slate-200"
                        title={cert.achievementTitle}
                      >
                        {cert.achievementTitle}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                        {formatDate(cert.issueDate)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            !isRevoked
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              !isRevoked ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          />
                          {cert.verificationStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* View details */}
                          <Link href={`/admin/certificates/${cert.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          </Link>

                          {/* Admin download */}
                          <a
                            href={`/api/certificates/${encodeURIComponent(cert.id)}/download`}
                            download
                          >
                            <Button
                              variant="gold"
                              size="sm"
                              className="h-8 text-xs font-semibold"
                              title={isRevoked ? "Download historical PDF (Revoked)" : "Download PDF"}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Download
                            </Button>
                          </a>

                          {/* Open verification */}
                          <Link href={`/verify/${encodeURIComponent(cert.recordId)}`} target="_blank">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-amber-300 hover:text-amber-200"
                              title="Open public verification page"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Verify
                            </Button>
                          </Link>

                          {/* Revoke button */}
                          {!isRevoked ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRevokeModal(cert)}
                              className="h-8 text-xs font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white"
                            >
                              Revoke
                            </Button>
                          ) : (
                            <span className="text-[11px] font-mono text-rose-400/80 px-2 py-1 font-semibold">
                              Revoked
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
            <div>
              Showing page <span className="font-bold text-white">{pagination.page}</span> of{" "}
              <span className="font-bold text-white">{pagination.totalPages}</span> (
              <span className="font-mono text-amber-400">{pagination.total}</span> total)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => applyFilters({ page: pagination.page - 1 })}
                className="h-8 px-2 text-xs border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => applyFilters({ page: pagination.page + 1 })}
                className="h-8 px-2 text-xs border-slate-700 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Revocation Confirmation Modal */}
      {selectedCert && (
        <Modal
          isOpen={isRevokeModalOpen}
          onClose={() => {
            if (!actionLoading) setIsRevokeModalOpen(false);
          }}
          title="Revoke Certificate"
          description="Permanently revoke this official credential. This action is irreversible and recorded in the permanent audit trail."
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Revoke this certificate?</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400">Record ID:</span>
                  <p className="font-mono font-bold text-amber-400">{selectedCert.recordId}</p>
                </div>
                <div>
                  <span className="text-slate-400">Certificate No:</span>
                  <p className="font-mono text-slate-200">{selectedCert.certificateNumber}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Recipient:</span>
                  <p className="font-bold text-white">{selectedCert.recipientName}</p>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Revocation Reason <span className="text-rose-400">*</span>
              </label>
              <Textarea
                rows={3}
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="State the formal reason for revoking this certificate (e.g. Disqualified evidence, applicant request, administrative error)..."
                className="w-full text-xs"
                disabled={actionLoading}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                A formal reason is mandatory and will be permanently appended to the immutable audit log.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRevokeModalOpen(false)}
                disabled={actionLoading}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmRevoke}
                disabled={actionLoading || !revocationReason.trim()}
                className="h-9 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
              >
                {actionLoading ? "Revoking..." : "Revoke Certificate"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
