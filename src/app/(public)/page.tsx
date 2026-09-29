import React from "react";
import Link from "next/link";
import { Award, ShieldCheck, FileCheck2, ArrowRight, CheckCircle2, Globe, Cpu, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider shadow-gold">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          The Global Adjudication & Certification Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-serif leading-tight">
          WORLD BOOK OF RECORD <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            EXCELLENCE
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Celebrating monumental milestones, exceptional innovations, and human triumph. Submit
          record proposals, track adjudications, and access tamper-proof digital certificates.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/apply">
            <Button variant="gold" size="lg" className="w-full sm:w-auto px-8 font-bold text-sm">
              <FileCheck2 className="h-4 w-4 mr-2" />
              Apply for Recognition
            </Button>
          </Link>

          <Link href="/verify">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 text-sm">
              <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" />
              Verify Certificate
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Card 1 */}
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-amber-500/40 transition-all group shadow-xl">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform shadow-gold">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-serif">1. Submit Application</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
            Provide applicant credentials, achievement narrative, category parameters, and attach
            evidence documentation including photos, witness affidavits, and high-definition video.
          </p>
          <Link
            href="/apply"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            Start Proposal <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card 2 */}
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-amber-500/40 transition-all group shadow-xl">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
            <Cpu className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-serif">
            2. Review & Auto-Generate
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
            Adjudicators evaluate supporting proofs in the secure 3-column review portal. Upon
            approval, unique Record IDs (e.g. WBRE-TEC-2026-000101) and A4 certificates generate
            instantly.
          </p>
          <Link
            href="/admin/dashboard"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Admin Software <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card 3 */}
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-emerald-500/40 transition-all group shadow-xl">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-serif">3. Verify & Download</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
            Public verification portal provides instant cryptographic validation. Anyone can enter
            a Record ID or scan the embedded certificate QR code to inspect authenticity and
            download the PDF.
          </p>
          <Link
            href="/verify"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            Verify a Record <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Trust & Adjudication Standard Banner */}
      <div className="max-w-5xl mx-auto p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-amber-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              OFFICIAL CERTIFICATE GENERATION ENGINE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-serif">
            Precision Coordinates & High-Resolution Vector Output
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Engineered with strict coordinate overlay matching the official gold-embossed
            certificate template. Preserves micro-typography, official seals, and adjudicator
            signatures.
          </p>
        </div>

        <div className="flex-shrink-0">
          <Link href="/verify?recordId=WBRE-TEC-2026-000101">
            <Button variant="gold" size="md">
              View Sample Record
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
