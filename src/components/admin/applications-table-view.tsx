"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

export interface ApplicationItem {
  id: string;
  applicationNumber: string;
  applicantName: string;
  applicantEmail: string;
  category: string;
  achievementTitle: string;
  country: string;
  place: string;
  status: string;
  createdAt: string | Date;
  evidenceFiles?: Array<{ id: string; fileType: string; fileSize?: number; originalName?: string }>;
  certificate?: { id: string; recordId: string; certificateNumber: string } | null;
}

export function ApplicationsTableView({
  applications,
  page = 1,
  pageSize = 20,
  total = 0,
  totalPages = 1,
}: {
  applications: ApplicationItem[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const createPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", String(newPage));
    return `/admin/applications?${params.toString()}`;
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/applications/${selectedApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve application");
      }
      setIsApproveOpen(false);
      setSelectedApp(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    if (!rejectionReason.trim()) {
      alert("A rejection reason is required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/applications/${selectedApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject application");
      }
      setIsRejectOpen(false);
      setSelectedApp(null);
      setRejectionReason("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const startEntry = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
        {applications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <FileText className="h-8 w-8 mx-auto text-slate-600" />
            <p>No applications match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Application Number</th>
                  <th className="px-4 py-3.5">Applicant Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Achievement Title</th>
                  <th className="px-4 py-3.5">Country</th>
                  <th className="px-4 py-3.5">Submitted Date</th>
                  <th className="px-4 py-3.5 text-center">Evidence Count</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Application Number */}
                    <td className="px-4 py-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        {app.applicationNumber}
                      </Link>
                    </td>

                    {/* Applicant Name */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white truncate max-w-[150px]">{app.applicantName}</p>
                      <p className="text-[11px] text-slate-400 font-normal truncate max-w-[150px]">{app.applicantEmail}</p>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[11px] font-medium border border-slate-700/60 inline-block whitespace-nowrap">
                        {app.category}
                      </span>
                    </td>

                    {/* Achievement Title */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-200 truncate max-w-[180px]" title={app.achievementTitle}>
                        {app.achievementTitle}
                      </p>
                    </td>

                    {/* Country */}
                    <td className="px-4 py-3 text-slate-300 font-medium whitespace-nowrap">
                      {app.country || "—"}
                    </td>

                    {/* Submitted Date */}
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(app.createdAt)}
                    </td>

                    {/* Evidence Count */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono text-[11px] border border-amber-500/20">
                        {app.evidenceFiles ? app.evidenceFiles.length : 0} files
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={app.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/applications/${app.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] font-semibold px-2 border-slate-700 hover:border-amber-500/50"
                            title="View Application Details"
                          >
                            <Eye className="h-3 w-3 mr-1 text-slate-400" />
                            View
                          </Button>
                        </Link>

                        <Link href={`/admin/applications/${app.id}`}>
                          <Button
                            variant="gold"
                            size="sm"
                            className="h-7 text-[11px] font-bold px-2 shadow-gold"
                            title="Review Application & Adjudicate"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Controls */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/50 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-white">{startEntry}</span> to{" "}
              <span className="font-semibold text-white">{endEntry}</span> of{" "}
              <span className="font-semibold text-amber-400">{total}</span> applications
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5 border-slate-700"
                disabled={page <= 1}
                onClick={() => router.push(createPaginationUrl(page - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>

              <span className="text-xs text-slate-300 font-mono px-2">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5 border-slate-700"
                disabled={page >= totalPages}
                onClick={() => router.push(createPaginationUrl(page + 1))}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* APPROVE MODAL */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Approve Record Application"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Confirm formal approval for application{" "}
            <strong className="text-white font-mono">{selectedApp?.applicationNumber}</strong> (
            {selectedApp?.applicantName}).
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-slate-200">
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Status will be updated to APPROVED
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Administrative audit event (APPLICATION_APPROVED) will be recorded
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={actionLoading}
              onClick={handleApprove}
            >
              Confirm Approval
            </Button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Record Application"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Please enter a formal rejection justification reason:
          </p>

          <Textarea
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Inconclusive proof of achievement..."
            rows={3}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={actionLoading}
              disabled={!rejectionReason.trim()}
              onClick={handleReject}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
