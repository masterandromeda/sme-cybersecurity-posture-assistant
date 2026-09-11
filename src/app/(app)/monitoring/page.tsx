"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Bell,
  BellOff,
  Clock,
  Globe,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badges";
import { mockAlerts, mockAssets, mockTimelineEvents } from "@/lib/mock-data";
import type { TimelineEvent } from "@/lib/mock-data";
import { cn, formatRelativeTime } from "@/lib/utils";

// ─── New Exposure Alert Card ───────────────────────────────────────────────
function ExposureAlert() {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-orange-500/30 bg-orange-500/5 overflow-hidden"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Zap size={17} className="text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-orange-300">New exposure detected</span>
            <span className="text-[10px] font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5 uppercase tracking-wide">
              Active Alert
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">
            A service that was <strong>not present during the previous assessment</strong> is now publicly reachable on your server.
          </p>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  {/* Before → After comparison */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-3 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)]">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Before (Aug 22)</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-slate-300">Port 8080 — closed</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-slate-300">Port 22 — restricted</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-500 shrink-0" />
                    <div className="flex-1 p-3 rounded-lg bg-[hsl(222,47%,11%)] border border-orange-500/20">
                      <div className="text-[10px] font-semibold text-orange-500/70 uppercase tracking-wide mb-1.5">Now (Today)</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-xs text-orange-300 font-medium">Port 8080 — open ⚠</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-slate-300">Port 22 — restricted</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Port 8080 was not open during the last full assessment on August 22nd. This may indicate a newly deployed service, a configuration change, or unauthorized access. Investigate before the next scheduled check.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-semibold border border-orange-500/30 rounded-lg transition-colors">
                      <ArrowUpRight size={12} /> Investigate
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(222,47%,13%)] hover:bg-[hsl(222,47%,16%)] text-slate-300 text-xs font-medium border border-[hsl(217,33%,20%)] rounded-lg transition-colors">
                      View Details
                    </button>
                    <button
                      onClick={() => setDismissed(true)}
                      className="ml-auto text-xs text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white transition-colors shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────
import type { LucideIcon } from "lucide-react";
const typeConfig: Record<TimelineEvent["type"], { icon: LucideIcon; color: string; dot: string }> = {
  assessment: { icon: CheckCircle2, color: "text-blue-400", dot: "bg-blue-500" },
  finding: { icon: AlertTriangle, color: "text-orange-400", dot: "bg-orange-500" },
  resolved: { icon: CheckCircle2, color: "text-green-400", dot: "bg-green-500" },
  change: { icon: RefreshCw, color: "text-yellow-400", dot: "bg-yellow-500" },
  alert: { icon: Zap, color: "text-red-400", dot: "bg-red-500" },
  improvement: { icon: TrendingUp, color: "text-green-400", dot: "bg-green-500" },
};

