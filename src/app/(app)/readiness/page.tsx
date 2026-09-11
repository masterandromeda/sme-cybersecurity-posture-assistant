"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Mail,
  Globe,
  Server,
  Users,
  Shield,
  ChevronRight,
  Award,
  FileText,
  AlertCircle,
  Download,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const modules = [
  { id: 1, title: "Introduction to Business Cybersecurity", description: "Why small businesses are targeted and what attackers are looking for", icon: Shield, duration: "5 min read", completed: true, category: "Foundations" },
  { id: 2, title: "Secure Your Email Domain", description: "How to set up SPF, DKIM, and DMARC to prevent email impersonation", icon: Mail, duration: "8 min read", completed: true, category: "Email Security" },
  { id: 3, title: "Multi-Factor Authentication (MFA) Guide", description: "Step-by-step guide to enabling MFA on all your business accounts", icon: Lock, duration: "6 min read", completed: false, category: "Account Security" },
  { id: 4, title: "Managing User Access", description: "Least privilege, role separation, and offboarding securely", icon: Users, duration: "7 min read", completed: false, category: "Access Control" },
  { id: 5, title: "Website Security Basics", description: "SSL certificates, security headers, and keeping your site protected", icon: Globe, duration: "9 min read", completed: false, category: "Web Security" },
  { id: 6, title: "Securing Your Cloud Services", description: "Best practices for AWS, GCP, Azure, and SaaS application security", icon: Server, duration: "10 min read", completed: false, category: "Cloud Security" },
];

const evidenceItems = [
  { id: "ev-1", title: "Security Posture Summary", status: "available" as const, description: "Current score, grade, and trend" },
  { id: "ev-2", title: "Latest Assessment Report", status: "available" as const, description: "Full scan results — Sep 10, 2025" },
  { id: "ev-3", title: "Assessment History (6 months)", status: "available" as const, description: "4 completed assessments" },
  { id: "ev-4", title: "Security Controls List", status: "available" as const, description: "Active controls and configurations" },
  { id: "ev-5", title: "Remediation Progress", status: "available" as const, description: "6 items tracked, 1 in progress" },
  { id: "ev-6", title: "Open Risk Register", status: "available" as const, description: "Current findings with business context" },
  { id: "ev-7", title: "MFA Policy Evidence", status: "missing" as const, description: "MFA not yet enabled on all accounts" },
  { id: "ev-8", title: "Data Encryption Policy", status: "missing" as const, description: "No policy document available" },
  { id: "ev-9", title: "Vendor Risk Assessment", status: "review" as const, description: "3 vendors not reviewed in 6 months" },
  { id: "ev-10", title: "Incident Response Plan", status: "missing" as const, description: "No plan document on file" },
  { id: "ev-11", title: "Employee Security Training", status: "review" as const, description: "Training records require verification" },
  { id: "ev-12", title: "Backup & Recovery Policy", status: "missing" as const, description: "No verified backup strategy documented" },
];

