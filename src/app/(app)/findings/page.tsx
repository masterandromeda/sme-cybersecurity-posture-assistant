"use client";

/**
 * Findings page
 *
 * Data sources:
 *   REAL  — Findings fetched from latest completed backend assessment
 *   MOCK  — Falls back to mock data when backend is offline or no scan exists
 *
 * The page adapts to both data shapes (ApiFinding / Finding).
 * A "Real Data" / "Demo Data" badge always makes the source explicit.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  X,
  ArrowRight,
  Globe,
  Mail,
  Server,
  Cloud,
  Info,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  ServerOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge, StatusBadge } from "@/components/ui/badges";
import { mockFindings } from "@/lib/mock-data";
import {
  checkBackendHealth,
  getRealFindings,
  type ApiFinding,
} from "@/lib/services";
import { cn, riskLabel, formatRelativeTime } from "@/lib/utils";
import type { RiskLevel } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const assetIconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  domain:        Globe,
  subdomain:     Globe,
  email:         Mail,
  cloud_account: Cloud,
  vendor:        Building2,
  ip:            Server,
};

const categoryLabels: Record<string, string> = {
  exposed_services: "Exposed Services",
  domain_security:  "Domain Security",
  email_security:   "Email Security",
  ssl_tls:          "SSL / TLS",
  security_headers: "Security Headers",
  patch_hygiene:    "Patch Hygiene",
  account_hygiene:  "Account Hygiene",
};

function severityToRisk(s: string): RiskLevel {
  const m: Record<string, RiskLevel> = {
    critical: "critical",
    high:     "high",
    medium:   "medium",
    low:      "low",
    info:     "info",
  };
  return m[s] ?? "info";
}

// ── Data-source badge ─────────────────────────────────────────────────────────

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

// ── Real Finding card (ApiFinding shape from backend) ─────────────────────────

function RealFindingCard({ finding }: { finding: ApiFinding }) {
  const [expanded,     setExpanded]     = useState(false);
  const [techExpanded, setTechExpanded] = useState(false);
  const risk   = severityToRisk(finding.severity);
  const Icon   = assetIconMap[finding.asset_type] ?? Globe;

  const riskBg = {
    critical: "bg-red-500/10",
    high:     "bg-orange-500/10",
    medium:   "bg-yellow-500/10",
    low:      "bg-green-500/10",
    info:     "bg-blue-500/10",
  }[risk];

  const riskText = {
    critical: "text-red-400",
    high:     "text-orange-400",
    medium:   "text-yellow-400",
    low:      "text-green-400",
    info:     "text-blue-400",
  }[risk];

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card hover className="overflow-hidden">
        <CardContent className="pt-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", riskBg)}>
              <AlertTriangle size={15} className={riskText} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white leading-snug flex-1 min-w-0">{finding.title}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <RiskBadge risk={risk} size="xs" />
                  <span className={cn(
                    "text-[10px] font-medium border rounded px-1.5 py-0.5 capitalize",
                    finding.status === "open"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : finding.status === "resolved"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  )}>
                    {finding.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-1">
                  <Icon size={11} />
                  <span>{finding.affected_asset}</span>
                </div>
                <span className="text-[hsl(217,33%,30%)]">·</span>
                <span>{categoryLabels[finding.category] ?? finding.category.replace("_", " ")}</span>
                {finding.cvss && (
                  <>
                    <span className="text-[hsl(217,33%,30%)]">·</span>
                    <span className="text-orange-400 font-medium">CVSS {finding.cvss}</span>
                  </>
                )}
                <span className="text-[hsl(217,33%,30%)]">·</span>
                <div className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelativeTime(finding.detected_at)}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <div className={cn(
                  "text-[10px] font-medium rounded px-1.5 py-0.5 border",
                  finding.confidence === "high"   ? "bg-green-500/10 text-green-400 border-green-500/20" :
                  finding.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                                    "bg-slate-500/10 text-slate-400 border-slate-500/20"
                )}>
                  {finding.confidence} confidence
                </div>
                {finding.cve && (
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                    {finding.cve}
                  </span>
                )}
                {finding.tags.map((t) => (
                  <span key={t} className="text-[10px] text-slate-500 bg-slate-500/8 border border-slate-600/20 rounded px-1.5 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {/* Plain-language summary (always visible) */}
          <div className="mt-3 ml-11 text-sm text-slate-400 leading-relaxed">
            {finding.what_we_found}
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 ml-11 space-y-4">
                  {/* Why it matters */}
                  <div className="p-3 rounded-xl bg-[hsl(222,47%,12%)] border border-[hsl(217,33%,17%)]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Info size={12} className="text-blue-400" />
                      <span className="text-xs font-semibold text-slate-300">Why it matters</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{finding.why_it_matters}</p>
                  </div>

                  {/* Business impact */}
                  <div className={cn(
                    "p-3 rounded-xl border",
                    risk === "critical" ? "bg-red-500/5 border-red-500/15" :
                    risk === "high"     ? "bg-orange-500/5 border-orange-500/15" :
                                         "bg-yellow-500/5 border-yellow-500/15"
                  )}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle size={12} className={riskText} />
                      <span className="text-xs font-semibold text-slate-300">Business impact</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{finding.business_impact}</p>
                  </div>

                  {/* Technical details (collapsible) */}
                  <div>
                    <button
                      onClick={() => setTechExpanded(!techExpanded)}
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-left"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        techExpanded ? "border-blue-500/40 bg-blue-500/10" : "border-[hsl(217,33%,25%)]"
                      )}>
                        {techExpanded ? <ChevronUp size={10} className="text-blue-400" /> : <ChevronDown size={10} />}
                      </div>
                      Technical details
                      <span className="text-[10px] bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded px-1.5 py-0.5 ml-1">
                        Advanced
                      </span>
                    </button>
                    <AnimatePresence>
                      {techExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 p-3 rounded-xl bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,14%)] font-mono text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {finding.technical_details}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href="/remediation"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      View Fix Steps <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Mock Finding card (existing mock data shape) ──────────────────────────────