function groupByDate(events: TimelineEvent[]) {
  const groups: Record<string, TimelineEvent[]> = {};
  events.forEach((e) => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatTimelineDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = typeConfig[event.type];
  const Icon = cfg.icon;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${event.type === "alert" ? "border-red-500/50 bg-red-500/10" : event.type === "improvement" || event.type === "resolved" ? "border-green-500/50 bg-green-500/10" : "border-[hsl(217,33%,25%)] bg-[hsl(222,47%,11%)]"}`}>
          <Icon size={11} className={cfg.color} />
        </div>
        <div className="flex-1 w-px bg-[hsl(217,33%,17%)] mt-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start gap-2 -mt-0.5">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-white">{event.label}</span>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{event.description}</p>

            {/* Score change */}
            {(event.scoreBefore !== undefined || event.scoreAfter !== undefined) && (
              <div className="flex items-center gap-2 mt-2">
                {event.scoreBefore !== undefined && (
                  <span className="text-[11px] text-slate-500 bg-[hsl(222,47%,12%)] border border-[hsl(217,33%,17%)] rounded px-2 py-0.5">
                    Before: <span className="font-bold text-slate-300">{event.scoreBefore}</span>
                  </span>
                )}
                {event.scoreBefore !== undefined && event.scoreAfter !== undefined && (
                  <ArrowRight size={11} className="text-slate-600" />
                )}
                {event.scoreAfter !== undefined && (
                  <span className={`text-[11px] rounded px-2 py-0.5 border ${event.scoreBefore !== undefined && event.scoreAfter > event.scoreBefore ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-blue-400 bg-blue-500/10 border-blue-500/20"}`}>
                    After: <span className="font-bold">{event.scoreAfter}</span>
                  </span>
                )}
              </div>
            )}

            {event.details && (
              <>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1.5 text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  {expanded ? "Hide details" : "Show details"}
                  {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-mono bg-[hsl(222,47%,9%)] rounded-lg p-2 border border-[hsl(217,33%,14%)]">
                        {event.details}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [monitoringOn, setMonitoringOn] = useState(true);
  const [lastCheck] = useState("10 minutes ago");
  const [nextCheck] = useState("Tomorrow at 10:00");

  function acknowledge(id: string) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
  }

  const unacked = alerts.filter((a) => !a.acknowledged);
  const grouped = groupByDate(mockTimelineEvents);

  return (
    <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Monitoring</h2>
          <p className="text-sm text-slate-400 mt-0.5">Continuous surveillance of your security posture</p>
        </div>
        <button
          onClick={() => setMonitoringOn(!monitoringOn)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
            monitoringOn
              ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/15"
              : "bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/15"
          )}
        >
          {monitoringOn ? <><Bell size={14} /> Monitoring Active</> : <><BellOff size={14} /> Monitoring Paused</>}
        </button>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Status", value: monitoringOn ? "Active" : "Paused", icon: Activity, color: monitoringOn ? "text-green-400" : "text-slate-400", dot: monitoringOn },
          { label: "Last Check", value: lastCheck, icon: Clock, color: "text-slate-300", dot: false },
          { label: "Next Check", value: nextCheck, icon: RefreshCw, color: "text-blue-400", dot: false },
          { label: "Active Alerts", value: String(unacked.length), icon: AlertTriangle, color: unacked.length > 0 ? "text-orange-400" : "text-green-400", dot: false },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon size={13} className="text-slate-500" />
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${s.color}`}>
                {s.dot && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assets monitored */}
      <Card>
        <CardHeader>
          <CardTitle>Assets Under Monitoring</CardTitle>
          <CardDescription>Continuously scanned for exposure changes</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Website", icon: Globe, ok: true },
              { label: "Domain", icon: Globe, ok: true },
              { label: "Email", icon: Globe, ok: false },
              { label: "Cloud", icon: Server, ok: true },
              { label: "Services", icon: Activity, ok: true },
            ].map((a) => (
              <div
                key={a.label}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center",
                  a.ok
                    ? "bg-green-500/5 border-green-500/15"
                    : "bg-orange-500/5 border-orange-500/15"
                )}
              >
                <a.icon size={16} className={a.ok ? "text-green-400" : "text-orange-400"} />
                <span className="text-xs font-medium text-slate-300">{a.label}</span>
                <span className={`text-[10px] ${a.ok ? "text-green-400" : "text-orange-400"}`}>
                  {a.ok ? "✓ OK" : "⚠ Issue"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Exposure Alert */}
      <AnimatePresence>
        <ExposureAlert />
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Security Alerts</CardTitle>
                <CardDescription>{unacked.length} requiring attention</CardDescription>
              </div>
              {unacked.length > 0 && (
                <button
                  onClick={() => setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })))}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Eye size={11} /> Acknowledge all
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {alerts.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={32} className="text-green-500/30 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No active alerts</p>
              </div>
            ) : (
              alerts.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                    alert.acknowledged
                      ? "bg-[hsl(222,47%,11%)] border-[hsl(217,33%,15%)] opacity-50"
                      : "bg-[hsl(222,47%,12%)] border-[hsl(217,33%,18%)]"
                  )}
                >
                  <AlertTriangle
                    size={14}
                    className={cn(
                      "shrink-0 mt-0.5",
                      alert.severity === "critical" ? "text-red-400" :
                      alert.severity === "high" ? "text-orange-400" : "text-yellow-400"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 justify-between">
                      <div>
                        <div className="text-xs font-medium text-white">{alert.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{alert.description}</div>
                      </div>
                      <RiskBadge risk={alert.severity} size="xs" />
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Server size={9} /> {alert.asset}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock size={9} /> {formatRelativeTime(alert.timestamp)}
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledge(alert.id)}
                          className="ml-auto text-[10px] text-slate-400 hover:text-white border border-[hsl(217,33%,20%)] rounded px-2 py-0.5 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Security Timeline</CardTitle>
            <CardDescription>Recent security events and changes</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 max-h-[480px] overflow-y-auto pr-2">
            {grouped.map(([date, events]) => (
              <div key={date} className="mb-2">
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-[hsl(222,47%,10%)] py-1 z-10">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {formatTimelineDate(date)}
                  </span>
                  <div className="flex-1 h-px bg-[hsl(217,33%,17%)]" />
                </div>
                {events.map((e) => (
                  <TimelineItem key={e.id} event={e} />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Monitored Assets table */}
      <Card>
        <CardHeader>
          <CardTitle>Monitored Assets</CardTitle>
          <CardDescription>{mockAssets.length} assets under continuous surveillance</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(217,33%,15%)]">
                  {["Asset", "Type", "Risk", "Findings", "Last Scanned", ""].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide py-2 px-3 first:pl-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(217,33%,13%)]">
                {mockAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 first:pl-0">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        <span className="font-medium text-white">{asset.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 capitalize">{asset.type.replace("_", " ")}</td>
                    <td className="py-3 px-3"><RiskBadge risk={asset.riskLevel} size="xs" /></td>
                    <td className="py-3 px-3">
                      {asset.findingsCount > 0 ? (
                        <span className="text-orange-400 font-semibold">{asset.findingsCount}</span>
                      ) : (
                        <span className="text-green-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{formatRelativeTime(asset.lastScanned)}</td>
                    <td className="py-3 px-3">
                      <button className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                        View <ArrowRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
