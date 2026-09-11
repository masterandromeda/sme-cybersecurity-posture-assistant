"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  mockPostureHistory,
  mockPostureHistory90,
  mockPostureHistory6m,
  mockSecurityScore,
  mockAssessment,
  mockFindings,
} from "@/lib/mock-data";
import { scoreColor } from "@/lib/utils";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Range = "30d" | "90d" | "6m";

const historyMap: Record<Range, typeof mockPostureHistory> = {
  "30d": mockPostureHistory,
  "90d": mockPostureHistory90,
  "6m": mockPostureHistory6m,
};

const radarData = mockAssessment.categories.map((c) => ({
  subject: c.label.replace(" Security", "").replace(" Hygiene", ""),
  score: c.score,
  fullMark: 100,
}));

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)] rounded-lg px-3 py-2 text-xs">
        <div className="text-slate-400">{label}</div>
        <div className="text-white font-semibold">Score: {payload[0].value}</div>
      </div>
    );
  }
  return null;
};

const categoryScores = [
  { label: "Email Security", score: 45, change: +12, icon: "✉" },
  { label: "Access Control", score: 78, change: +8, icon: "🔑" },
  { label: "External Exposure", score: 72, change: +5, icon: "🌐" },
  { label: "Account Hygiene", score: 55, change: +18, icon: "👤" },
  { label: "Configuration", score: 88, change: +3, icon: "⚙" },
];

const improvements = [
  "MFA enabled on sarah@acmecorp.com (administrator account)",
  "Old contractor account removed from cloud platform",
  "Email configuration updated — SPF record partially improved",
];

export default function PosturePage() {
  const [range, setRange] = useState<Range>("30d");
  const score = mockSecurityScore;
  const data = historyMap[range];
  const openHigh = mockFindings.filter((f) => f.risk === "high" && (f.status === "open" || f.status === "in_progress")).length;
  const openMedium = mockFindings.filter((f) => f.risk === "medium" && (f.status === "open" || f.status === "in_progress")).length;

  return (
    <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white">Security Posture</h2>
        <p className="text-sm text-slate-400 mt-0.5">A complete view of your security health over time</p>
      </div>

      {/* Top row: Score + Grade + Category breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Score */}
        <Card>
          <CardContent className="pt-5 flex flex-col items-center text-center">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Overall Score</div>
            <ScoreRing score={score.current} />
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1 flex items-center gap-1">
                <TrendingUp size={11} /> +{score.change} pts this month
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2">+22 points since onboarding</div>
          </CardContent>
        </Card>

        {/* Category scores */}
        <Card>
          <CardContent className="pt-5 space-y-2.5">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Category Scores</div>
            {categoryScores.map((cat) => (
              <div key={cat.label} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 w-28 shrink-0 truncate">{cat.label}</span>
                <div className="flex-1 h-1.5 bg-[hsl(217,33%,17%)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.score}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${
                      cat.score >= 80 ? "bg-green-500" :
                      cat.score >= 65 ? "bg-blue-500" :
                      cat.score >= 50 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                  />
                </div>
                <span className={`text-[11px] font-bold w-6 text-right ${scoreColor(cat.score)}`}>{cat.score}</span>
                <span className="text-[10px] text-green-400 w-8 text-right">+{cat.change}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* What improved + needs attention */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-green-400" /> What Improved
              </div>
              <div className="space-y-1.5">
                {improvements.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={12} className="text-green-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-400 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-[hsl(217,33%,15%)]">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-orange-400" /> Still Needs Attention
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="text-xs text-slate-400">{openHigh} high-risk finding{openHigh !== 1 ? "s" : ""} open</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                  <span className="text-xs text-slate-400">{openMedium} medium-risk finding{openMedium !== 1 ? "s" : ""} open</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score history chart with tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Score History</CardTitle>
              <CardDescription>Security score trend over time</CardDescription>
            </div>
            <div className="flex gap-1 p-0.5 bg-[hsl(222,47%,12%)] rounded-lg border border-[hsl(217,33%,17%)]">
              {(["30d", "90d", "6m"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    range === r ? "bg-blue-500/20 text-blue-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {r === "30d" ? "30 Days" : r === "90d" ? "90 Days" : "6 Months"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Journey milestones */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {data.map((pt, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                <span className={`text-xs font-bold ${scoreColor(pt.score)}`}>{pt.score}</span>
                {i < data.length - 1 && <ArrowRight size={10} className="text-slate-600" />}
              </div>
            ))}
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,33%,15%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[30, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="url(#scoreGrad3)" dot={{ r: 3, fill: "#3b82f6" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Radar + grade history */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Security Radar</CardTitle>
            <CardDescription>Coverage across all security categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="hsl(217,33%,17%)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assessment History</CardTitle>
            <CardDescription>Score at each completed assessment</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {[
                { date: "Sep 10, 2025", score: 82, grade: "B", findings: 6, change: +14 },
                { date: "Sep 1, 2025", score: 68, grade: "C", findings: 10, change: +8 },
                { date: "Aug 1, 2025", score: 60, grade: "C", findings: 14, change: +10 },
                { date: "Jul 1, 2025", score: 50, grade: "D", findings: 18, change: null },
              ].map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(222,47%,12%)]"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${scoreColor(a.score)} bg-[hsl(222,47%,14%)]`}>
                    {a.grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-xs font-semibold text-white">{a.date}</span>
                      {a.change !== null && (
                        <span className="text-[10px] text-green-400 bg-green-500/10 rounded px-1.5 py-0.5">+{a.change} pts</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-bold ${scoreColor(a.score)}`}>{a.score}/100</span>
                      <span className="text-[10px] text-slate-500">·</span>
                      <span className="text-[10px] text-slate-500">{a.findings} findings</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
