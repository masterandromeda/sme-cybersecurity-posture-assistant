"use client";

/**
 * Pricing — Neural Protocol pricing plans.
 * CTAs link to real signup / contact flows.
 */

import { motion } from "framer-motion";
import { CheckCircle2, Zap, Shield, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PLANS = [
  {
    id: "free",
    name: "Free",
    icon: Zap,
    price: "$0",
    period: "forever",
    tagline: "Get started, no card required",
    color: "text-slate-400",
    border: "border-[hsl(217,33%,20%)]",
    highlight: false,
    features: [
      "1 domain assessment per month",
      "Up to 10 findings",
      "Plain-language explanations",
      "PDF report download",
      "Security Score (0–100)",
      "Basic remediation guidance",
    ],
    excluded: [
      "Continuous monitoring",
      "AI Security Copilot",
      "Multiple domains",
      "Priority support",
    ],
    cta: "Start Free",
    ctaHref: "/login",
    ctaVariant: "outline" as const,
  },
  {
    id: "professional",
    name: "Professional",
    icon: Shield,
    price: "$49",
    period: "per month",
    tagline: "For growing businesses that take security seriously",
    color: "text-blue-400",
    border: "border-blue-500/40",
    highlight: true,
    badge: "Most Popular",
    features: [
      "5 domains / unlimited assessments",
      "Unlimited findings",
      "AI plain-language explanations",
      "PDF + JSON reports",
      "Security Score + history",
      "Continuous monitoring",
      "AI Security Copilot",
      "Step-by-step remediation guides",
      "Email support (48h response)",
    ],
    excluded: [],
    cta: "Go Professional",
    ctaHref: "mailto:dubeykumar878@gmail.com?subject=Neural Protocol - Professional Plan",
    ctaVariant: "primary" as const,
  },
  {
    id: "business",
    name: "Business",
    icon: Building2,
    price: "$149",
    period: "per month",
    tagline: "For teams managing multiple brands or client portfolios",
    color: "text-purple-400",
    border: "border-purple-500/30",
    highlight: false,
    features: [
      "Unlimited domains",
      "Unlimited assessments",
      "All Professional features",
      "Multi-workspace support",
      "Team access (5 seats)",
      "Vendor risk management",
      "Compliance evidence exports",
      "Priority live chat support",
      "Dedicated onboarding call",
      "Custom report branding",
    ],
    excluded: [],
    cta: "Choose Business",
    ctaHref: "mailto:dubeykumar878@gmail.com?subject=Neural Protocol - Business Plan",
    ctaVariant: "outline" as const,
  },
];

export function Pricing({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("space-y-8", !compact && "max-w-[1100px] mx-auto")}>
      {!compact && (
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Simple, transparent pricing</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Start free and upgrade when you need more.
            All plans include real scans — no fake data.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "relative rounded-2xl border p-5 flex flex-col",
                plan.highlight
                  ? "bg-gradient-to-b from-blue-500/8 to-[hsl(222,47%,10%)]"
                  : "bg-[hsl(222,47%,10%)]",
                plan.border
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-600 text-white">
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-3 mb-5">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
                  plan.highlight ? "bg-blue-500/15 border-blue-500/30" : "bg-white/5 border-white/10"
                )}>
                  <Icon size={17} className={plan.color} />
                </div>
                <div>
                  <div className="text-base font-bold text-white">{plan.name}</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{plan.tagline}</div>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <span className={cn("text-3xl font-bold tabular-nums", plan.color)}>{plan.price}</span>
                <span className="text-slate-500 text-sm ml-1">/ {plan.period}</span>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2 mb-6">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-green-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-300 leading-snug">{f}</span>
                  </div>
                ))}
                {plan.excluded.map((f) => (
                  <div key={f} className="flex items-start gap-2 opacity-40">
                    <div className="w-[13px] h-[13px] mt-0.5 shrink-0 flex items-center justify-center">
                      <div className="w-3 h-px bg-slate-600" />
                    </div>
                    <span className="text-xs text-slate-500 leading-snug line-through">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {plan.ctaHref.startsWith("mailto:") ? (
                <a
                  href={plan.ctaHref}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    plan.ctaVariant === "primary"
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "border border-[hsl(217,33%,25%)] hover:border-blue-500/40 text-slate-300 hover:text-white"
                  )}
                >
                  {plan.cta} <ArrowRight size={14} />
                </a>
              ) : (
                <Link
                  href={plan.ctaHref}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    plan.ctaVariant === "primary"
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "border border-[hsl(217,33%,25%)] hover:border-blue-500/40 text-slate-300 hover:text-white"
                  )}
                >
                  {plan.cta} <ArrowRight size={14} />
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Enterprise callout */}
      <div className="text-center py-5 px-6 rounded-2xl bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,17%)]">
        <div className="text-sm font-semibold text-white mb-1">Need a custom plan?</div>
        <div className="text-xs text-slate-400 mb-3">
          For enterprises with specific requirements — custom domains, white-labelling, SLA, or compliance reporting.
        </div>
        <a
          href="mailto:dubeykumar878@gmail.com?subject=Neural Protocol - Enterprise enquiry"
          className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Talk to us <ArrowRight size={12} />
        </a>
      </div>
    </div>
  );
}
