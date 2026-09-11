"use client";

/**
 * Documentation — full-content documentation experience.
 * Each section renders real content inline (no broken links).
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Shield,
  Search,
  BarChart3,
  Wrench,
  Activity,
  Users,
  TrendingUp,
  MessageSquare,
  FileText,
  HelpCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOC_SECTIONS = [
  {
    id: "getting-started",
    icon: Zap,
    title: "Getting Started",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    content: [
      {
        heading: "Welcome to Neural Protocol",
        body: `Neural Protocol is an AI-powered security posture assistant designed for small and medium-sized businesses. You don't need a security team to use it — we translate every technical finding into plain language so you can understand, prioritise, and fix your security issues.`
      },
      {
        heading: "Your First Assessment",
        body: `1. Navigate to Assessments in the sidebar.\n2. Enter your business domain (e.g. yourbusiness.com).\n3. Click "Run Assessment".\n4. The scan takes 1–3 minutes. You will see real-time progress.\n5. When complete, your Security Score and Findings are updated.\n\nOnly scan domains you own or are authorised to test. We never exploit vulnerabilities — all checks are safe and read-only.`
      },
      {
        heading: "Understanding Your Score",
        body: `Your Security Score (0–100) reflects your current posture:\n\n• 90–100 (A) — Excellent. Maintain this level.\n• 75–89 (B) — Good. A few items to address.\n• 60–74 (C) — Fair. Several issues need attention.\n• 45–59 (D) — Poor. Immediate action recommended.\n• 0–44 (F) — Critical. Urgent remediation needed.\n\nThe score updates automatically after each assessment.`
      },
    ]
  },
  {
    id: "assessments",
    icon: Search,
    title: "Security Assessment",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    content: [
      {
        heading: "What We Check",
        body: `Every assessment runs 30+ checks across 7 categories:\n\n• Exposed Services — open ports and services visible to the internet\n• Domain Security — DNSSEC, DNS configuration\n• Email Security — SPF, DKIM, DMARC records\n• SSL/TLS — certificate validity, expiry, cipher strength\n• Security Headers — CSP, HSTS, X-Frame-Options, and more\n• Patch/System Hygiene — outdated banners, known vulnerable versions\n• Account Hygiene — configuration-level account security signals`
      },
      {
        heading: "Scheduling & Frequency",
        body: `We recommend:\n• Monthly full assessments as a baseline.\n• After every major infrastructure change (new website, new hosting).\n• After onboarding new vendors or cloud services.\n\nContinuous monitoring (available on paid plans) alerts you to changes between scheduled scans.`
      },
    ]
  },
  {
    id: "findings",
    icon: Shield,
    title: "Findings",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    content: [
      {
        heading: "Plain-Language Findings",
        body: `Neural Protocol never shows raw technical output. Every finding has:\n\n• What we found — a plain English summary\n• Why it matters — the security context\n• Business impact — what this means for your business\n• Recommended action — clear next steps\n• Technical details — collapsible, for advanced users\n\nExample: instead of "SPF record missing", we say "Your business email can be impersonated — attackers could send emails pretending to be from your domain."`
      },
      {
        heading: "Risk Levels",
        body: `• Critical — Active exploitation risk. Address immediately.\n• High — Significant vulnerability. Address within 24–48 hours.\n• Medium — Moderate risk. Address within 2 weeks.\n• Low — Minor issue. Address when convenient.\n• Info — No immediate action needed. Good to know.`
      },
    ]
  },
  {
    id: "remediation",
    icon: Wrench,
    title: "Remediation",
    color: "text-green-400",
    bg: "bg-green-500/10",
    content: [
      {
        heading: "Prioritised Fix Queue",
        body: `The Remediation Center doesn't just sort findings by severity. It scores each issue using:\n\nPriority = Risk Reduction × Business Impact ÷ Effort\n\nThis means a 5-minute fix with high impact appears before a complex fix with marginal benefit. You always tackle the highest-leverage problems first.`
      },
      {
        heading: "Step-by-Step Guides",
        body: `Click any finding to see a guided fix:\n\n1. Why you should fix it (plain language)\n2. Numbered steps with exact instructions\n3. Progress tracker (Step 2 of 5)\n4. "Mark as completed" — Neural Protocol will verify on the next scan\n\nWe never claim a fix is complete until verified by a follow-up scan.`
      },
    ]
  },
  {
    id: "monitoring",
    icon: Activity,
    title: "Continuous Monitoring",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    content: [
      {
        heading: "What Gets Monitored",
        body: `Continuous monitoring checks your assets on a schedule and alerts you when something changes:\n\n• New exposed services detected\n• SSL certificate approaching expiry\n• DNS/email configuration changes\n• Security header regressions\n• Score drops below a threshold\n\nAlerts appear in the Monitoring page and in the dashboard "Recent Alerts" card.`
      },
    ]
  },
  {
    id: "accounts-vendors",
    icon: Users,
    title: "Accounts & Vendors",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    content: [
      {
        heading: "Managing Assets",
        body: `Add all your business assets — domains, subdomains, IP addresses, cloud accounts, and email identities — to track their security status in one place.\n\nEach asset shows its risk level, last scan date, and number of open findings.`
      },
      {
        heading: "Vendor Risk",
        body: `Third-party vendors with access to your systems represent supply-chain risk. Neural Protocol lets you track:\n\n• Which vendors have access to your systems\n• Their risk category\n• When their access was last reviewed\n• Recommended next review date`
      },
    ]
  },
  {
    id: "posture",
    icon: TrendingUp,
    title: "Posture Score",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    content: [
      {
        heading: "How the Score is Calculated",
        body: `The Security Score is a weighted aggregate:\n\n• Each category (email, SSL, headers, etc.) has a sub-score.\n• Sub-scores are weighted by business impact.\n• Open findings reduce the score by an amount proportional to their severity.\n• Resolved findings restore points on re-scan.\n\nA score of 100 means all checks passed. A score of 0 means critical failures in every category.`
      },
      {
        heading: "Score History",
        body: `The Posture page shows your score history over time. This helps you:\n• Demonstrate security improvement to stakeholders\n• Identify regressions after changes\n• Generate compliance evidence`
      },
    ]
  },
  {
    id: "copilot",
    icon: MessageSquare,
    title: "Security Copilot",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    content: [
      {
        heading: "What is the Security Copilot?",
        body: `The Security Copilot is an AI assistant that answers questions about your specific security posture. Unlike generic chatbots, it uses your real assessment data as context.\n\nAsk things like:\n• "What is my biggest security risk right now?"\n• "Explain the SPF finding in simple terms"\n• "What should I fix first this week?"\n• "Is my SSL certificate about to expire?"`
      },
      {
        heading: "How It Works",
        body: `When you ask a question, the Copilot:\n1. Retrieves your latest assessment data, score, and findings.\n2. Passes this as context to the AI model.\n3. Returns an answer grounded in your real data.\n\nIf no assessment has been run yet, the Copilot still works but answers from general knowledge only. Run an assessment first for the best results.`
      },
    ]
  },
  {
    id: "reports",
    icon: FileText,
    title: "Reports",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    content: [
      {
        heading: "Downloading Reports",
        body: `After every completed assessment, you can download:\n\n• JSON Report — full machine-readable data for integrations\n• PDF Report — professional A4 report suitable for stakeholders, auditors, or compliance documentation\n\nReports are available from the Assessments page and the Dashboard.`
      },
      {
        heading: "What's in the PDF Report",
        body: `• Executive summary with score and grade\n• Findings breakdown by severity\n• Per-finding details with business impact\n• Category-level scores\n• Recommended actions prioritised by risk\n• Scan metadata (date, domain, total checks)`
      },
    ]
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "FAQ",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    content: [
      {
        heading: "Is my data safe?",
        body: `We store only the minimum required: domain names, scan results, and remediation progress. We never store passwords, payment data, or personal customer records. All data is encrypted at rest.`
      },
      {
        heading: "Will scanning harm my website?",
        body: `No. All checks are passive and read-only. We inspect publicly visible information — DNS records, HTTP headers, SSL certificates, and open ports — using the same information an attacker could see from the internet. We never attempt to exploit vulnerabilities.`
      },
      {
        heading: "Do I need technical knowledge?",
        body: `No. Neural Protocol is designed for business owners, not security engineers. Every finding is written in plain language. Technical details are available but always hidden by default.`
      },
      {
        heading: "How accurate is the Security Score?",
        body: `The score reflects the checks we run. It is not a guarantee of perfect security — it measures the observable surface posture of your domain. Physical security, employee behaviour, and internal network security are outside scope.`
      },
      {
        heading: "What happens when I fix an issue?",
        body: `Run a new assessment after making changes. Neural Protocol will re-check all findings and update your score. Resolved findings are marked as fixed automatically when the check passes.`
      },
    ]
  },
];

interface DocSectionProps {
  section: typeof DOC_SECTIONS[number];
}

function DocSection({ section }: DocSectionProps) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className="border border-[hsl(217,33%,17%)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/2 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", section.bg)}>
            <Icon size={15} className={section.color} />
          </div>
          <span className="text-sm font-semibold text-white">{section.title}</span>
        </div>
        <ChevronDown
          size={16}
          className={cn("text-slate-500 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-[hsl(217,33%,15%)]">
              {section.content.map((item, i) => (
                <div key={i} className="pt-4">
                  <h4 className="text-sm font-semibold text-white mb-2">{item.heading}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Documentation({ compact = false }: { compact?: boolean }) {
  const [activeSearch, setActiveSearch] = useState("");

  const filtered = activeSearch
    ? DOC_SECTIONS.filter((s) =>
        s.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
        s.content.some(
          (c) =>
            c.heading.toLowerCase().includes(activeSearch.toLowerCase()) ||
            c.body.toLowerCase().includes(activeSearch.toLowerCase())
        )
      )
    : DOC_SECTIONS;

  return (
    <div className={cn("space-y-6", compact ? "" : "max-w-[800px] mx-auto")}>
      {!compact && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={18} className="text-purple-400" />
            <h2 className="text-xl font-bold text-white">Documentation</h2>
          </div>
          <p className="text-sm text-slate-400">
            Everything you need to get the most out of Neural Protocol.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)] rounded-xl px-3 py-2.5">
        <Search size={13} className="text-slate-500 shrink-0" />
        <input
          value={activeSearch}
          onChange={(e) => setActiveSearch(e.target.value)}
          placeholder="Search documentation…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
        />
      </div>

      {/* Quick nav (desktop) */}
      {!compact && (
        <div className="flex flex-wrap gap-1.5">
          {DOC_SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => {
                  const el = document.getElementById(`doc-${s.id}`);
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-[hsl(217,33%,17%)] text-slate-400 hover:text-white hover:border-[hsl(217,33%,25%)] transition-colors"
              >
                <Icon size={11} className={s.color} />
                {s.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No results for &quot;{activeSearch}&quot;</div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} id={`doc-${s.id}`}>
              <DocSection section={s} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
