"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Globe,
  ScanSearch,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ArrowRight,
  Loader2,
  X,
  Info,
  Download,
  FileJson,
  AlertCircle,
  ServerOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badges";
import { MiniScoreRing } from "@/components/ui/ScoreRing";
import {
  startRealAssessment,
  getRealAssessment,
  getRealFindings,
  getPdfReportUrl,
  getJsonReport,
  checkBackendHealth,
  type ApiAssessment,
  type ApiFinding,
  type ApiError,
} from "@/lib/services";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

// ── Scan step labels (shown during live polling) ───────────────────────────

const SCAN_STEPS = [
  "Validating domain...",
  "Checking exposed services (port scan)...",
  "Checking email configuration (SPF, DKIM, DMARC)...",
  "Checking SSL/TLS certificate...",
  "Checking security headers...",
  "Checking domain security (DNSSEC)...",
  "Analyzing findings...",
  "Generating recommendations...",
];

// ── Severity badge colour mapping ─────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
    high:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    low:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
    info:     "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };
  return (
    <span className={cn("text-xs font-medium border rounded-md px-2 py-1 capitalize", map[severity] ?? map.info)}>
      {severity}
    </span>
  );
}

// ── Backend status banner ─────────────────────────────────────────────────

function BackendBanner({ online }: { online: boolean | null }) {
  if (online === null) return null;
  if (online) return null; // only show when offline
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20"
    >
      <ServerOff size={14} className="text-yellow-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-yellow-300">Backend offline</p>
        <p className="text-xs text-slate-400 mt-0.5">
          The Neural Protocol backend is not reachable at <code className="text-yellow-400">localhost:8001</code>.
          Start it with <code className="text-slate-300">cd backend &amp;&amp; python run.py</code> to run real scans.
          Results below are from mock data.
        </p>
      </div>
    </motion.div>
  );
}

// ── Finding detail card ───────────────────────────────────────────────────

