import React from "react";
import Link from "next/link";
import { Award, ShieldCheck, FileCheck, ArrowRight, Shield } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#050914] text-slate-100">
      {/* Top Gold Accent Line */}
      <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-500 w-full" />

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-gold font-serif text-xl group-hover:scale-105 transition-transform">
              W
            </div>
            <div>
              <div className="text-base sm:text-lg font-extrabold tracking-wider text-white font-serif flex items-center gap-2">
                <span>WORLD BOOK OF RECORD</span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                EXCELLENCE • OFFICIAL REGISTRY
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/apply"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <FileCheck className="h-4 w-4 text-amber-400" />
              <span>Apply</span>
            </Link>

            <Link
              href="/verify"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Verify</span>
            </Link>

            <Link
              href="/admin/dashboard"
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>Admin Portal</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif font-bold">
              W
            </div>
            <div>
              <p className="font-semibold text-white">World Book of Record Excellence</p>
              <p className="text-slate-400">
                A Global Platform for Extraordinary Human & Institutional Achievement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-300">
            <Link href="/apply" className="hover:text-amber-400 transition-colors">
              Apply for Record
            </Link>
            <Link href="/verify" className="hover:text-amber-400 transition-colors">
              Verify Certificate
            </Link>
            <Link href="/admin/login" className="hover:text-amber-400 transition-colors">
              Adjudicator Login
            </Link>
          </div>

          <p className="text-slate-400">
            © {new Date().getFullYear()} World Book of Record Excellence. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
