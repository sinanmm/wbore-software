"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  User,
  MapPin,
  Clock,
  ArrowLeft,
  FileText,
  AlertTriangle,
  History,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

export interface CertificateDetailsProps {
  certificate: {
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
    pdfUrl?: string | null;
    verificationUrl?: string | null;
    applicationId: string;
    application?: {
      id: string;
      applicationNumber: string;
      applicantName: string;
      applicantEmail?: string;
      applicantPhone?: string;
      country?: string;
      status: string;
      createdAt: string | Date;
    } | null;
    auditLogs?: Array<{
      id: string;
      action: string;
      details?: string | null;
      createdAt: string | Date;
      user?: {
        id: string;
        name?: string | null;
        email?: string | null;
        role?: string | null;
      } | null;
    }>;
  };
  currentUserRole?: string;
}

export function CertificateDetailsView({
  certificate,
  currentUserRole,
}: CertificateDetailsProps) {
  const router = useRouter();

  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revocationReason, setRevocationReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const isRevoked = certificate.verificationStatus === "REVOKED";

  // Parse revocation details from audit logs if available
  const revocationAudit = certificate.auditLogs?.find(
    (log) => log.action === "CERTIFICATE_REVOKED"
  );

  let parsedRevocationReason: string | null = null;
  let revokingAdminName: string | null = null;
  let revocationDate: string | Date | null = null;

  if (revocationAudit) {
    revokingAdminName =
      revocationAudit.user?.name || revocationAudit.user?.email || "WBRE Administrator";
    revocationDate = revocationAudit.createdAt;

    if (revocationAudit.details) {
      try {
        const parsed = JSON.parse(revocationAudit.details);
        parsedRevocationReason = parsed.reason || revocationAudit.details;
      } catch {
        parsedRevocationReason = revocationAudit.details;
      }
    }
  }

  const handleConfirmRevoke = async () => {
    const cleanReason = revocationReason.trim();
    if (!cleanReason) {
      setErrorMessage("Revocation reason is mandatory and cannot be empty or whitespace only.");
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(certificate.id)}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cleanReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke certificate");
      }

      setIsRevokeModalOpen(false);
      setSuccessNotice("Certificate has been successfully revoked.");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while revoking the certificate.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button and breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/certificates"
          className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Certificate Registry
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white tracking-tight font-serif">
              {certificate.certificateNumber}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                !isRevoked
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  !isRevoked ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              {certificate.verificationStatus}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Record ID: <span className="text-amber-400 font-bold">{certificate.recordId}</span>
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download certificate */}
          <a
            href={`/api/certificates/${encodeURIComponent(certificate.id)}/download`}
            download
          >
            <Button
              variant="gold"
              size="sm"
              className="h-9 text-xs font-semibold"
              title={isRevoked ? "Download historical PDF record" : "Download PDF"}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download PDF
            </Button>
          </a>

          {/* Open Public Verification */}
          <Link
            href={`/verify/${encodeURIComponent(certificate.recordId)}`}
            target="_blank"
          >
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs border-slate-700 text-slate-200"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Public Verification
            </Button>
          </Link>

          {/* Revoke button (Only active when NOT revoked) */}
          {!isRevoked ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setRevocationReason("");
                setErrorMessage(null);
                setIsRevokeModalOpen(true);
              }}
              className="h-9 text-xs font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Revoke Certificate
            </Button>
          ) : (
            <div className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Revocation Finalized
            </div>
          )}
        </div>
      </div>

      {/* Success Notification */}
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

      {/* Revoked Status Banner */}
      {isRevoked && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
            <ShieldAlert className="h-5 w-5" />
            <span>REVOKED CERTIFICATE</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            This credential was formally revoked and is permanently invalid. Public verification
            requests for this Record ID will show <span className="font-bold text-rose-400">CERTIFICATE REVOKED</span> and public PDF downloads return HTTP 410 Gone. The original document record is preserved for administrative audit compliance.
          </p>
          {parsedRevocationReason && (
            <div className="rounded-xl border border-rose-500/20 bg-slate-900/80 p-3.5 mt-2">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                Formal Reason for Revocation:
              </span>
              <p className="text-xs text-slate-200 italic">&ldquo;{parsedRevocationReason}&rdquo;</p>
              {revokingAdminName && revocationDate && (
                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                  Recorded by {revokingAdminName} on {formatDate(revocationDate)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Details & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Official Certificate Data & Application Linkage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Certificate Specifications Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" />
                Official Credential Data
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Generated: {formatDate(certificate.generatedAt)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">Record ID</span>
                <p className="font-mono font-bold text-amber-400 text-sm">{certificate.recordId}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">Certificate Number</span>
                <p className="font-mono font-bold text-slate-200 text-sm">
                  {certificate.certificateNumber}
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-400">Recipient Name</span>
                <p className="font-bold text-white text-base">{certificate.recipientName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">Category</span>
                <p className="text-slate-200 font-medium">{certificate.category}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">Place of Recognition</span>
                <p className="text-slate-200">{certificate.place || "London, United Kingdom"}</p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-400">Achievement Title</span>
                <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {certificate.achievementTitle}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">Issue Date</span>
                <p className="text-slate-200 font-mono">{formatDate(certificate.issueDate)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">Verification Status</span>
                <p
                  className={`font-mono font-bold ${
                    !isRevoked ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {certificate.verificationStatus}
                </p>
              </div>
            </div>
          </div>

          {/* Originating Application Relationship Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                Originating Application
              </h3>
              {certificate.application && (
                <Link href={`/admin/applications/${certificate.applicationId}`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-slate-700">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Application
                  </Button>
                </Link>
              )}
            </div>

            {certificate.application ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Application Number</span>
                  <p className="font-mono font-bold text-white">
                    {certificate.application.applicationNumber}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Application Status</span>
                  <p className="font-mono text-slate-200">{certificate.application.status}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Country</span>
                  <p className="text-slate-200">{certificate.application.country || "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Submitted At</span>
                  <p className="text-slate-400 font-mono">
                    {formatDate(certificate.application.createdAt)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Application reference ID: {certificate.applicationId}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Lifecycle Audit Timeline & Public Verification Info */}
        <div className="space-y-6">
          {/* Audit History Timeline */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
              <History className="h-4 w-4 text-amber-400" />
              Certificate Lifecycle History
            </h3>

            {(!certificate.auditLogs || certificate.auditLogs.length === 0) ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                No specific lifecycle audit events recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {certificate.auditLogs.map((log) => {
                  let reasonText: string | null = null;
                  if (log.details) {
                    try {
                      const parsed = JSON.parse(log.details);
                      reasonText = parsed.reason || log.details;
                    } catch {
                      reasonText = log.details;
                    }
                  }

                  const isRevokeLog = log.action === "CERTIFICATE_REVOKED";

                  return (
                    <div
                      key={log.id}
                      className={`relative pl-5 pb-4 border-l-2 ${
                        isRevokeLog ? "border-rose-500/60" : "border-emerald-500/60"
                      } last:pb-0`}
                    >
                      <span
                        className={`absolute -left-[7px] top-0 h-3 w-3 rounded-full ${
                          isRevokeLog ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                      />
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-mono font-bold ${
                              isRevokeLog ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            {log.action === "CERTIFICATE_GENERATED"
                              ? "Certificate Generated"
                              : log.action === "CERTIFICATE_REVOKED"
                              ? "Certificate Revoked"
                              : log.action}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatDate(log.createdAt)}
                        </p>
                        <p className="text-slate-300 text-[11px]">
                          Actor:{" "}
                          <span className="font-semibold text-white">
                            {log.user?.name || log.user?.email || "System Administrator"}
                          </span>{" "}
                          {log.user?.role && (
                            <span className="text-[10px] text-slate-400">({log.user.role})</span>
                          )}
                        </p>
                        {reasonText && (
                          <div className="mt-1.5 p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                            <span className="text-slate-500 font-semibold block text-[10px]">
                              Details / Reason:
                            </span>
                            <span className="italic">{reasonText}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Verification Portal Info Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Verification Endpoint
            </h3>
            <p className="text-[11px] text-slate-400">
              The public verification portal checks the cryptographic database status without exposing private applicant details.
            </p>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 font-mono text-[11px] text-amber-300 break-all">
              /verify/{certificate.recordId}
            </div>
            <Link
              href={`/verify/${encodeURIComponent(certificate.recordId)}`}
              target="_blank"
              className="inline-block w-full"
            >
              <Button variant="outline" size="sm" className="w-full text-xs border-slate-700">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Test Public Verification
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Revocation Confirmation Modal */}
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
                <p className="font-mono font-bold text-amber-400">{certificate.recordId}</p>
              </div>
              <div>
                <span className="text-slate-400">Certificate No:</span>
                <p className="font-mono text-slate-200">{certificate.certificateNumber}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Recipient:</span>
                <p className="font-bold text-white">{certificate.recipientName}</p>
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
    </div>
  );
}
