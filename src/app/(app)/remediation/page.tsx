"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  ChevronRight,
  X,
  Shield,
  ChevronLeft,
  ExternalLink,
  TrendingDown,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badges";
import { mockRemediationItems } from "@/lib/mock-data";
import { cn, effortColor, effortLabel } from "@/lib/utils";
import type { RemediationItem } from "@/types";

function PriorityBar({ score }: { score: number }) {
  const color =
    score >= 85 ? "bg-red-500" :
    score >= 70 ? "bg-orange-500" :
    score >= 55 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[hsl(217,33%,17%)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-bold text-white w-7 text-right">{score}</span>
    </div>
  );
}

function RemediationPanel({ item, onClose }: { item: RemediationItem; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  function markComplete(step: number) {
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step]);
    }
    if (step < item.steps.length - 1) {
      setCurrentStep(step + 1);
    }
  }

  const allDone = completedSteps.length === item.steps.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-lg h-full bg-[hsl(222,47%,9%)] border-l border-[hsl(217,33%,16%)] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Panel Header */}
        <div className="px-6 py-5 border-b border-[hsl(217,33%,14%)] shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5 uppercase tracking-wide">
                  Fix Guide
                </span>
                <RiskBadge risk={item.risk} size="xs" />
              </div>
              <h2 className="text-base font-bold text-white leading-snug">{item.title}</h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors shrink-0 mt-0.5">
              <X size={16} />
            </button>
          </div>

          {/* Why you should do this */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={12} className="text-blue-400" />
              <span className="text-xs font-semibold text-blue-300">Why should I do this?</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{item.whyYouShouldDoThis}</p>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-slate-500" />
              <span className="text-xs text-slate-400">{item.estimatedTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-slate-500" />
              <span className={`text-xs ${effortColor(item.effort)}`}>{effortLabel(item.effort)} effort</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown size={12} className="text-slate-500" />
              <span className="text-xs text-green-400">{item.expectedRiskReduction} risk reduction</span>
            </div>
          </div>
        </div>

        {/* Step Progress indicator */}
        <div className="px-6 py-3 border-b border-[hsl(217,33%,14%)] shrink-0">
          <div className="flex items-center gap-1.5">
            {item.steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-1 rounded-full transition-all duration-300",
                  completedSteps.includes(i) ? "bg-green-500" :
                  i === currentStep ? "bg-blue-500" : "bg-[hsl(217,33%,17%)]"
                )}
              />
            ))}
          </div>
          <div className="mt-1.5 text-[10px] text-slate-500">
            {completedSteps.length === 0
              ? `${item.steps.length} steps to complete`
              : `Step ${Math.min(currentStep + 1, item.steps.length)} of ${item.steps.length}`}
          </div>
        </div>

        {/* Steps list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {item.steps.map((step, i) => {
            const isDone = completedSteps.includes(i);
            const isCurrent = i === currentStep;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  isDone ? "bg-green-500/5 border-green-500/15 opacity-70" :
                  isCurrent ? "bg-blue-500/5 border-blue-500/20" :
                  "bg-[hsl(222,47%,11%)] border-[hsl(217,33%,17%)] opacity-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold transition-all",
                      isDone ? "border-green-500 bg-green-500 text-white" :
                      isCurrent ? "border-blue-500 text-blue-400" :
                      "border-[hsl(217,33%,25%)] text-slate-600"
                    )}
                  >
                    {isDone ? <CheckCircle2 size={14} /> : step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-semibold mb-1", isDone ? "text-green-300" : isCurrent ? "text-white" : "text-slate-500")}>
                      {step.title}
                    </div>
                    <p className={cn("text-xs leading-relaxed", isDone ? "text-slate-500" : isCurrent ? "text-slate-300" : "text-slate-600")}>
                      {step.description}
                    </p>
                    {step.actionUrl && isCurrent && (
                      <a
                        href={step.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Open tool <ExternalLink size={10} />
                      </a>
                    )}
                    {isCurrent && !isDone && (
                      <button
                        onClick={() => markComplete(i)}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <CheckCircle2 size={12} /> Mark as completed
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="px-6 py-4 border-t border-[hsl(217,33%,14%)] shrink-0">
          {allDone ? (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle2 size={18} className="text-green-400 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-green-300">All steps completed!</div>
                <div className="text-xs text-slate-400 mt-0.5">Our next scan will verify this fix is in place.</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(217,33%,20%)] text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
                >
                  <ChevronLeft size={13} /> Back
                </button>
              )}
              {currentStep < item.steps.length - 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(217,33%,20%)] text-slate-400 hover:text-white text-xs rounded-lg transition-colors ml-auto"
                >
                  Skip <ChevronRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function RemediationCard({ item, onViewFix }: { item: RemediationItem; onViewFix: () => void }) {
  const priorityLabel =
    item.priorityScore >= 85 ? "Fix First" :
    item.priorityScore >= 70 ? "Fix Soon" :
    item.priorityScore >= 55 ? "Fix Later" : "Low Priority";

  const priorityColor =
    item.priorityScore >= 85 ? "text-red-400 bg-red-500/10 border-red-500/20" :
    item.priorityScore >= 70 ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
    item.priorityScore >= 55 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
    "text-green-400 bg-green-500/10 border-green-500/20";

  return (
    <Card hover>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Priority + Risk badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn("text-[10px] font-bold uppercase tracking-wide rounded-md px-2 py-1 border", priorityColor)}>
                {priorityLabel}
              </span>
              <RiskBadge risk={item.risk} size="xs" />
              <span className="text-[10px] text-slate-500 border border-[hsl(217,33%,20%)] rounded px-1.5 py-0.5">
                {item.category}
              </span>
              {item.status === "in_progress" && (
                <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                  In Progress
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-white leading-snug mb-1">{item.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">{item.businessImpact}</p>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[
                { icon: Shield, label: "Risk", value: item.risk, color: item.risk === "high" ? "text-orange-400" : "text-yellow-400" },
                { icon: Zap, label: "Effort", value: `${effortLabel(item.effort)}`, color: effortColor(item.effort) },
                { icon: Clock, label: "Est. Time", value: item.estimatedTime, color: "text-slate-300" },
                { icon: TrendingDown, label: "Risk Reduction", value: `${item.expectedRiskReduction.charAt(0).toUpperCase() + item.expectedRiskReduction.slice(1)}`, color: "text-green-400" },
              ].map((stat) => (
                <div key={stat.label} className="p-2 rounded-lg bg-[hsl(222,47%,12%)]">
                  <div className="flex items-center gap-1 mb-0.5">
                    <stat.icon size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-500">{stat.label}</span>
                  </div>
                  <div className={`text-xs font-semibold capitalize ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Priority score bar */}
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500">Priority score (risk × impact ÷ effort)</span>
              </div>
              <PriorityBar score={item.priorityScore} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onViewFix}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            View Fix <ArrowRight size={12} />
          </button>
          <div className="text-xs text-slate-500 ml-auto flex items-center gap-1">
            <Target size={11} />
            Affects: <span className="text-slate-300 ml-1">{item.affectedAsset}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RemediationPage() {
  const [selectedItem, setSelectedItem] = useState<RemediationItem | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");

  const sorted = [...mockRemediationItems].sort((a, b) => b.priorityScore - a.priorityScore);
  const filtered = sorted.filter((r) => filter === "all" || r.status === filter);

  const pending = mockRemediationItems.filter((r) => r.status === "pending").length;
  const inProgress = mockRemediationItems.filter((r) => r.status === "in_progress").length;
  const completed = mockRemediationItems.filter((r) => r.status === "completed").length;

  return (
    <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Remediation Center</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Prioritized by impact — highest value fixes first
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "To Do", count: pending, color: "text-orange-400", icon: Target },
          { label: "In Progress", count: inProgress, color: "text-blue-400", icon: BarChart3 },
          { label: "Completed", count: completed, color: "text-green-400", icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <stat.icon size={14} className={stat.color} />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority explanation */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <BarChart3 size={15} className="text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">How we prioritize fixes</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Items are ranked by: <span className="text-white font-medium">Risk Reduction × Business Impact ÷ Effort required</span>. Fix the top items first for the highest security gain with the least work.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(["all", "pending", "in_progress", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border transition-colors",
              filter === s
                ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                : "border-[hsl(217,33%,17%)] text-slate-400 hover:text-white hover:border-[hsl(217,33%,25%)]"
            )}
          >
            {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="text-xs text-slate-600 ml-2">{filtered.length} items</span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <RemediationCard item={item} onViewFix={() => setSelectedItem(item)} />
          </motion.div>
        ))}
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selectedItem && (
          <RemediationPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
