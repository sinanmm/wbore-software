"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

interface ApplicationItem {
  id: string;
  applicationNumber: string;
  applicantName: string;
  applicantEmail: string;
  category: string;
  achievementTitle: string;
  place: string;
  status: string;
  createdAt: string;
  evidenceFiles?: Array<{ id: string; fileType: string; fileUrl?: string; originalName?: string }>;
  certificate?: { id: string; recordId: string; certificateNumber: string } | null;
}

export function ApplicationsTableView({ applications }: { applications: ApplicationItem[] }) {
  const router = useRouter();
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  return (
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
                <th className="px-5 py-4">Application ID</th>
                <th className="px-5 py-4">Applicant Name</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Application ID */}
                  <td className="px-5 py-3.5 font-mono font-bold text-amber-400">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      {app.applicationNumber}
                    </Link>
                  </td>

                  {/* Applicant Name */}
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-white">{app.applicantName}</p>
                    <p className="text-[11px] text-slate-400 font-normal">{app.applicantEmail}</p>
                  </td>

                  {/* Category */}
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 text-[11px] font-medium border border-slate-700/60 inline-block">
                      {app.category}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                    {formatDate(app.createdAt)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Details */}
                      <Link href={`/admin/applications/${app.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] font-semibold px-2.5 border-slate-700 hover:border-amber-500/50"
                          title="View Application Details"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          View Details
                        </Button>
                      </Link>

                      {/* Download Evidence */}
                      <Link href={`/admin/applications/${app.id}#evidence`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] font-medium px-2.5 border-slate-700 text-slate-300 hover:text-white"
                          title="View / Download Evidence Files"
                        >
                          <Download className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          Evidence
                        </Button>
                      </Link>

                      {/* Quick Approve / Reject if not yet finalized */}
                      {app.status !== "APPROVED" && app.status !== "CERTIFICATE_GENERATED" && (
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setIsApproveOpen(true);
                          }}
                          className="h-8 text-[11px] font-bold px-2.5 shadow-gold"
                          title="Approve and Issue Certificate"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                      )}

                      {app.status !== "REJECTED" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setRejectionReason("");
                            setIsRejectOpen(true);
                          }}
                          className="h-8 text-[11px] font-semibold px-2.5"
                          title="Reject Application"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Confirm Record Approval & Certificate Generation"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Automated Certificate Issuance
            </p>
            <p>
              Approving application <strong>{selectedApp?.applicationNumber}</strong> for candidate{" "}
              <strong>{selectedApp?.applicantName}</strong> will immediately:
            </p>
            <ul className="list-disc pl-5 pt-1 space-y-0.5 text-slate-300 text-[11px]">
              <li>Generate a sequential Record ID (e.g. WBRE-CAT-YEAR-XXXXXX)</li>
              <li>Render the official A4 Certificate PDF with QR verification</li>
              <li>Publish the record to the public verification registry</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleApprove}
              isLoading={actionLoading}
              className="font-bold"
            >
              Confirm & Issue Certificate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Candidate Application"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Rejection Reason Required
            </p>
            <p className="text-slate-300 text-[11px] mt-1">
              Please enter the official justification for rejection. This will be recorded in the
              audit logs and archived with the application record.
            </p>
          </div>

          <Textarea
            label="Formal Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Insufficient primary telemetry logs; video evidence failed independent validation criteria."
            rows={4}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              isLoading={actionLoading}
              disabled={!rejectionReason.trim()}
              className="font-bold"
            >
              Reject Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
