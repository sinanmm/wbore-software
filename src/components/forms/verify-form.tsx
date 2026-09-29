"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ShieldCheck, ShieldAlert, Award, Calendar, MapPin, User, Download, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { formatDate } from "@/lib/utils";

export function VerifyForm() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("recordId") || searchParams.get("id") || "";

  const [query, setQuery] = useState(initialId);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);

  const performVerification = async (searchId: string) => {
    if (!searchId.trim()) return;
    setIsLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/verification?recordId=${encodeURIComponent(searchId.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        isValid: false,
        message: "Failed to communicate with verification registry. Please check your network.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      performVerification(initialId);
    }
  }, [initialId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(query);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Search Box */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            Official Registry Check
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-serif">
            Verify World Record Certificate
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Enter the unique Record ID (e.g.{" "}
            <span className="text-amber-400 font-mono">WBRE-TEC-2026-000101</span>) or Certificate
            Number to confirm official status.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. WBRE-TEC-2026-000101"
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-700 bg-slate-950/80 text-sm text-white placeholder:text-slate-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              required
            />
          </div>
          <Button
            type="submit"
            variant="gold"
            isLoading={isLoading}
            className="h-11 px-6 font-semibold"
          >
            Verify Record
          </Button>
        </form>
      </div>

      {/* Verification Result */}
      {searched && result && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
          {result.isValid && result.certificate ? (
            <div className="space-y-8">
              {/* Authenticity Certificate Card */}
              <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-300 tracking-wide uppercase">
                        VERIFIED & AUTHENTIC
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-mono">
                        Active in Registry
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white font-serif mt-1">
                      {result.certificate.achievementTitle}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Awarded to{" "}
                      <strong className="text-slate-200">{result.certificate.recipientName}</strong>{" "}
                      under {result.certificate.category}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={`/api/certificates/${encodeURIComponent(
                      result.certificate.certificateNumber || result.certificate.recordId
                    )}/download`}
                    download
                  >
                    <Button variant="gold" size="md">
                      <Download className="h-4 w-4 mr-1.5" />
                      Download Certificate PDF
                    </Button>
                  </a>
                </div>
              </div>

              {/* Detailed Breakdown Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Record ID
                  </p>
                  <p className="text-sm font-mono font-bold text-amber-400 mt-1">
                    {result.certificate.recordId}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Certificate No.
                  </p>
                  <p className="text-sm font-mono font-bold text-slate-200 mt-1">
                    {result.certificate.certificateNumber}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Location
                  </p>
                  <p className="text-sm font-semibold text-slate-200 mt-1">
                    {result.certificate.place}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Issue Date
                  </p>
                  <p className="text-sm font-semibold text-slate-200 mt-1">
                    {formatDate(result.certificate.issueDate)}
                  </p>
                </div>
              </div>

              {/* Certificate Preview Engine Display */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-wide uppercase">
                    Official Certificate Preview
                  </h3>
                  <span className="text-xs text-slate-400">A4 High-Resolution Render</span>
                </div>

                <CertificatePreview
                  data={{
                    id: result.certificate.id,
                    recipientName: result.certificate.recipientName,
                    category: result.certificate.category,
                    achievementTitle: result.certificate.achievementTitle,
                    place: result.certificate.place,
                    recordId: result.certificate.recordId,
                    certificateNumber: result.certificate.certificateNumber,
                    dateOfRecognition: formatDate(result.certificate.issueDate),
                    pdfUrl: result.certificate.pdfUrl,
                    qrCodeUrl: result.certificate.qrCodeUrl,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-500/40 text-center space-y-4">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Record Verification Failed</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">{result.message}</p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setSearched(false);
                  }}
                >
                  Search Again
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