function FindingCard({ finding }: { finding: ApiFinding }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)] overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <SeverityBadge severity={finding.severity} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                {finding.category.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm font-medium text-white leading-snug">{finding.title}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{finding.what_we_found}</p>
          </div>
        </div>

        {finding.business_impact && (
          <div className="mt-3 p-2.5 rounded-lg bg-[hsl(222,47%,9%)] border border-[hsl(217,33%,14%)]">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Business impact</p>
            <p className="text-xs text-slate-300 leading-relaxed">{finding.business_impact}</p>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
          <span>Asset: <span className="text-slate-300">{finding.affected_asset}</span></span>
          <span>Confidence: <span className="text-slate-300">{finding.confidence}</span></span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? "Hide" : "Show"} technical details
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <pre className="mt-2 p-3 rounded-lg bg-[hsl(222,47%,8%)] text-[11px] text-slate-400 font-mono whitespace-pre-wrap leading-relaxed border border-[hsl(217,33%,13%)]">
                {finding.technical_details}
              </pre>
              {finding.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {finding.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(217,33%,15%)] text-slate-500">{t}</span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type UiState = "idle" | "submitting" | "polling" | "completed" | "failed";

export default function AssessmentsPage() {
  const [domain, setDomain] = useState("");
  const [uiState, setUiState] = useState<UiState>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [assessment, setAssessment] = useState<ApiAssessment | null>(null);
  const [findings, setFindings] = useState<ApiFinding[]>([]);
  const [error, setError] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const assessmentIdRef = useRef<string>("");

  // ── Check backend health on mount ───────────────────────────────────────
  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  // ── Step animation ticker (cosmetic — simulates progress during polling) ─
  const startStepTicker = useCallback(() => {
    setStepIndex(0);
    let idx = 0;
    stepIntervalRef.current = setInterval(() => {
      idx = Math.min(idx + 1, SCAN_STEPS.length - 1);
      setStepIndex(idx);
    }, 3500);
  }, []);

  const stopStepTicker = useCallback(() => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
    setStepIndex(SCAN_STEPS.length - 1);
  }, []);

  // ── Poll backend for status ─────────────────────────────────────────────
  const startPolling = useCallback((id: string) => {
    assessmentIdRef.current = id;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await getRealAssessment(id);
        setAssessment(data);
        if (data.status === "completed") {
          stopStepTicker();
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          const foundFindings = await getRealFindings(id);
          setFindings(foundFindings);
          setUiState("completed");
        } else if (data.status === "failed") {
          stopStepTicker();
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setError(data.error_message || "Assessment failed. Please try again.");
          setUiState("failed");
        }
      } catch (e) {
        // Transient network errors during polling — keep trying
        console.error("Poll error:", e);
      }
    }, 3000); // poll every 3 s
  }, [stopStepTicker]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, []);

  // ── Start scan ──────────────────────────────────────────────────────────
  async function handleStartScan() {
    const target = domain.trim();
    if (!target) return;
    setError("");
    setAssessment(null);
    setFindings([]);
    setUiState("submitting");

    try {
      const newAssessment = await startRealAssessment(target);
      setAssessment(newAssessment);
      setUiState("polling");
      startStepTicker();
      startPolling(newAssessment.id);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message || "Failed to start assessment. Is the backend running?");
      setUiState("failed");
    }
  }

  // ── Download handlers ───────────────────────────────────────────────────
  async function handleDownloadJson() {
    if (!assessment) return;
    setDownloadingJson(true);
    try {
      const report = await getJsonReport(assessment.id);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neural-protocol-report-${assessment.domain}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("JSON download error:", e);
    } finally {
      setDownloadingJson(false);
    }
  }

  function handleDownloadPdf() {
    if (!assessment) return;
    setDownloadingPdf(true);
    window.open(getPdfReportUrl(assessment.id), "_blank");
    setTimeout(() => setDownloadingPdf(false), 2000);
  }

  const isScanning = uiState === "submitting" || uiState === "polling";
  const progress = uiState === "completed"
    ? 100
    : uiState === "polling"
      ? Math.round(((stepIndex + 1) / SCAN_STEPS.length) * 90) // cap at 90 until done
      : uiState === "submitting"
        ? 5
        : 0;

  const totalFindings = assessment
    ? (assessment.findings_count.critical + assessment.findings_count.high +
       assessment.findings_count.medium + assessment.findings_count.low)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Assessments</h2>
          <p className="text-sm text-slate-400 mt-0.5">Scan your authorized business domains for real security issues</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(222,47%,13%)] hover:bg-[hsl(222,47%,16%)] border border-[hsl(217,33%,20%)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={14} /> Add Asset
        </button>
      </div>

      {/* Backend status */}
      <BackendBanner online={backendOnline} />

      {/* Scan Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Run Security Assessment</CardTitle>
          <CardDescription>
            Enter a domain you are authorized to scan. Real security checks will be performed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className={cn(
              "flex-1 flex items-center gap-2 bg-[hsl(222,47%,12%)] border rounded-lg px-3 py-2.5 transition-colors",
              error ? "border-red-500/40" : "border-[hsl(217,33%,17%)]"
            )}>
              <Globe size={15} className="text-slate-500 shrink-0" />
              <input
                value={domain}
                onChange={(e) => { setDomain(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && !isScanning && handleStartScan()}
                placeholder="e.g. your-business.com"
                disabled={isScanning}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
            <button
              onClick={handleStartScan}
              disabled={isScanning || !domain.trim()}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all",
                isScanning
                  ? "bg-blue-600/50 text-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              )}
            >
              {isScanning ? (
                <><Loader2 size={14} className="animate-spin" /> Scanning...</>
              ) : (
                <><ScanSearch size={14} /> Run Assessment</>
              )}
            </button>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && uiState === "failed" && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/8 border border-red-500/20"
              >
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-sm text-red-300">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authorization notice */}
          <div className="mt-3 flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Only enter domains you own or are explicitly authorized to scan.
              By running an assessment you confirm you have permission to do so.
            </p>
          </div>

          {/* Scan Progress */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 overflow-hidden"
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-300">
                      Scanning {assessment?.domain || domain}...
                    </span>
                    <span className="text-xs font-bold text-blue-400">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-[hsl(217,33%,15%)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {SCAN_STEPS.map((step, i) => {
                    const isDone = i < stepIndex;
                    const isCurrent = i === stepIndex;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: isDone || isCurrent ? 1 : 0.3, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs",
                          isDone && "bg-green-500/5",
                          isCurrent && "bg-blue-500/10"
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 size={13} className="text-blue-400 shrink-0 animate-spin" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-[hsl(217,33%,25%)] shrink-0" />
                        )}
                        <span className={isDone ? "text-slate-300" : isCurrent ? "text-blue-300" : "text-slate-600"}>
                          {step}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {assessment?.status === "running" && (
                  <p className="mt-3 text-[11px] text-slate-600 text-center">
                    Assessment ID: <code className="text-slate-500">{assessment.id}</code>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {assessment && (uiState === "completed" || uiState === "polling") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Assessment Results</h3>
                {uiState === "completed" && (
                  <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5">
                    Completed
                  </span>
                )}
                {uiState === "polling" && (
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Running
                  </span>
                )}
              </div>

              {/* Report download buttons */}
              {uiState === "completed" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadJson}
                    disabled={downloadingJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[hsl(222,47%,13%)] hover:bg-[hsl(222,47%,16%)] border border-[hsl(217,33%,20%)] rounded-lg transition-colors"
                  >
                    {downloadingJson ? <Loader2 size={12} className="animate-spin" /> : <FileJson size={12} />}
                    JSON Report
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600/80 hover:bg-blue-600 border border-blue-500/30 rounded-lg transition-colors"
                  >
                    {downloadingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    PDF Report
                  </button>
                </div>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Domain",   value: assessment.domain,                           icon: Globe,          color: "text-blue-400" },
                { label: "Checks",   value: `${assessment.total_checks}`,                icon: ScanSearch,     color: "text-slate-300" },
                { label: "Findings", value: `${totalFindings}`,                          icon: AlertTriangle,  color: "text-orange-400" },
                { label: "Score",    value: `${Math.round(assessment.overall_score)}/100`, icon: Shield,        color: "text-blue-400" },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <item.icon size={13} className="text-slate-500" />
                      <span className="text-xs text-slate-500">{item.label}</span>
                    </div>
                    <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Findings breakdown */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-500 mr-1">Findings breakdown:</span>
                  {assessment.findings_count.critical > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1">
                      {assessment.findings_count.critical} Critical
                    </span>
                  )}
                  {assessment.findings_count.high > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-md px-2 py-1">
                      {assessment.findings_count.high} High
                    </span>
                  )}
                  {assessment.findings_count.medium > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-2 py-1">
                      {assessment.findings_count.medium} Medium
                    </span>
                  )}
                  {assessment.findings_count.low > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-1">
                      {assessment.findings_count.low} Low
                    </span>
                  )}
                  {totalFindings === 0 && uiState === "completed" && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-2 py-1">
                      No findings — all checks passed
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category results */}
            {assessment.categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Categories</CardTitle>
                  <CardDescription>
                    {assessment.completed_at
                      ? `Completed ${formatDate(assessment.completed_at)}`
                      : "Scan in progress..."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {assessment.categories.map((cat, idx) => (
                      <motion.div
                        key={cat.category}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-4 p-3 rounded-xl bg-[hsl(222,47%,12%)]"
                      >
                        <MiniScoreRing score={cat.score} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">{cat.label}</span>
                            {cat.findings > 0 && (
                              <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-1.5 py-0.5">
                                {cat.findings} finding{cat.findings > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 bg-[hsl(217,33%,17%)] rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700",
                                cat.status === "pass" ? "bg-green-500" :
                                cat.status === "warning" ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${cat.score}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{cat.checks_run} checks run</div>
                        </div>
                        <StatusBadge status={cat.status as "pass" | "warning" | "fail"} />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Real findings */}
            {findings.length > 0 && uiState === "completed" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">
                    Findings <span className="text-slate-500 font-normal text-sm">({findings.length})</span>
                  </h3>
                  <Link href="/findings" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    View full findings <ArrowRight size={12} />
                  </Link>
                </div>
                {findings.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Domain Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,18%)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-white">Add New Asset</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Add an authorized domain to assess</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Domain</label>
                  <div className="flex items-center gap-2 bg-[hsl(222,47%,12%)] border border-[hsl(217,33%,17%)] rounded-lg px-3 py-2.5">
                    <Globe size={14} className="text-slate-500" />
                    <input
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="example-business.com"
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                  <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    Only add domains that you own or are authorized to scan. Real security checks will be performed.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 text-sm text-slate-400 hover:text-white border border-[hsl(217,33%,20%)] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setDomain(newDomain); setShowAddModal(false); }}
                    className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  >
                    Use This Domain
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
