import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificateService } from "@/features/certificates/certificate.service";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Certificate ${id} | World Book of Record Excellence`,
    description: `Official Certificate of Excellence verification for ${id}`,
  };
}

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cert = await CertificateService.findByRecordOrCertNumber(id);

  if (!cert) {
    notFound();
  }

  const isRevoked = cert.verificationStatus === "REVOKED";

  return (
    <div className="py-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/verify"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Verification Registry</span>
        </Link>

        {isRevoked ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            CERTIFICATE REVOKED
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            VERIFIED
          </div>
        )}
      </div>

      {isRevoked ? (
        <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-500/40 text-center space-y-4">
          <h2 className="text-2xl font-bold text-rose-300 font-serif">CERTIFICATE REVOKED</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            This certificate record ({cert.recordId}) has been revoked by the World Book of Record
            Excellence registry and is no longer valid.
          </p>
        </div>
      ) : (
        <CertificatePreview
          data={{
            id: cert.id,
            recipientName: cert.recipientName,
            category: cert.category || "General",
            achievementTitle: cert.achievementTitle || cert.recordTitle,
            place: cert.place || cert.location,
            recordId: cert.recordId,
            certificateNumber: cert.certificateNumber,
            dateOfRecognition: formatDate(cert.achievementDate || cert.issueDate),
            pdfUrl: cert.pdfUrl,
            qrCodeUrl: cert.qrCodeUrl || undefined,
            verificationUrl: cert.verificationUrl || undefined,
          }}
        />
      )}
    </div>
  );
}
