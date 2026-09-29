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
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { EvidenceViewer } from "@/components/admin/evidence-viewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { formatDate, formatDateTime } from "@/lib/utils";

export function ApplicationReviewView({ initialApplication }: { initialApplication: any }) {
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

  const [rejectionReason, setRejectionReason] = useState("");
  const [requestedInfo, setRequestedInfo] = useState("");

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

  const handleStatusChange = async (
    status: string,
    extra: { rejectionReason?: string; requestedInfo?: string } = {}
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/status`, {
        method: "POST",
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

      if (status === "APPROVED" || status === "CERTIFICATE_GENERATED") {
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

            <EvidenceViewer files={application.evidenceFiles || []} />
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
              {/* Approve Certificate Button */}
              <Button
                variant="gold"
                size="md"
                onClick={() => setIsApproveModalOpen(true)}
                disabled={actionLoading || application.status === "CERTIFICATE_GENERATED"}
                className="w-full font-bold shadow-gold justify-start"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {application.status === "CERTIFICATE_GENERATED"
                  ? "Certificate Issued"
                  : "Approve Certificate"}
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
                disabled={actionLoading || application.status === "REJECTED"}
                className="w-full justify-start"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Application
              </Button>
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
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Record & Generate Certificate"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Approving this application will execute the automated certificate issuance engine:
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <p className="flex items-center gap-2 text-slate-200 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              1. Generate unique Record ID (e.g. WBRE-TEC-2026-000101)
            </p>
            <p className="flex items-center gap-2 text-slate-200 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              2. Generate Certificate Number (e.g. WBRE-CERT-2026-000101)
            </p>
            <p className="flex items-center gap-2 text-slate-200 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              3. Produce high-resolution A4 portrait Certificate PDF with vector overlay
            </p>
            <p className="flex items-center gap-2 text-slate-200 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              4. Register certificate in public verification registry
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsApproveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={actionLoading}
              onClick={() => handleStatusChange("APPROVED")}
            >
              Confirm & Generate
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
    </div>
  );
}
