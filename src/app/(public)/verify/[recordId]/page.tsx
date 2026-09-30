import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerificationService } from "@/features/verification/verification.service";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Download,
  Calendar,
  MapPin,
  Award,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;
  return {
    title: `Verify ${recordId} | World Book of Record Excellence`,
    description: `Official public verification check for Record ID ${recordId}`,
  };
}

export default async function VerifyRecordPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;
  const decodedId = decodeURIComponent(recordId).trim();

  const result = await VerificationService.verify(decodedId);

  return (
    <div className="py-6 max-w-4xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/verify"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Verification Search</span>
        </Link>

        {result.status === "VALID" ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            VERIFIED
          </div>
        ) : result.status === "REVOKED" ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            <ShieldAlert className="h-3.5 w-3.5" />
            CERTIFICATE REVOKED
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold">
            CERTIFICATE NOT FOUND
          </div>
        )}
      </div>

      {/* Main Verification Card */}
      {result.status === "VALID" && result.certificate ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Official Verification Banner */}
          <div className="p-6 sm:p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-300 tracking-wider uppercase font-mono">
                    VERIFIED
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-mono">
                    Status: {result.certificate.verificationStatus}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white font-serif tracking-tight">
                  {result.certificate.achievementTitle}
                </h1>
                <p className="text-xs text-slate-300">
                  Recipient: <strong className="text-amber-400">{result.certificate.recipientName}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <a
                href={result.certificate.downloadUrl}
                download
                className="w-full md:w-auto"
              >
                <Button variant="gold" size="md" className="w-full font-bold shadow-gold">
                  <Download className="h-4 w-4 mr-1.5" />
                  Download Certificate
                </Button>
              </a>
            </div>
          </div>

          {/* Record Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Recipient Name
              </p>
              <p className="text-sm font-bold text-white mt-1">
                {result.certificate.recipientName}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Category
              </p>
              <p className="text-sm font-semibold text-amber-400 mt-1">
                {result.certificate.category}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Place
              </p>
              <p className="text-sm font-semibold text-slate-200 mt-1">
                {result.certificate.place}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Issue Date
              </p>
              <p className="text-sm font-semibold text-slate-200 mt-1">
                {formatDate(result.certificate.issueDate)}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Record ID
              </p>
              <p className="text-sm font-mono font-bold text-amber-400 mt-1">
                {result.certificate.recordId}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Certificate Number
              </p>
              <p className="text-sm font-mono font-bold text-slate-200 mt-1">
                {result.certificate.certificateNumber}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Achievement
              </p>
              <p className="text-sm font-medium text-slate-200 mt-1">
                {result.certificate.achievementTitle}
              </p>
            </div>
          </div>
        </div>
      ) : result.status === "REVOKED" ? (
        <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-500/40 text-center space-y-4">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <XCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-rose-300 font-serif">CERTIFICATE REVOKED</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            This certificate record ({decodedId}) has been revoked by the World Book of Record
            Excellence registry and is no longer valid.
          </p>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-4">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white font-serif">CERTIFICATE NOT FOUND</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            No matching certificate was found for Record ID &quot;{decodedId}&quot;. Please verify the
            spelling and format.
          </p>
          <div className="pt-2">
            <Link href="/verify">
              <Button variant="outline" size="sm">
                Try Another Search
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
