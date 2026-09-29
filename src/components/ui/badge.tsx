import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "gold"
    | "outline";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-blue-900/60 text-blue-200 border-blue-700/50",
    secondary: "bg-slate-800 text-slate-300 border-slate-700",
    success: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
    warning: "bg-amber-950/80 text-amber-300 border-amber-700/60",
    destructive: "bg-rose-950/80 text-rose-300 border-rose-700/60",
    gold: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    outline: "border-slate-700 text-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
