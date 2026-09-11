"use client";

/**
 * Help & Support page — fully functional.
 *
 * - Live Chat: real WebSocket + PostgreSQL via backend
 * - Email Support: mailto link to dubeykumar878@gmail.com
 * - Documentation: inline full-content docs
 * - FAQ: expandable answers
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  MessageCircle,
  BookOpen,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Phone,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiveSupportChat } from "@/components/support/LiveSupportChat";
import { Documentation } from "@/components/marketing/Documentation";

const FAQ_ITEMS = [
  {
    q: "How does Neural Protocol scan my domain?",
    a: "We perform passive DNS analysis, HTTP header inspection, SSL certificate chain verification, and safe port scanning. We never attempt to exploit vulnerabilities — all checks are read-only and designed to be non-disruptive.",
  },
  {
    q: "Do I need technical knowledge?",
    a: "No. Neural Protocol translates every technical finding into plain English. You can understand your security posture and take action without any cybersecurity background.",
  },
  {
    q: "What does the Security Score mean?",
    a: "Your score (0–100) reflects your overall posture. 90+ is excellent (A), 75–89 is good (B), 60–74 is fair (C), 45–59 is poor (D), below 45 is critical (F). The score updates automatically after every assessment.",
  },
  {
    q: "How often should I run an assessment?",
    a: "We recommend monthly as a baseline, and after any major infrastructure change. Continuous monitoring (paid plans) alerts you to changes between scheduled scans.",
  },
  {
    q: "Is my data safe?",
    a: "We store only the minimum required: domain names, scan results, and remediation progress. We never store passwords, payment details, or personal customer data. All data is encrypted at rest.",
  },
  {
    q: "Can Neural Protocol actually fix my security issues?",
    a: "No. Neural Protocol helps you understand and prioritise issues, and provides step-by-step guidance. The actual fixes are made by you or your team. We verify fixes were applied on the next scan.",
  },
  {
    q: "What happens if my score drops?",
    a: "You'll receive an alert in the Monitoring section and on the Dashboard. The Findings page will show which new issues were detected. Run the Remediation Center to address them.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[hsl(217,33%,17%)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/2 transition-colors"
      >
        <span className="text-sm font-medium text-white leading-snug">{q}</span>
        <div className="shrink-0 text-slate-500">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm text-slate-400 leading-relaxed border-t border-[hsl(217,33%,15%)] pt-3">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const [tab, setTab] = useState<"support" | "docs" | "faq">("support");
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Help & Support</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Real support from real people — Neural Protocol
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          {
            icon: MessageCircle,
            label: "Live Chat",
            desc: "Real-time support",
            color: "text-blue-400",
            bg: "bg-blue-500/10 border-blue-500/20",
            action: () => setChatOpen(true),
            badge: "Online",
          },
          {
            icon: Mail,
            label: "Email Support",
            desc: "dubeykumar878@gmail.com",
            color: "text-green-400",
            bg: "bg-green-500/10 border-green-500/20",
            action: () => { window.location.href = "mailto:dubeykumar878@gmail.com?subject=Neural Protocol Support"; },
            badge: null,
          },
          {
            icon: BookOpen,
            label: "Documentation",
            desc: "Guides & reference",
            color: "text-purple-400",
            bg: "bg-purple-500/10 border-purple-500/20",
            action: () => setTab("docs"),
            badge: null,
          },
          {
            icon: HelpCircle,
            label: "FAQ",
            desc: "Common questions",
            color: "text-orange-400",
            bg: "bg-orange-500/10 border-orange-500/20",
            action: () => setTab("faq"),
            badge: null,
          },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="text-left group"
          >
            <Card hover className="h-full">
              <CardContent className="pt-4 pb-4 text-center relative">
                {item.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    {item.badge}
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl ${item.bg} border flex items-center justify-center mx-auto mb-2`}>
                  <item.icon size={18} className={item.color} />
                </div>
                <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{item.label}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">{item.desc}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Support hours */}
      <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,17%)]">
        {[
          { icon: Clock, label: "Live Chat", value: "Mon–Fri, 9am–6pm GMT" },
          { icon: Mail, label: "Email", value: "24h response time" },
          { icon: CheckCircle2, label: "Documentation", value: "Always available" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon size={13} className="text-slate-500" />
            <span className="text-xs text-slate-500">{item.label}:</span>
            <span className="text-xs text-slate-300">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex gap-1 border-b border-[hsl(217,33%,15%)]">
        {(["support", "docs", "faq"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              tab === t
                ? "text-white border-blue-500"
                : "text-slate-500 hover:text-slate-300 border-transparent"
            }`}
          >
            {t === "support" ? "Live Chat" : t === "docs" ? "Documentation" : "FAQ"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "support" && (
          <motion.div key="support" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <LiveSupportChat embedded />
          </motion.div>
        )}

        {tab === "docs" && (
          <motion.div key="docs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Documentation compact />
          </motion.div>
        )}

        {tab === "faq" && (
          <motion.div key="faq" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, i) => <FaqItem key={i} {...item} />)}
            </div>

            {/* External resources */}
            <div className="mt-6">
              <div className="text-sm font-semibold text-white mb-3">Useful security resources</div>
              <div className="space-y-1">
                {[
                  { label: "NCSC Small Business Guide",             url: "https://www.ncsc.gov.uk/collection/small-business-guide" },
                  { label: "Have I Been Pwned — check breached emails", url: "https://haveibeenpwned.com" },
                  { label: "SSL Labs — test your SSL/TLS configuration", url: "https://www.ssllabs.com/ssltest/" },
                  { label: "Security Headers — check your HTTP headers",  url: "https://securityheaders.com" },
                  { label: "MXToolbox — email DNS verification",          url: "https://mxtoolbox.com" },
                ].map((r) => (
                  <a
                    key={r.label}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg text-xs text-blue-400 hover:text-blue-300 hover:bg-white/3 transition-colors"
                  >
                    {r.label}
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating chat widget (when opened from card) */}
      <AnimatePresence>
        {chatOpen && (
          <LiveSupportChat onClose={() => setChatOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
