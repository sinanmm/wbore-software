import React from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
} from "lucide-react";

export interface DashboardStatsProps {
  totalApplications: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  certificatesIssued: number;
}

export function DashboardStatsCards({ stats }: { stats: DashboardStatsProps }) {
  const cards = [
    {
      title: "Total Applications",
      value: stats.totalApplications,
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      description: "Lifetime submissions",
    },
    {
      title: "Pending Review",
      value: stats.pendingReview,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/40",
      highlight: true,
      description: "Awaiting adjudication",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      description: "Qualified for honors",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/30",
      description: "Does not meet criteria",
    },
    {
      title: "Certificates Issued",
      value: stats.certificatesIssued,
      icon: Award,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/40",
      description: "Official published seals",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`p-5 rounded-2xl border bg-slate-900/80 backdrop-blur-sm shadow-xl flex flex-col justify-between transition-all hover:translate-y-[-2px] ${
              card.highlight
                ? "border-amber-500/50 ring-1 ring-amber-500/20 shadow-amber-500/5"
                : "border-slate-800/90"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.borderColor} border`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>

            <div className="mt-4">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {card.value}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
