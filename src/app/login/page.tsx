"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, UserCheck, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("superadmin@wbre.org");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectRolePreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword("admin123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050914] text-slate-100 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-gold font-serif text-3xl">
            W
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-serif">
              WORLD BOOK OF RECORD EXCELLENCE
            </h1>
            <p className="text-xs text-amber-400/90 font-medium uppercase tracking-widest mt-1">
              Internal Admin & Adjudication Console
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-in fade-in duration-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Staff / Official Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="official@wbre.org"
              required
            />

            <Input
              label="Secure Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="gold"
              isLoading={isLoading}
              className="w-full h-11 font-bold text-sm shadow-gold mt-2"
            >
              Authenticate & Enter Console
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Role Fillers for Review & Testing */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Quick Login by Role</span>
              <span className="text-amber-400">Pass: admin123</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectRolePreset("superadmin@wbre.org")}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                  email === "superadmin@wbre.org"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                }`}
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => selectRolePreset("admin@wbre.org")}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                  email === "admin@wbre.org"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => selectRolePreset("verify@wbre.org")}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                  email === "verify@wbre.org"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                }`}
              >
                Verify Officer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
