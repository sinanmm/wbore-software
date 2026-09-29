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

  return (
    <div className="py-6 space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/verify"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Verification Registry</span>
        </Link>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          Official Verified Record
        </div>
      </div>

      <CertificatePreview
        data={{
          id: cert.id,
          recipientName: cert.recipientName,
          category: cert.category,
          achievementTitle: cert.achievementTitle,
          place: cert.place,
          recordId: cert.recordId,
          certificateNumber: cert.certificateNumber,
          dateOfRecognition: formatDate(cert.issueDate),
          pdfUrl: cert.pdfUrl,
          qrCodeUrl: cert.qrCodeUrl,
          verificationUrl: cert.verificationUrl,
        }}
      />
    </div>
  );
}
