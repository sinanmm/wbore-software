"use client";

import React, { useState, useEffect } from "react";
import { User, Shield, Bell } from "lucide-react";

export function AdminHeader({ title }: { title: string }) {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="h-4 w-4" />
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-white leading-tight">
              {currentUser?.name || "Administrator"}
            </p>
            <p className="text-[10px] text-amber-400/90 font-mono">
              {currentUser?.role || "SUPER_ADMIN"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
