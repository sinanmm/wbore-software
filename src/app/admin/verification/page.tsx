import React from "react";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { ShieldCheck, Search, Activity, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminVerificationAuditPage() {
  let verificationLogs: any[] = [];

  try {
    verificationLogs = await db.auditLog.findMany({
      where: {
        action: "CERTIFICATE_VERIFIED",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("Verification audit fetch error:", err);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
            Verification Integrity & Audit Log
          </h2>
          <p className="text-xs text-slate-400">
            Audit history of public and adjudicator verification lookups across the globe.
          </p>
        </div>

        <Link href="/verify" target="_blank">
          <Button variant="gold" size="sm" className="font-semibold">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Open Public Verification
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
        {verificationLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <ShieldCheck className="h-8 w-8 mx-auto text-slate-600" />
            <p>No verification queries recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Record Identifier</th>
                  <th className="px-5 py-4">Related Entity</th>
                  <th className="px-5 py-4">Source IP</th>
                  <th className="px-5 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y border-slate-800/60">
                {verificationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                        <ShieldCheck className="h-3 w-3" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-amber-400 font-bold">
                      {log.details || "N/A"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-200">
                      {log.entityId ? (
                        <span>
                          {log.entity}: {log.entityId}
                        </span>
                      ) : (
                        "Direct Query"
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">
                      {log.ipAddress || "Internal"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono">
                      {formatDateTime(log.createdAt)}
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