function PackModal({ onClose }: { onClose: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  function generate() {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setDone(true); }, 2200);
  }

  const includeItems = [
    "Security Posture Summary (82/100 — Grade B)",
    "Current Security Score and Trend",
    "Assessment History (4 assessments)",
    "Security Controls in Place",
    "Available Evidence Documents",
    "Open Risk Register",
    "Remediation Progress Report",
    "Assessment Date: Sep 10, 2025",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,18%)] rounded-2xl p-6 w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText size={16} className="text-blue-400" />
              Generate Security Readiness Pack
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">A professional document pack for security questionnaires</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {!done ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <div className="text-xs font-semibold text-white mb-2">What will be included:</div>
              <div className="space-y-1.5">
                {includeItems.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={11} className="text-green-400 shrink-0" />
                    <span className="text-xs text-slate-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
              <div className="flex items-start gap-2">
                <AlertCircle size={12} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  8 of 12 evidence items are available. 4 items are missing or require review — these will be flagged in the pack.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-400 border border-[hsl(217,33%,20%)] rounded-lg hover:text-white transition-colors">Cancel</button>
              <button
                onClick={generate}
                disabled={generating}
                className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                ) : (
                  <><Download size={14} /> Generate Pack</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={22} className="text-green-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Pack Ready</div>
              <p className="text-xs text-slate-400 mt-1">Your Security Readiness Pack has been generated and is ready to download.</p>
            </div>
            <div className="text-[10px] text-slate-500">
              Note: PDF generation will be connected to the backend. This is a preview of the feature.
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download size={13} /> Download Pack (Preview)
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function ReadinessPage() {
  const [completedModules, setCompletedModules] = useState<number[]>(
    modules.filter((m) => m.completed).map((m) => m.id)
  );
  const [showPackModal, setShowPackModal] = useState(false);

  function toggleComplete(id: number) {
    setCompletedModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const progress = Math.round((completedModules.length / modules.length) * 100);
  const available = evidenceItems.filter((e) => e.status === "available").length;
  const missing = evidenceItems.filter((e) => e.status === "missing").length;
  const review = evidenceItems.filter((e) => e.status === "review").length;
  const readinessPercent = Math.round((available / evidenceItems.length) * 100);

  return (
    <div className="p-6 space-y-6 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Readiness Center</h2>
          <p className="text-sm text-slate-400 mt-0.5">Prepare for security questionnaires and prove your security posture</p>
        </div>
        <button
          onClick={() => setShowPackModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <FileText size={14} /> Generate Readiness Pack
        </button>
      </div>

      {/* Readiness Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Readiness Score */}
        <Card className="md:col-span-1">
          <CardContent className="pt-5 text-center">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Security Readiness</div>
            <div className="relative w-24 h-24 mx-auto mb-3">
              <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(217,33%,17%)" strokeWidth="8" />
                <circle cx="48" cy="48" r="40" fill="none" stroke="#3b82f6" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={251}
                  strokeDashoffset={251 - (readinessPercent / 100) * 251}
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-blue-400">{readinessPercent}%</span>
                <span className="text-[9px] text-slate-500">ready</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs">
              <span className="text-green-400 font-semibold">{available} available</span>
              <span className="text-yellow-400 font-semibold">{review} review</span>
              <span className="text-red-400 font-semibold">{missing} missing</span>
            </div>
          </CardContent>
        </Card>

        {/* Evidence items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Evidence Documents</CardTitle>
            <CardDescription>Documentation available for security questionnaires</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 max-h-52 overflow-y-auto space-y-1.5">
            {evidenceItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors">
                {item.status === "available" ? (
                  <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                ) : item.status === "review" ? (
                  <AlertCircle size={13} className="text-yellow-400 shrink-0" />
                ) : (
                  <X size={13} className="text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-white">{item.title}</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.description}</p>
                </div>
                <span className={cn(
                  "text-[9px] font-medium rounded px-1.5 py-0.5 border shrink-0",
                  item.status === "available" ? "text-green-400 bg-green-500/10 border-green-500/20" :
                  item.status === "review" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
                  "text-red-400 bg-red-500/10 border-red-500/20"
                )}>
                  {item.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Learning modules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Learning Modules</h3>
            <p className="text-xs text-slate-400 mt-0.5">Cybersecurity essentials — no technical background required</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)]">
            <Award size={13} className="text-yellow-400" />
            <span className="text-xs text-slate-300">{completedModules.length} / {modules.length} completed</span>
          </div>
        </div>

        {/* Progress */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <BookOpen size={13} className="text-blue-400" />
                <span className="text-xs font-medium text-white">Your Learning Progress</span>
              </div>
              <span className="text-xs font-bold text-blue-400">{progress}%</span>
            </div>
            <div className="h-1.5 bg-[hsl(217,33%,15%)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((module, i) => {
            const isDone = completedModules.includes(module.id);
            const Icon = module.icon;
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card hover className={cn("cursor-pointer", isDone && "opacity-75")}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                        isDone ? "bg-green-500/10 border-green-500/20" : "bg-blue-500/10 border-blue-500/20"
                      )}>
                        {isDone ? <CheckCircle2 size={14} className="text-green-400" /> : <Icon size={14} className="text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-slate-500 border border-[hsl(217,33%,20%)] rounded px-1.5 py-0.5">{module.category}</span>
                        <h4 className="text-xs font-semibold text-white mt-1.5 leading-snug">{module.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{module.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <BookOpen size={9} /> {module.duration}
                          </span>
                          <button
                            onClick={() => toggleComplete(module.id)}
                            className={cn(
                              "ml-auto flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border transition-colors",
                              isDone ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-blue-400 border-blue-500/20 hover:bg-blue-500/10"
                            )}
                          >
                            {isDone ? <><CheckCircle2 size={10} /> Done</> : <>Start <ChevronRight size={10} /></>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pack Modal */}
      <AnimatePresence>
        {showPackModal && <PackModal onClose={() => setShowPackModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
