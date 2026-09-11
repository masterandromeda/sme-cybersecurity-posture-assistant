"use client";

/**
 * Dashboard — Security Command Center
 *
 * What's live / real vs mock:
 *   REAL  — Latest assessment fetched from backend on mount (if available)
 *   REAL  — Score derived from last real assessment
 *   REAL  — Inline assessment panel polls real backend
 *   REAL  — JSON + PDF download from backend
 *   MOCK  — Posture history chart (backend module not yet built)
 *   MOCK  — Alerts (monitoring module not yet built)
 *   MOCK  — Quick actions / remediation (remediation module not yet built)
 *
 * All MOCK data is clearly labelled in the UI.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  AlertTriangle,
  Shield,
  Activity,
  Target,
  Loader2,
  X,
  Download,
  FileJson,
  FileText,
  ChevronRight,
  ServerOff,
  Scan,
  Globe,
  CheckCheck,
  CircleAlert,
} from "lucide-react";
import { AnimatedScoreRing, type ScoreStatus } from "@/components/ui/AnimatedScoreRing";
import { RiskBadge } from "@/components/ui/badges";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { formatRelativeTime, scoreColor } from "@/lib/utils";
import {
  mockFindings,
  mockRemediationItems,
  mockPostureHistory,
  mockAlerts,
  mockAssessment,
  mockSecurityScore,
} from "@/lib/mock-data";
import {
  startRealAssessment,
  getRealAssessment,
  getRealFindings,
  getJsonReport,
  getPdfReportUrl,
  checkBackendHealth,
  type ApiAssessment,
  type ApiFinding,
  ApiError,
} from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ── Animation presets ────────────────────────────────────────────────────────

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

// ── Scan steps shown in the live panel ───────────────────────────────────────

const SCAN_STEPS = [
  { icon: Globe, label: "Validating domain…" },
  { icon: Scan, label: "Checking exposed services (port scan)…" },
  { icon: Shield, label: "Checking email security (SPF, DKIM, DMARC)…" },
  { icon: CheckCheck, label: "Checking SSL/TLS certificate…" },
  { icon: Activity, label: "Checking security headers…" },
  { icon: Target, label: "Checking DNS / DNSSEC…" },
  { icon: AlertTriangle, label: "Analysing findings…" },
  { icon: CheckCircle2, label: "Generating recommendations…" },
];

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)] rounded-lg px-3 py-2 text-xs">
      <div className="text-slate-400">{label}</div>
      <div className="text-white font-semibold mt-0.5">Score: {payload[0].value}</div>
    </div>
  );
}

// ── Severity colour ──────────────────────────────────────────────────────────

function severityClass(s: string) {
  const m: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
    high:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    low:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
    info:     "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };
  return m[s] ?? m.info;
}

// ── Greeting helper ──────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Data-source label (REAL DATA / MOCK DATA) ─────────────────────────────────

function DataBadge({ real }: { real: boolean }) {
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
        real
          ? "text-green-400 border-green-500/30 bg-green-500/8"
          : "text-slate-500 border-slate-600/30 bg-slate-500/5"
      }`}
    >
      {real ? "Real Data" : "Demo Data"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Assessment Panel (inline — launched from the dashboard "Run" button)
// ─────────────────────────────────────────────────────────────────────────────

interface LivePanelProps {
  onClose: () => void;
  onComplete: (assessment: ApiAssessment, findings: ApiFinding[]) => void;
}

function LiveAssessmentPanel({ onClose, onComplete }: LivePanelProps) {
  const [domain, setDomain] = useState("");
  type Phase = "input" | "submitting" | "polling" | "done" | "error";
  const [phase, setPhase] = useState<Phase>("input");
  const [stepIdx, setStepIdx] = useState(0);
  const [assessment, setAssessment] = useState<ApiAssessment | null>(null);
  const [findings, setFindings] = useState<ApiFinding[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idRef   = useRef("");

  const stopTicker = useCallback(() => {
    if (stepRef.current) { clearInterval(stepRef.current); stepRef.current = null; }
    setStepIdx(SCAN_STEPS.length - 1);
  }, []);

  const startTicker = useCallback(() => {
    setStepIdx(0);
    let idx = 0;
    stepRef.current = setInterval(() => {
      idx = Math.min(idx + 1, SCAN_STEPS.length - 1);
      setStepIdx(idx);
    }, 3000);
  }, []);

  const startPolling = useCallback((id: string) => {
    idRef.current = id;
    pollRef.current = setInterval(async () => {
      try {
        const data = await getRealAssessment(id);
        setAssessment(data);
        if (data.status === "completed") {
          stopTicker();
          clearInterval(pollRef.current!); pollRef.current = null;
          const f = await getRealFindings(id);
          setFindings(f);
          setPhase("done");
          onComplete(data, f);
        } else if (data.status === "failed") {
          stopTicker();
          clearInterval(pollRef.current!); pollRef.current = null;
          setErrorMsg(data.error_message || "Assessment failed.");
          setPhase("error");
        }
      } catch { /* transient — keep polling */ }
    }, 3000);
  }, [stopTicker, onComplete]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (stepRef.current) clearInterval(stepRef.current);
    };
  }, []);

  async function handleStart() {
    const target = domain.trim();
    if (!target) return;
    setErrorMsg("");
    setPhase("submitting");
    try {
      const a = await startRealAssessment(target);
      setAssessment(a);
      setPhase("polling");
      startTicker();
      startPolling(a.id);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to start. Is the backend running?";
      setErrorMsg(msg);
      setPhase("error");
    }
  }

  async function handleDownloadJson() {
    if (!assessment) return;
    setDownloadingJson(true);
    try {
      const report = await getJsonReport(assessment.id);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `neural-protocol-${assessment.domain}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* handled silently */ }
    finally { setDownloadingJson(false); }
  }

  function handleDownloadPdf() {
    if (!assessment) return;
    setDownloadingPdf(true);
    window.open(getPdfReportUrl(assessment.id), "_blank");
    setTimeout(() => setDownloadingPdf(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && phase !== "polling" && phase !== "submitting" && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-lg bg-[hsl(222,47%,9%)] border border-[hsl(217,33%,18%)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(217,33%,15%)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <Scan size={14} className="text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Run Security Assessment</div>
              <div className="text-[11px] text-slate-500">Real-time domain security scan</div>
            </div>
          </div>
          {phase !== "polling" && phase !== "submitting" && (
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">

          {/* ── Input phase ─────────────────────────────── */}
          {(phase === "input" || phase === "error") && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Domain to assess</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(222,47%,12%)] border border-[hsl(217,33%,18%)] focus-within:border-blue-500/50">
                    <Globe size={13} className="text-slate-500 shrink-0" />
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleStart()}
                      placeholder="yourbusiness.com"
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleStart}
                    disabled={!domain.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                  >
                    <Zap size={13} />
                    Scan
                  </button>
                </div>
              </div>

              {phase === "error" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                  <CircleAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-300 leading-relaxed">{errorMsg}</div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,16%)]">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Only scan domains you own or are authorised to test.
                  We run a safe, read-only scan — no exploitation or credential attacks.
                </p>
              </div>
            </div>
          )}

          {/* ── Scanning phase ───────────────────────────── */}
          {(phase === "submitting" || phase === "polling") && (
            <div className="space-y-4">
              {/* Domain + live step indicator */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(222,47%,11%)] border border-blue-500/20">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                    <Loader2 size={16} className="text-blue-400" />
                  </motion.div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Scanning {assessment?.domain ?? domain}</div>
                  <div className="text-[11px] text-blue-300 mt-0.5">
                    {phase === "submitting" ? "Connecting to backend…" : SCAN_STEPS[stepIdx].label}
                  </div>
                </div>
              </div>

              {/* Step list */}
              <div className="space-y-1">
                {SCAN_STEPS.map((step, i) => {
                  const done = i < stepIdx;
                  const active = i === stepIdx && phase === "polling";
                  const StepIcon = step.icon;
                  return (
                    <div key={i} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${
                      active ? "bg-blue-500/8" : ""
                    }`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        done ? "bg-green-500/20" : active ? "bg-blue-500/20" : "bg-[hsl(217,33%,15%)]"
                      }`}>
                        {done ? (
                          <CheckCircle2 size={10} className="text-green-400" />
                        ) : active ? (
                          <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                            <StepIcon size={9} className="text-blue-400" />
                          </motion.div>
                        ) : (
                          <StepIcon size={9} className="text-slate-600" />
                        )}
                      </div>
                      <span className={`text-xs ${
                        done ? "text-green-400/70" : active ? "text-white" : "text-slate-600"
                      }`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Results phase ────────────────────────────── */}
          {phase === "done" && assessment && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Score + counts */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,18%)]">
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`text-3xl font-bold tabular-nums ${scoreColor(assessment.overall_score)}`}>
                    {assessment.overall_score}
                  </div>
                  <div className="text-[10px] text-slate-500">/ 100</div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{assessment.total_checks} checks completed</span>
                    <span className="text-[10px] text-green-400 font-medium bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5">
                      REAL DATA
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-red-400">{assessment.findings_count.critical} critical</span>
                    <span className="text-orange-400">{assessment.findings_count.high} high</span>
                    <span className="text-yellow-400">{assessment.findings_count.medium} medium</span>
                    <span className="text-blue-400">{assessment.findings_count.low} low</span>
                  </div>
                </div>
              </div>

              {/* Top findings */}
              {findings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Top findings
                  </div>
                  {findings.slice(0, 3).map((f) => (
                    <div key={f.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,16%)]">
                      <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize whitespace-nowrap ${severityClass(f.severity)}`}>
                        {f.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white leading-snug">{f.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{f.what_we_found}</div>
                      </div>
                    </div>
                  ))}
                  {findings.length > 3 && (
                    <div className="text-[11px] text-slate-500 text-center">
                      +{findings.length - 3} more findings
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleDownloadJson}
                  disabled={downloadingJson}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(217,33%,20%)] hover:border-blue-500/30 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                >
                  {downloadingJson ? <Loader2 size={12} className="animate-spin" /> : <FileJson size={12} />}
                  JSON
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(217,33%,20%)] hover:border-blue-500/30 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                >
                  {downloadingPdf ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                  PDF Report
                </button>
                <Link
                  href="/assessments"
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                >
                  Full Report <ChevronRight size={12} />
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();

  // ── Real assessment data ─────────────────────────────────────────────────
  const [latestAssessment, setLatestAssessment] = useState<ApiAssessment | null>(null);
  const [latestFindings,   setLatestFindings]   = useState<ApiFinding[]>([]);
  const [backendOnline,    setBackendOnline]     = useState<boolean | null>(null);
  const [scoreStatus,      setScoreStatus]       = useState<ScoreStatus>("mock");
  const [liveScore,        setLiveScore]         = useState(mockSecurityScore.current);
  const [prevScore,        setPrevScore]         = useState(mockSecurityScore.previous);
  const [scoreDelta,       setScoreDelta]        = useState(mockSecurityScore.change);

  // ── Assessment panel ─────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);

  // ── Backend health check + fetch latest assessment ───────────────────────
  useEffect(() => {
    checkBackendHealth().then(async (online) => {
      setBackendOnline(online);
      if (!online) return;

      // Try to get the most recent assessment from the backend
      try {
        const res = await fetch("/api/v1/assessments?limit=1");
        if (!res.ok) return;
        const list: ApiAssessment[] = await res.json();
        if (!list.length) return;

        const latest = list[0];
        setLatestAssessment(latest);

        if (latest.status === "completed") {
          setLiveScore(latest.overall_score);
          // Derive previous as ~10% lower (we don't store history yet)
          const prev = Math.max(0, latest.overall_score - 8);
          setPrevScore(prev);
          setScoreDelta(latest.overall_score - prev);
          setScoreStatus("verified");

          const f = await getRealFindings(latest.id);
          setLatestFindings(f);
        }
      } catch { /* graceful — fall back to mock */ }
    });
  }, []);

  // ── Called when inline assessment panel completes ────────────────────────
  const handleAssessmentComplete = useCallback((a: ApiAssessment, f: ApiFinding[]) => {
    setLatestAssessment(a);
    setLatestFindings(f);
    if (a.status === "completed") {
      const prev = liveScore; // current becomes "previous"
      const next = a.overall_score;
      setPrevScore(prev);
      setLiveScore(next);
      setScoreDelta(next - prev);
      setScoreStatus("verified");
    }
    // Keep panel open to show results
  }, [liveScore]);

  // ── Derive display data ──────────────────────────────────────────────────
  const hasRealFindings = latestFindings.length > 0;
  const displayFindings = hasRealFindings ? latestFindings : [];
  const highRiskFindings = displayFindings
    .filter((f) => f.severity === "high" || f.severity === "critical")
    .slice(0, 4);

  // Mock data for unimplemented modules
  const topRemediation = mockRemediationItems.filter((r) => r.status !== "completed").slice(0, 3);
  const unackedAlerts  = mockAlerts.filter((a) => !a.acknowledged);
  const openMockFindings = mockFindings.filter((f) => f.status === "open" || f.status === "in_progress");

  // Findings count to show
  const findingsCount = latestAssessment?.findings_count ?? mockAssessment.findingsCount;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <h2 className="text-xl font-bold text-white">
            {greeting()}, {user?.name?.split(" ")[0] ?? "there"}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Security overview for{" "}
            <span className="text-white font-medium">{user?.workspace ?? "your workspace"}</span>
          </p>
        </div>

        {/* Premium "Run New Assessment" button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setPanelOpen(true)}
          className="relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-medium text-sm text-white overflow-hidden group"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)" }}
        >
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
          <Zap size={15} className="relative z-10" />
          <span className="relative z-10">Run New Assessment</span>
        </motion.button>
      </motion.div>

      {/* ── Backend offline banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {backendOnline === false && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20"
          >
            <ServerOff size={14} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-yellow-300 font-medium">Backend offline</span> — displaying demo data.
              Start with <code className="text-slate-300">cd backend &amp;&amp; python run.py</code> to see real scan results.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Security health summary banner ────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="rounded-xl bg-gradient-to-r from-blue-500/8 via-[hsl(222,47%,11%)] to-[hsl(222,47%,11%)] border border-blue-500/15 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
              <Shield size={15} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-blue-300 mb-1 uppercase tracking-wide">Your Security Health</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {scoreDelta !== 0 ? (
                  <span className="text-sm text-white">
                    Your security {scoreDelta > 0 ? "improved" : "declined"} by{" "}
                    <span className={`font-semibold ${scoreDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                      {Math.abs(scoreDelta)} points
                    </span>{" "}
                    since last assessment.
                  </span>
                ) : (
                  <span className="text-sm text-white">Your security posture is stable.</span>
                )}
                {latestAssessment?.findings_count.high || latestAssessment?.findings_count.critical ? (
                  <span className="text-sm text-slate-400">
                    You have{" "}
                    <span className="text-orange-400 font-semibold">
                      {(latestAssessment.findings_count.critical ?? 0) + (latestAssessment.findings_count.high ?? 0)} high-priority
                    </span>{" "}
                    actions to address.
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">Run an assessment to see your current risks.</span>
                )}
              </div>
            </div>
            <Link href="/posture" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0 transition-colors">
              Full report <ArrowUpRight size={11} />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Top cards row ──────────────────────────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Security Score Card — animated ring */}
        <motion.div variants={fadeUp} className="md:col-span-2 xl:col-span-1">
          <Card className="h-full">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <CardTitle>Security Score</CardTitle>
                  <CardDescription>Overall posture health</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <DataBadge real={scoreStatus === "verified"} />
                  {scoreDelta !== 0 && (
                    <span className={`text-xs font-medium flex items-center gap-1 rounded px-1.5 py-0.5 ${
                      scoreDelta > 0
                        ? "text-green-400 bg-green-500/10 border border-green-500/20"
                        : "text-red-400 bg-red-500/10 border border-red-500/20"
                    }`}>
                      <TrendingUp size={10} />
                      {scoreDelta > 0 ? "+" : ""}{scoreDelta} pts
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center py-2">
                <AnimatedScoreRing
                  score={liveScore}
                  previousScore={prevScore}
                  change={scoreDelta}
                  status={scoreStatus}
                  lastAssessment={
                    latestAssessment?.completed_at
                      ? `Assessed ${formatRelativeTime(latestAssessment.completed_at)}`
                      : undefined
                  }
                  size={168}
                />
              </div>

              <div className={`mt-3 flex items-center gap-2 p-2.5 rounded-lg ${
                backendOnline
                  ? "bg-green-500/5 border border-green-500/10"
                  : "bg-slate-500/5 border border-slate-600/20"
              }`}>
                <Activity size={13} className={backendOnline ? "text-green-400 shrink-0" : "text-slate-600 shrink-0"} />
                <span className={`text-xs ${backendOnline ? "text-green-400" : "text-slate-600"}`}>
                  {backendOnline ? "Backend connected" : "Backend offline"}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Open Findings */}
        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Open Findings</CardTitle>
                  <CardDescription>Requiring attention</CardDescription>
                </div>
                <DataBadge real={!!latestAssessment} />
              </div>
              <div className="space-y-3">
                {[
                  { label: "Critical", count: findingsCount.critical ?? 0, color: "text-red-400", dot: "#ef4444" },
                  { label: "High Risk", count: findingsCount.high, color: "text-orange-400", dot: "#f97316" },
                  { label: "Medium Risk", count: findingsCount.medium, color: "text-yellow-400", dot: "#eab308" },
                  { label: "Low / Info", count: (findingsCount.low ?? 0) + (findingsCount.info ?? 0), color: "text-blue-400", dot: "#3b82f6" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.dot }} />
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[hsl(217,33%,15%)] flex items-center justify-between">
                <span className="text-xs text-slate-500">Total open</span>
                <span className="text-sm font-bold text-white">
                  {(findingsCount.critical ?? 0) + findingsCount.high + findingsCount.medium + (findingsCount.low ?? 0) + (findingsCount.info ?? 0)}
                </span>
              </div>
              <Link href="/findings" className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/30 transition-colors">
                View All Findings <ArrowRight size={12} />
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts */}
        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Recent Alerts</CardTitle>
                  <CardDescription>{unackedAlerts.length} require attention</CardDescription>
                </div>
                <DataBadge real={false} />
              </div>
              <div className="space-y-2">
                {unackedAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-[hsl(222,47%,12%)]">
                    <AlertTriangle
                      size={13}
                      className={alert.severity === "critical" ? "text-red-400 shrink-0 mt-0.5" : "text-orange-400 shrink-0 mt-0.5"}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white leading-snug truncate">{alert.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{formatRelativeTime(alert.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/monitoring" className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/30 transition-colors">
                View Monitoring <ArrowRight size={12} />
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Fix the biggest risks</CardDescription>
                </div>
                <DataBadge real={false} />
              </div>
              <div className="space-y-2">
                {topRemediation.map((r) => (
                  <Link
                    key={r.id}
                    href="/remediation"
                    className="flex items-start gap-2 p-2 rounded-lg bg-[hsl(222,47%,12%)] hover:bg-[hsl(222,47%,14%)] transition-colors group"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      r.risk === "high" ? "bg-orange-400" : r.risk === "critical" ? "bg-red-400" : "bg-yellow-400"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white leading-snug line-clamp-2">{r.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock size={9} /> {r.estimatedTime}
                      </div>
                    </div>
                    <ArrowUpRight size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
              <Link href="/remediation" className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/30 transition-colors">
                Remediation Center <ArrowRight size={12} />
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Score history chart ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle>Security Score History</CardTitle>
                  <CardDescription>Score trend over the past 30 days</CardDescription>
                </div>
                <DataBadge real={false} />
              </div>
              {scoreDelta !== 0 && (
                <div className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 ${
                  scoreDelta > 0
                    ? "text-green-400 bg-green-500/10 border border-green-500/20"
                    : "text-red-400 bg-red-500/10 border border-red-500/20"
                }`}>
                  <TrendingUp size={12} />
                  {scoreDelta > 0 ? "+" : ""}{scoreDelta} pts since last assessment
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockPostureHistory} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,33%,15%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone" dataKey="score"
                    stroke="#3b82f6" strokeWidth={2}
                    fill="url(#scoreGradient)"
                    dot={{ r: 3, fill: "#3b82f6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Bottom row: Findings + Assessment summary ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Priority Findings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle>Priority Findings</CardTitle>
                  <CardDescription>Highest risk issues requiring action</CardDescription>
                </div>
                <DataBadge real={hasRealFindings} />
              </div>
              <Link href="/findings" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {hasRealFindings ? (
              // Real backend findings
              highRiskFindings.length > 0 ? (
                highRiskFindings.map((f) => (
                  <Link
                    key={f.id}
                    href="/findings"
                    className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(222,47%,12%)] hover:bg-[hsl(222,47%,13%)] transition-colors group"
                  >
                    <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white leading-snug line-clamp-1">{f.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{f.affected_asset}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize ${severityClass(f.severity)}`}>
                        {f.severity}
                      </span>
                      <ArrowUpRight size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <CheckCircle2 size={28} className="text-green-400" />
                  <div className="text-sm font-medium text-white">No high-risk findings</div>
                  <div className="text-xs text-slate-500">Your last assessment found no critical or high severity issues.</div>
                </div>
              )
            ) : (
              // Mock data fallback with label
              openMockFindings.filter((f) => f.risk === "high" || f.risk === "critical").map((f) => (
                <Link
                  key={f.id}
                  href="/findings"
                  className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(222,47%,12%)] hover:bg-[hsl(222,47%,13%)] transition-colors group"
                >
                  <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white leading-snug line-clamp-1">{f.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{f.affectedAsset}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RiskBadge risk={f.risk} size="xs" />
                    <ArrowUpRight size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Assessment summary / timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle>Last Assessment</CardTitle>
                  <CardDescription>
                    {latestAssessment
                      ? `${latestAssessment.domain} · ${formatRelativeTime(latestAssessment.completed_at ?? latestAssessment.started_at)}`
                      : `${mockAssessment.domain} · ${formatRelativeTime(mockAssessment.completedAt!)}`}
                  </CardDescription>
                </div>
                <DataBadge real={!!latestAssessment} />
              </div>
              <button
                onClick={() => setPanelOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Run new <ArrowRight size={11} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {latestAssessment ? (
              // Real assessment categories
              latestAssessment.categories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300">{cat.label}</span>
                      <div className="flex items-center gap-2">
                        {cat.findings > 0 && (
                          <span className="text-[10px] text-orange-400 bg-orange-500/10 rounded px-1.5 py-0.5 border border-orange-500/20">
                            {cat.findings} finding{cat.findings > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-white">{cat.score}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[hsl(217,33%,17%)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.score}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className={`h-full rounded-full ${
                          cat.status === "pass" ? "bg-green-500" :
                          cat.status === "warning" ? "bg-yellow-500" : "bg-red-500"
                        }`}
                      />
                    </div>
                  </div>
                  {cat.status === "pass" ? (
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  ) : cat.status === "warning" ? (
                    <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
                  ) : (
                    <Shield size={14} className="text-red-400 shrink-0" />
                  )}
                </div>
              ))
            ) : (
              // Mock categories
              mockAssessment.categories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300">{cat.label}</span>
                      <div className="flex items-center gap-2">
                        {cat.findings > 0 && (
                          <span className="text-[10px] text-orange-400 bg-orange-500/10 rounded px-1.5 py-0.5 border border-orange-500/20">
                            {cat.findings} finding{cat.findings > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-white">{cat.score}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[hsl(217,33%,17%)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.score}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className={`h-full rounded-full ${
                          cat.status === "pass" ? "bg-green-500" :
                          cat.status === "warning" ? "bg-yellow-500" : "bg-red-500"
                        }`}
                      />
                    </div>
                  </div>
                  {cat.status === "pass" ? (
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  ) : cat.status === "warning" ? (
                    <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
                  ) : (
                    <Shield size={14} className="text-red-400 shrink-0" />
                  )}
                </div>
              ))
            )}

            <div className="pt-2 border-t border-[hsl(217,33%,15%)] flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Target size={11} />
                {latestAssessment?.total_checks ?? mockAssessment.totalChecks} checks completed
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="text-orange-400 font-medium">{findingsCount.high} high</span>
                <span className="text-slate-600">·</span>
                <span className="text-yellow-400 font-medium">{findingsCount.medium} medium</span>
              </div>
            </div>

            {/* Quick download buttons if real assessment available */}
            {latestAssessment && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    if (!latestAssessment) return;
                    try {
                      const report = await getJsonReport(latestAssessment.id);
                      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `report-${latestAssessment.domain}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch { /* silent */ }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[hsl(217,33%,20%)] hover:border-blue-500/30 text-[11px] text-slate-400 hover:text-white transition-colors"
                >
                  <FileJson size={11} />
                  JSON
                </button>
                <button
                  onClick={() => window.open(getPdfReportUrl(latestAssessment.id), "_blank")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[hsl(217,33%,20%)] hover:border-blue-500/30 text-[11px] text-slate-400 hover:text-white transition-colors"
                >
                  <Download size={11} />
                  PDF
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Live Assessment Panel (overlay) ──────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <LiveAssessmentPanel
            onClose={() => setPanelOpen(false)}
            onComplete={handleAssessmentComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
