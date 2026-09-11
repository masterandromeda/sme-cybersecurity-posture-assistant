"use client";

import { cn, riskBgColor, riskLabel } from "@/lib/utils";
import type { RiskLevel } from "@/types";

interface BadgeProps {
  risk?: RiskLevel;
  children?: React.ReactNode;
  className?: string;
  size?: "xs" | "sm";
}

export function RiskBadge({ risk, children, className, size = "sm" }: BadgeProps) {
  if (!risk) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center border font-medium rounded-md",
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        riskBgColor(risk),
        className
      )}
    >
      {children ?? riskLabel(risk)}
    </span>
  );
}

interface StatusBadgeProps {
  status: "pass" | "warning" | "fail" | "open" | "in_progress" | "resolved" | "accepted" | "completed" | "pending" | "skipped" | "active" | "inactive";
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  warning: { label: "Warning", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  fail: { label: "Fail", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  open: { label: "Open", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  resolved: { label: "Resolved", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  accepted: { label: "Accepted", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  pending: { label: "Pending", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  skipped: { label: "Skipped", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  active: { label: "Active", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  inactive: { label: "Inactive", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  return (
    <span className={cn("inline-flex items-center border text-xs font-medium rounded-md px-2 py-1", config.className, className)}>
      {config.label}
    </span>
  );
}