function MockFindingCard({ finding }: { finding: (typeof mockFindings)[number] }) {
  const [expanded,     setExpanded]     = useState(false);
  const [techExpanded, setTechExpanded] = useState(false);
  const Icon = assetIconMap[finding.assetType] ?? Globe;

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card hover className="overflow-hidden">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              finding.risk === "critical" ? "bg-red-500/10" :
              finding.risk === "high"     ? "bg-orange-500/10" :
              finding.risk === "medium"   ? "bg-yellow-500/10" : "bg-green-500/10"
            )}>
              <AlertTriangle size={15} className={
                finding.risk === "critical" ? "text-red-400" :
                finding.risk === "high"     ? "text-orange-400" :
                finding.risk === "medium"   ? "text-yellow-400" : "text-green-400"
              } />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white leading-snug flex-1 min-w-0">{finding.title}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <RiskBadge risk={finding.risk} size="xs" />
                  <StatusBadge status={finding.status} />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-1">
                  <Icon size={11} />
                  <span>{finding.affectedAsset}</span>
                </div>
                <span className="text-[hsl(217,33%,30%)]">·</span>
                <span>{categoryLabels[finding.category] ?? finding.category}</span>
                {finding.cvss && (
                  <>
                    <span className="text-[hsl(217,33%,30%)]">·</span>
                    <span className="text-orange-400 font-medium">CVSS {finding.cvss}</span>
                  </>
                )}
                <span className="text-[hsl(217,33%,30%)]">·</span>
                <div className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelativeTime(finding.discoveredAt)}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <div className={cn(
                  "text-[10px] font-medium rounded px-1.5 py-0.5 border",
                  finding.confidence === "high"   ? "bg-green-500/10 text-green-400 border-green-500/20" :
                  finding.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                                    "bg-slate-500/10 text-slate-400 border-slate-500/20"
                )}>
                  {finding.confidence} confidence
                </div>
                {finding.cve && (
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                    {finding.cve}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          <div className="mt-3 ml-11 text-sm text-slate-400 leading-relaxed">{finding.whatWeFound}</div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 ml-11 space-y-4">
                  <div className="p-3 rounded-xl bg-[hsl(222,47%,12%)] border border-[hsl(217,33%,17%)]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Info size={12} className="text-blue-400" />
                      <span className="text-xs font-semibold text-slate-300">Why it matters</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{finding.whyItMatters}</p>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border",
                    finding.risk === "critical" ? "bg-red-500/5 border-red-500/15" :
                    finding.risk === "high"     ? "bg-orange-500/5 border-orange-500/15" :
                                                 "bg-yellow-500/5 border-yellow-500/15"
                  )}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle size={12} className={
                        finding.risk === "critical" ? "text-red-400" :
                        finding.risk === "high"     ? "text-orange-400" : "text-yellow-400"
                      } />
                      <span className="text-xs font-semibold text-slate-300">Business impact</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{finding.businessImpact}</p>
                  </div>

                  <div>
                    <button
                      onClick={() => setTechExpanded(!techExpanded)}
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-left"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        techExpanded ? "border-blue-500/40 bg-blue-500/10" : "border-[hsl(217,33%,25%)]"
                      )}>
                        {techExpanded ? <ChevronUp size={10} className="text-blue-400" /> : <ChevronDown size={10} />}
                      </div>
                      Technical details
                      <span className="text-[10px] bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded px-1.5 py-0.5 ml-1">Advanced</span>
                    </button>
                    <AnimatePresence>
                      {techExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 p-3 rounded-xl bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,14%)] font-mono text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {finding.technicalDetails}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href="/remediation"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      View Fix Steps <ArrowRight size={12} />
                    </a>
                    {finding.status === "open" && (
                      <button className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(217,33%,20%)] text-slate-400 hover:text-white text-xs rounded-lg transition-colors">
                        <CheckCircle2 size={12} /> Accept Risk
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type SeverityFilter = RiskLevel | "all";

export default function FindingsPage() {
  const [search,       setSearch]       = useState("");
  const [filterRisk,   setFilterRisk]   = useState<SeverityFilter>("all");

  // Real data state
  const [realFindings, setRealFindings] = useState<ApiFinding[] | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Fetch real findings on mount
  useEffect(() => {
    checkBackendHealth().then(async (online) => {
      setBackendOnline(online);
      if (!online) { setLoading(false); return; }

      try {
        const res = await fetch("/api/v1/assessments?limit=1");
        if (!res.ok) { setLoading(false); return; }
        const list: Array<{ id: string; status: string }> = await res.json();
        const latest = list.find((a) => a.status === "completed");
        if (!latest) { setLoading(false); return; }

        const findings = await getRealFindings(latest.id);
        setRealFindings(findings);
      } catch { /* fallback to mock */ }
      finally { setLoading(false); }
    });
  }, []);

  const hasReal = realFindings !== null && realFindings.length > 0;

  // ── Filter real findings ─────────────────────────────────────────────────
  const filteredReal = (realFindings ?? []).filter((f) => {
    const matchSearch = !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.affected_asset.toLowerCase().includes(search.toLowerCase()) ||
      f.technical_title?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = filterRisk === "all" || f.severity === filterRisk;
    return matchSearch && matchRisk;
  });

  // ── Filter mock findings ─────────────────────────────────────────────────
  const filteredMock = mockFindings.filter((f) => {
    const matchSearch = !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.affectedAsset.toLowerCase().includes(search.toLowerCase()) ||
      f.technicalTitle.toLowerCase().includes(search.toLowerCase());
    const matchRisk = filterRisk === "all" || f.risk === filterRisk;
    return matchSearch && matchRisk;
  });

  // ── Risk count badges ─────────────────────────────────────────────────────
  const riskCounts: Record<string, number> = {};
  if (hasReal) {
    realFindings.forEach((f) => { riskCounts[f.severity] = (riskCounts[f.severity] ?? 0) + 1; });
  } else {
    mockFindings.forEach((f) => { riskCounts[f.risk] = (riskCounts[f.risk] ?? 0) + 1; });
  }

  const totalCount  = hasReal ? (realFindings?.length ?? 0) : mockFindings.length;
  const shownCount  = hasReal ? filteredReal.length : filteredMock.length;

  return (
    <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Security Findings</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Plain-language explanations of every issue — no jargon required
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DataBadge real={hasReal} />
          {(["critical", "high", "medium", "low"] as RiskLevel[]).map((r) =>
            (riskCounts[r] ?? 0) > 0 ? (
              <div
                key={r}
                className={cn(
                  "text-xs font-medium rounded-md px-2 py-1 border",
                  r === "critical" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  r === "high"     ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                  r === "medium"   ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                     "bg-green-500/10 text-green-400 border-green-500/20"
                )}
              >
                {riskCounts[r]} {riskLabel(r)}
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* ── Backend offline banner ─────────────────────────────────────── */}
      {backendOnline === false && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20"
        >
          <ServerOff size={14} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-yellow-300 font-medium">Backend offline</span> — showing demo findings.
            Start with <code className="text-slate-300">cd backend &amp;&amp; python run.py</code> and run an assessment to see real findings.
          </p>
        </motion.div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)] rounded-lg px-2.5 py-2 flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search findings..."
            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none flex-1"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={12} className="text-slate-500 hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-slate-500" />
          <span className="text-xs text-slate-500">Severity:</span>
        </div>
        {(["all", "critical", "high", "medium", "low"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setFilterRisk(r)}
            className={cn(
              "text-xs px-2.5 py-1.5 rounded-lg border transition-colors capitalize",
              filterRisk === r
                ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                : "border-[hsl(217,33%,17%)] text-slate-400 hover:text-white hover:border-[hsl(217,33%,25%)]"
            )}
          >
            {r === "all" ? "All" : riskLabel(r as RiskLevel)}
          </button>
        ))}
      </div>

      {/* ── Results count ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {loading ? (
          <span className="flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" />
            Loading findings…
          </span>
        ) : (
          <span>Showing {shownCount} of {totalCount} findings</span>
        )}
      </div>

      {/* ── Findings list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={28} className="animate-spin text-blue-400" />
          <div className="text-sm text-slate-400">Loading findings from backend…</div>
        </div>
      ) : (
        <motion.div layout className="space-y-3">
          {hasReal ? (
            filteredReal.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <CheckCircle2 size={36} className="mx-auto mb-3 text-green-500/30" />
                <div className="text-sm font-medium text-slate-400">No findings match your filters</div>
              </div>
            ) : (
              filteredReal.map((f) => <RealFindingCard key={f.id} finding={f} />)
            )
          ) : (
            filteredMock.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <CheckCircle2 size={36} className="mx-auto mb-3 text-green-500/30" />
                <div className="text-sm font-medium text-slate-400">No findings match your filters</div>
              </div>
            ) : (
              filteredMock.map((f) => <MockFindingCard key={f.id} finding={f} />)
            )
          )}
        </motion.div>
      )}
    </div>
  );
}
