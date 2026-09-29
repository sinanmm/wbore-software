"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { Download, CheckCircle, ExternalLink, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CertificatePreviewData {
  id?: string;
  recipientName: string;
  category: string;
  achievementTitle: string;
  place: string;
  recordId: string;
  certificateNumber: string;
  dateOfRecognition: string;
  pdfUrl?: string;
  qrCodeUrl?: string | null;
  verificationUrl?: string | null;
}

export function CertificatePreview({
  data,
  showActions = true,
}: {
  data: CertificatePreviewData;
  showActions?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const downloadUrl = `/api/certificates/${encodeURIComponent(
    data.certificateNumber || data.recordId || data.id || ""
  )}/download`;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Quick Actions */}
      {showActions && (
        <div className="w-full flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  OFFICIAL WBRE RECOGNITION
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
                  {data.recordId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authentic World Book of Record Excellence Certificate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print
            </Button>
            <a href={downloadUrl} download>
              <Button variant="gold" size="sm" className="text-xs font-semibold">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download PDF
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Certificate Frame with exact A4 Portrait Aspect Ratio (1055 x 1491) */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[1055/1491] rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-600/40 bg-[#FCF9F2] text-slate-900 select-none group"
      >
        {/* Background Image: Official Template */}
        <Image
          src="/templates/certificate-template.png"
          alt="Certificate Template"
          fill
          priority
          className="object-cover pointer-events-none"
        />

        {/* Dynamic Overlay Layer - Accurately positioned using % coordinates derived from 1055 x 1491 */}
        {/* Recipient Name: y = 742 / 1491 = 49.76% */}
        <div
          className="absolute left-0 right-0 text-center px-8 z-10"
          style={{ top: "48.2%", height: "4.2%" }}
        >
          {/* Subtle parchment tint backdrop to erase background placeholder cleanly */}
          <div className="absolute inset-0 mx-auto max-w-[68%] bg-[#FCF9F2]/95 -z-10 rounded-md shadow-sm" />
          <h2
            className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0D1B3E] tracking-wider uppercase font-serif drop-shadow-sm flex items-center justify-center h-full"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            {data.recipientName}
          </h2>
        </div>

        {/* Values Column aligned to the right of template labels (x = 440 / 1055 = 41.7%) */}
        {/* Category: y = 918 / 1491 = 61.57% */}
        <div
          className="absolute font-sans font-bold text-[#1A2538] text-[9px] sm:text-xs md:text-sm lg:text-base truncate max-w-[42%] z-10"
          style={{ top: "61.3%", left: "41.8%" }}
        >
          : &nbsp; {data.category.toUpperCase()}
        </div>

        {/* Achievement Title: y = 964 / 1491 = 64.65% */}
        <div
          className="absolute font-sans font-bold text-[#1A2538] text-[9px] sm:text-xs md:text-sm lg:text-base truncate max-w-[42%] z-10"
          style={{ top: "64.4%", left: "41.8%" }}
        >
          : &nbsp; {data.achievementTitle.toUpperCase()}
        </div>

        {/* Place: y = 1010 / 1491 = 67.74% */}
        <div
          className="absolute font-sans font-bold text-[#1A2538] text-[9px] sm:text-xs md:text-sm lg:text-base truncate max-w-[42%] z-10"
          style={{ top: "67.5%", left: "41.8%" }}
        >
          : &nbsp; {data.place.toUpperCase()}
        </div>

        {/* Record ID: y = 1056 / 1491 = 70.82% */}
        <div
          className="absolute font-sans font-bold text-[#1A2538] text-[9px] sm:text-xs md:text-sm lg:text-base font-mono z-10"
          style={{ top: "70.6%", left: "41.8%" }}
        >
          : &nbsp; {data.recordId}
        </div>

        {/* Certificate Number: y = 1102 / 1491 = 73.91% */}
        <div
          className="absolute font-sans font-bold text-[#1A2538] text-[9px] sm:text-xs md:text-sm lg:text-base font-mono z-10"
          style={{ top: "73.7%", left: "41.8%" }}
        >
          : &nbsp; {data.certificateNumber}
        </div>

        {/* Date of Recognition: y = 1148 / 1491 = 77.00% */}
        <div
          className="absolute font-sans font-bold text-[#1A2538] text-[9px] sm:text-xs md:text-sm lg:text-base z-10"
          style={{ top: "76.8%", left: "41.8%" }}
        >
          : &nbsp; {data.dateOfRecognition.toUpperCase()}
        </div>

        {/* QR Code in Seal Area (x = 825 / 1055 = 78.2%, y = 1300 / 1491 = 87.2%) */}
        {data.qrCodeUrl && (
          <div
            className="absolute z-10 flex flex-col items-center bg-white/90 p-1.5 rounded-lg border border-amber-300 shadow-md backdrop-blur-xs"
            style={{ bottom: "5.5%", right: "8.5%", width: "12%", height: "10%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.qrCodeUrl}
              alt="Scan to Verify"
              className="w-full h-full object-contain"
            />
            <span className="text-[6px] sm:text-[7px] font-bold text-slate-800 tracking-tighter uppercase mt-0.5">
              Scan to Verify
            </span>
          </div>
        )}
      </div>

      {/* Bottom Info Card */}
      <div className="w-full p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
        <p className="text-xs text-slate-400">
          This digital certificate is cryptographically backed by the World Book of Record
          Excellence registry. To verify authenticity online, visit{" "}
          <span className="text-amber-400 font-mono">/verify</span> and enter Record ID{" "}
          <span className="font-semibold text-white">{data.recordId}</span>.
        </p>
      </div>
    </div>
  );
}
