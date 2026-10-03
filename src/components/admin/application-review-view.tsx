"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Save,
  Download,
  Eye,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { EvidenceViewer } from "@/components/admin/evidence-viewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  getApplicationActions,
  isStage1Lodged,
  isStage2UnderReview,
  isStage3Approved,
  isStage3Rejected,
  isStage4CertificateGenerated,
} from "@/lib/workflow";

export function ApplicationReviewView({
  initialApplication,
  currentUserRole,
}: {
  initialApplication: any;
  currentUserRole?: string;
}) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [internalNotes, setInternalNotes] = useState(application.internalNotes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isGenerateCertModalOpen, setIsGenerateCertModalOpen] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");
  const [requestedInfo, setRequestedInfo] = useState("");

  const actions = getApplicationActions(
    application.status,
    currentUserRole,
    application.certificate
  );

  const isPending = isStage1Lodged(application.status);
  const isUnderReview = isStage2UnderReview(application.status);
  const isApproved = isStage3Approved(application.status);
  const hasCertificate = isStage4CertificateGenerated(
    application.status,
    !!application.certificate
  );
  const isRejected = isStage3Rejected(application.status);
  const isVerificationOfficer =
    currentUserRole === "VERIFICATION_OFFICER" ||
    currentUserRole === "REVIEWER";

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: internalNotes }),
      });
      if (res.ok) {
        alert("Internal notes saved successfully.");
      }
    } catch {
      alert("Failed to save internal notes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setIsGeneratingCert(true);
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate certificate");
      }

      setApplication((prev: any) => ({
        ...prev,
        status: "CERTIFICATE_GENERATED",
        certificate: data.certificate,
      }));
      setIsGenerateCertModalOpen(false);
      setIsCertModalOpen(true);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "An error occurred while generating the certificate.");
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const handleStatusChange = async (
    status: string,
    extra: { rejectionReason?: string; requestedInfo?: string } = {}
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          internalNotes,
          ...extra,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update application status");
      }

      setApplication(data.application);
      setIsApproveModalOpen(false);
      setIsRejectModalOpen(false);
      setIsRequestInfoModalOpen(false);

      if (status === "CERTIFICATE_GENERATED" && data.application?.certificate) {
        setIsCertModalOpen(true);
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Breadcrumb & Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Link href="/admin/applications">
            <Button variant="outline" size="sm" className="h-9">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Applications
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white font-mono tracking-tight">
                {application.applicationNumber}
              </h2>
              <StatusBadge status={application.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Lodged on {formatDateTime(application.createdAt)}
            </p>
          </div>
        </div>

        {/* Adjudication Progress Pipeline */}
        <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2">
          {/* Step 1: Lodged */}
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPending ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span className={isPending ? "text-amber-300 font-bold" : "text-slate-400"}>
              1. Lodged
            </span>
          </div>
          <span className="text-slate-600">→</span>

          {/* Step 2: Under Review */}
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isUnderReview
                  ? "bg-blue-400 animate-pulse"
                  : isApproved || hasCertificate || isRejected
                  ? "bg-emerald-500"
                  : "bg-slate-700"
              }`}
            />
            <span
              className={
                isUnderReview
                  ? "text-blue-300 font-bold"
                  : isApproved || hasCertificate || isRejected
                  ? "text-emerald-400"
                  : "text-slate-500"
              }
            >
              2. Under Review
            </span>
          </div>
          <span className="text-slate-600">→</span>

          {/* Step 3: Approved / Rejected */}
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isRejected
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  : isApproved || hasCertificate
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                  : "bg-slate-700"
              }`}
            />
            <span
              className={
                isRejected
                  ? "text-rose-400 font-bold"
                  : isApproved || hasCertificate
                  ? "text-emerald-300 font-bold"
                  : "text-slate-500"
              }
            >
              3. {isRejected ? "Rejected" : "Approved"}
            </span>
          </div>
          <span className="text-slate-600">→</span>

          {/* Step 4: Certificate Generated */}
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                hasCertificate
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse"
                  : "bg-slate-700"
              }`}
            />
            <span
              className={
                hasCertificate
                  ? "text-amber-300 font-bold"
                  : "text-slate-500"
              }
            >
              4. Certificate Generated
            </span>
          </div>
        </div>

        {application.certificate && (
          <div className="flex items-center gap-2">
            <Button
              variant="gold"
              size="sm"
              onClick={() => setIsCertModalOpen(true)}
              className="font-semibold shadow-gold"
            >
              <Award className="h-4 w-4 mr-1.5" />
              View Issued Certificate
            </Button>
          </div>
        )}
      </div>

      {/* 3-COLUMN ADJUDICATION WORKFLOW LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Applicant Information (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl p-6 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Award className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Applicant & Record Details
              </h3>
            </div>

            {/* Candidate Identity */}
            <div className="space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Candidate Full Name
                </p>
                <p className="text-base font-bold text-white mt-0.5">
                  {application.applicantName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Email Address
                  </p>
                  <p className="text-xs font-mono text-slate-200 mt-0.5 truncate">
                    {application.applicantEmail}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Phone Number
                  </p>
                  <p className="text-xs font-mono text-slate-200 mt-0.5">
                    {application.applicantPhone}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Country & Full Address
                </p>
                <p className="text-xs text-slate-200 mt-0.5">
                  <span className="font-semibold text-amber-400">{application.country}</span> -{" "}
                  {application.address}
                </p>
              </div>
            </div>

            {/* Achievement Proposal */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Category & Place
                </p>
                <p className="text-xs font-medium text-slate-200 mt-0.5">
                  {application.category} •{" "}
                  <span className="text-slate-400">{application.place}</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Achievement Title
                </p>
                <p className="text-sm font-bold text-amber-300 mt-0.5">
                  {application.achievementTitle}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Achievement Narrative & Description
                </p>
                <div className="mt-1 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {application.description}
                </div>
              </div>

              {application.supportingDetails && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Supporting Details / Benchmarks
                  </p>
                  <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">
                    {application.supportingDetails}
                  </p>
                </div>
              )}
            </div>

            {/* If Rejected or Info Requested */}
            {application.rejectionReason && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300">
                <strong>Rejection Reason:</strong> {application.rejectionReason}
              </div>
            )}
            {application.requestedInfo && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300">
                <strong>Requested Information:</strong> {application.requestedInfo}
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: Evidence Viewer (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl p-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
              <FileText className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Evidence Dossier & Proofs
              </h3>
            </div>

            <EvidenceViewer
              files={application.evidenceFiles || []}
              applicationId={application.id}
              currentUserRole={currentUserRole}
              onEvidenceChange={async () => {
                try {
                  const res = await fetch(`/api/applications/${application.id}`);
                  if (res.ok) {
                    const refreshed = await res.json();
                    setApplication(refreshed);
                  }
                } catch {
                  router.refresh();
                }
              }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Approval Actions & Internal Notes (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Action Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Adjudication Actions
              </h3>
            </div>

            <div className="space-y-3">
              {/* STAGE 1: START REVIEW (Allowed for SUPER_ADMIN, ADMIN, VERIFICATION_OFFICER, REVIEWER) */}
              {actions.canStartReview && (
                <Button
                  variant="gold"
                  size="md"
                  onClick={() => handleStatusChange("UNDER_REVIEW")}
                  isLoading={actionLoading}
                  disabled={actionLoading}
                  className="w-full font-bold shadow-gold justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Start Review
                </Button>
              )}

              {/* If UNDER_REVIEW: Show Adjudication Options based on Role */}
              {isUnderReview && (
                <>
                  {isVerificationOfficer ? (
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                        Adjudication Restricted
                      </p>
                      <p>
                        Verification Officer can review evidence but cannot approve or reject applications.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Approve Button */}
                      <Button
                        variant="gold"
                        size="md"
                        onClick={() => setIsApproveModalOpen(true)}
                        disabled={actionLoading}
                        className="w-full font-bold shadow-gold justify-start"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve Application
                      </Button>

                      {/* Request More Information Button */}
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setIsRequestInfoModalOpen(true)}
                        disabled={actionLoading}
                        className="w-full justify-start text-amber-300 hover:text-amber-200"
                      >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Request More Information
                      </Button>

                      {/* Reject Application Button */}
                      <Button
                        variant="destructive"
                        size="md"
                        onClick={() => setIsRejectModalOpen(true)}
                        disabled={actionLoading}
                        className="w-full justify-start"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Application
                      </Button>
                    </>
                  )}
                </>
              )}

              {/* If APPROVED: Display Status Notice & Action to Generate Certificate */}
              {isApproved && !hasCertificate && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Application Approved
                    </p>
                    <p className="text-[11px] text-slate-300">
                      This application has been formally approved. Official certificate can now be generated.
                    </p>
                  </div>

                  {!isVerificationOfficer ? (
                    <Button
                      variant="gold"
                      size="md"
                      onClick={() => setIsGenerateCertModalOpen(true)}
                      disabled={isGeneratingCert || actionLoading}
                      className="w-full font-bold shadow-gold justify-start"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Generate Certificate
                    </Button>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                        Privilege Notice
                      </p>
                      <p>
                        Generating official WBRE certificates requires Administrator or Super Administrator privileges.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* If REJECTED: Display Status Notice */}
              {isRejected && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-400">
                    <XCircle className="h-4 w-4" />
                    Application Rejected
                  </p>
                  <p className="text-[11px] text-slate-300">
                    <strong>Reason:</strong> {application.rejectionReason || "No formal reason recorded."}
                  </p>
                </div>
              )}

              {/* If CERTIFICATE_GENERATED: Display Certificate Summary & Actions */}
              {hasCertificate && application.certificate && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      Certificate Generated
                    </p>
                    <div className="pt-1 font-mono text-xs space-y-0.5">
                      <p className="text-slate-300">
                        Record ID: <strong className="text-amber-400">{application.certificate.recordId}</strong>
                      </p>
                      <p className="text-slate-300">
                        Certificate Number: <strong className="text-slate-100">{application.certificate.certificateNumber}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCertModalOpen(true)}
                      className="w-full justify-start text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 mr-2" />
                      View Certificate
                    </Button>
                    <a
                      href={`/api/verification/${encodeURIComponent(application.certificate.recordId)}/certificate`}
                      download
                      className="w-full"
                    >
                      <Button
                        variant="gold"
                        size="sm"
                        className="w-full justify-start text-xs font-semibold"
                      >
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Download Certificate
                      </Button>
                    </a>
                    <Link
                      href={`/verify/${encodeURIComponent(application.certificate.recordId)}`}
                      target="_blank"
                      className="w-full"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs text-amber-300 hover:text-amber-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                        Open Verification
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* UNKNOWN / ATTENTION REQUIRED STATUS */}
              {actions.isUnknownStatus && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    Workflow Attention Required
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Workflow status requires administrator attention.
                  </p>
                  <div className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-amber-200">
                    Status: <strong className="text-white">{application.status || "UNKNOWN"}</strong>
                  </div>
                  {actions.canStartReview && (
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleStatusChange("UNDER_REVIEW")}
                      isLoading={actionLoading}
                      disabled={actionLoading}
                      className="w-full font-bold shadow-gold justify-start mt-2"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Start Review
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Internal Notes Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Internal Review Notes
              </h4>
              <span className="text-[10px] text-slate-500">Confidential</span>
            </div>

            <Textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Record adjudicator comments, background check findings, or deliberations..."
              rows={4}
              className="text-xs"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveNotes}
              isLoading={isSavingNotes}
              className="w-full text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Internal Notes
            </Button>
          </div>
        </div>
      </div>

      {/* APPROVE CONFIRMATION MODAL */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => !actionLoading && setIsApproveModalOpen(false)}
        title="Approve Application?"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Applicant Name:</span>
              <p className="text-sm font-bold text-white mt-0.5">{application.applicantName}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Achievement Title:</span>
              <p className="text-xs font-medium text-amber-300 mt-0.5">{application.achievementTitle || application.proposedTitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Category:</span>
                <p className="text-xs font-medium text-slate-200 mt-0.5">{application.category || application.categoryName}</p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Country:</span>
                <p className="text-xs font-medium text-slate-200 mt-0.5">{application.country || "—"}</p>
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Evidence Count:</span>
              <p className="text-xs font-medium text-slate-200 mt-0.5">
                {(application.evidenceFiles || application.evidences || []).length} file(s) in evidence dossier
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-slate-300 space-y-1">
            <p className="font-semibold text-emerald-300">
              This action will mark the application as APPROVED.
            </p>
            <p className="text-[11px] text-slate-400">
              Certificate generation will be the next workflow stage.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              disabled={actionLoading}
              onClick={() => setIsApproveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={actionLoading}
              disabled={actionLoading}
              onClick={() => handleStatusChange("APPROVED")}
            >
              Approve Application
            </Button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Record Application"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Please enter the formal rejection reason. This will be stored in the adjudication audit
            log.
          </p>

          <Textarea
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Evidence does not meet primary adjudicator standards..."
            rows={3}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={actionLoading}
              disabled={!rejectionReason.trim()}
              onClick={() =>
                handleStatusChange("REJECTED", { rejectionReason })
              }
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* REQUEST INFO MODAL */}
      <Modal
        isOpen={isRequestInfoModalOpen}
        onClose={() => setIsRequestInfoModalOpen(false)}
        title="Request Additional Information"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Specify what additional evidence or clarification the applicant needs to provide:
          </p>

          <Textarea
            label="Requested Information"
            value={requestedInfo}
            onChange={(e) => setRequestedInfo(e.target.value)}
            placeholder="e.g. Please provide calibrated surveyor certificates and continuous video logs..."
            rows={3}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRequestInfoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={actionLoading}
              disabled={!requestedInfo.trim()}
              onClick={() =>
                handleStatusChange("UNDER_REVIEW", { requestedInfo })
              }
            >
              Submit Information Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* CERTIFICATE VIEWER MODAL */}
      {application.certificate && (
        <Modal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          title={`Certificate: ${application.certificate.certificateNumber}`}
          maxWidth="4xl"
        >
          <div className="py-2">
            <CertificatePreview
              data={{
                id: application.certificate.id,
                recipientName: application.certificate.recipientName,
                category: application.certificate.category,
                achievementTitle: application.certificate.achievementTitle,
                place: application.certificate.place,
                recordId: application.certificate.recordId,
                certificateNumber: application.certificate.certificateNumber,
                dateOfRecognition: formatDate(application.certificate.issueDate),
                pdfUrl: application.certificate.pdfUrl,
                qrCodeUrl: application.certificate.qrCodeUrl,
              }}
            />
          </div>
        </Modal>
      )}

      {/* GENERATE CERTIFICATE CONFIRMATION MODAL */}
      <Modal
        isOpen={isGenerateCertModalOpen}
        onClose={() => !isGeneratingCert && setIsGenerateCertModalOpen(false)}
        title="Generate official WBRE certificate?"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Applicant:</span>
              <p className="text-sm font-bold text-white mt-0.5">{application.applicantName}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Achievement:</span>
              <p className="text-xs font-medium text-amber-300 mt-0.5">{application.achievementTitle}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Category:</span>
              <p className="text-xs text-slate-200 mt-0.5">{application.category}</p>
            </div>
          </div>

          <p className="text-slate-300">
            The certificate will receive a permanent Record ID.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              disabled={isGeneratingCert}
              onClick={() => setIsGenerateCertModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={isGeneratingCert}
              onClick={handleGenerateCertificate}
            >
              Generate Certificate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
