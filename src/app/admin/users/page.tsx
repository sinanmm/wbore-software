import React from "react";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { Users, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  let users: any[] = [];

  try {
    users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("Fetch users error:", err);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
            Adjudicator & Admin Users ({users.length})
          </h2>
          <p className="text-xs text-slate-400">
            Manage authenticated adjudicators, reviewers, and system administrators.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Users className="h-8 w-8 mx-auto text-slate-600" />
            <p>No admin users found. Run database seed to initialize.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Assigned Role</th>
                  <th className="px-5 py-4">Created Date</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs">
                        {u.name.charAt(0)}
                      </div>
                      {u.name}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-mono font-semibold">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
