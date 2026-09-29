import React from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  TrendingUp,
  Download,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { ApplicationService } from "@/features/applications/application.service";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let stats: any = {
    totalApplications: 0,
    pendingRequests: 0,
    underReviewRequests: 0,
    approvedCertificates: 0,
    rejectedRequests: 0,
    recentApplications: [],
    recentCertificates: [],
    recentAuditLogs: [],
  };

  try {
    stats = await ApplicationService.getDashboardStats();
  } catch (err) {
    console.error("Dashboard fetch error:", err);
  }

  const statCards = [
    {
      title: "Total Applications",
      value: stats.totalApplications,
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
    {
      title: "Pending Requests",
      value: stats.pendingRequests,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      highlight: true,
    },
    {
      title: "Approved Certificates",
      value: stats.approvedCertificates,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    },
    {
      title: "Rejected Requests",
      value: stats.rejectedRequests,
      icon: XCircle,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/30",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Quick Overview Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Award className="h-4 w-4" />
            Adjudication Center
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
            World Book of Record Excellence Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitor real-time candidate submissions, adjudicate records, and manage the official
            certificate registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/applications?status=PENDING">
            <Button variant="gold" size="sm" className="font-semibold">
              Review Pending ({stats.pendingRequests})
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`p-6 rounded-2xl border bg-slate-900/80 backdrop-blur-sm shadow-xl flex items-center justify-between transition-all hover:translate-y-[-2px] ${
                card.highlight ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-slate-800"
              }`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.title}
                </p>
                <p className="text-3xl font-extrabold text-white mt-1 font-mono">
                  {card.value}
                </p>
              </div>

              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center border ${card.bgColor} ${card.borderColor} ${card.color}`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Columns: Recent Applications & Recent Certificates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Applications (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Recent Applications
              </h3>
            </div>
            <Link
              href="/admin/applications"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
            {stats.recentApplications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No record applications submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="px-4 py-3.5">App Number</th>
                      <th className="px-4 py-3.5">Applicant</th>
                      <th className="px-4 py-3.5">Achievement Title</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stats.recentApplications.map((app: any) => (
                      <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-amber-400">
                          {app.applicationNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {app.applicantName}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate text-slate-300">
                          {app.achievementTitle}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{app.category}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/admin/applications/${app.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-[11px]">
                              Review
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Issued Certificates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Latest Certificates
              </h3>
            </div>
            <Link
              href="/admin/certificates"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              All Records <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl p-4 space-y-3">
            {stats.recentCertificates.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No certificates generated yet.
              </p>
            ) : (
              stats.recentCertificates.map((cert: any) => (
                <div
                  key={cert.id}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-bold text-amber-400 truncate">
                      {cert.recordId}
                    </p>
                    <p className="text-xs font-semibold text-white truncate mt-0.5">
                      {cert.recipientName}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {cert.achievementTitle}
                    </p>
                  </div>
                  <a
                    href={`/api/certificates/${encodeURIComponent(
                      cert.certificateNumber || cert.recordId
                    )}/download`}
                    download
                  >
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity / Audit Log Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-amber-400" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Adjudication Audit Logs
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl p-4">
          {stats.recentAuditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No audit logs recorded.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentAuditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <div>
                      <span className="font-semibold text-white">{log.action}</span>
                      {log.details && (
                        <span className="text-slate-400 ml-2 font-mono text-[11px]">
                          {log.details}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
