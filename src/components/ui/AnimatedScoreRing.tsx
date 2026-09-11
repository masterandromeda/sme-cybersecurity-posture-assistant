"use client";

/**
 * AnimatedScoreRing — premium animated security score visualization.
 *
 * Features:
 * - Arc draws from 0 → target score on mount (ease-out quart)
 * - Counter counts up from 0 → score
 * - Subtle glow behind arc
 * - Delta badge showing +N / -N pts
 * - Status label: VERIFIED / CALCULATING / DEMO DATA / NOT YET ASSESSED
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { scoreStrokeColor, scoreColor } from "@/lib/utils";

// ── helpers ─────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Count-up hook — animates from 0 to `target` over `duration` ms */
function useCountUp(target: number, duration = 1300): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let raf: number;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(lerp(0, target, eased)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/** Arc-progress hook — same easing but returns raw float for SVG dashOffset */
function useArcProgress(target: number, duration = 1200): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let raf: number;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
      setProgress(eased * target);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return progress;
}

// ── types ────────────────────────────────────────────────────────────────────

export type ScoreStatus = "verified" | "calculating" | "not_assessed" | "mock";

interface AnimatedScoreRingProps {
  score: number;
  previousScore?: number;
  change?: number;
  status?: ScoreStatus;
  lastAssessment?: string;
  size?: number;
  strokeWidth?: number;
}

const STATUS_LABELS: Record<ScoreStatus, string> = {
  verified:     "VERIFIED",
  calculating:  "CALCULATING",
  not_assessed: "NOT YET ASSESSED",
  mock:         "DEMO DATA",
};

const STATUS_COLORS: Record<ScoreStatus, string> = {
  verified:     "text-green-400",
  calculating:  "text-blue-400",
  not_assessed: "text-slate-500",
  mock:         "text-slate-500",
};

// ── component ────────────────────────────────────────────────────────────────

export function AnimatedScoreRing({
  score,
  previousScore,
  change,
  status = "mock",
  lastAssessment,
  size = 180,
  strokeWidth = 11,
}: AnimatedScoreRingProps) {
  const radius        = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeColor   = scoreStrokeColor(score);
  const textColor     = scoreColor(score);

  const arcProgress  = useArcProgress(score);
  const displayScore = useCountUp(score);

  const dashOffset  = circumference - (arcProgress / 100) * circumference;
  const hasChange   = change !== undefined && change !== 0;
  const positive    = (change ?? 0) > 0;
  const neutral     = (change ?? 0) === 0;

  return (
    <div className="flex flex-col items-center gap-3">

      {/* ── Ring ─────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>

        {/* Ambient glow */}
        <div
          className="absolute rounded-full opacity-10 blur-2xl pointer-events-none"
          style={{ width: size * 0.65, height: size * 0.65, backgroundColor: strokeColor }}
        />

        {/* SVG arcs */}
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="hsl(217,33%,14%)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold tabular-nums leading-none ${textColor}`}>
            {displayScore}
          </div>
          <div className="text-sm text-slate-500 font-medium mt-0.5">/ 100</div>

          {hasChange && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
              className={`flex items-center gap-0.5 text-xs font-semibold mt-2 ${
                neutral ? "text-slate-400" :
                positive ? "text-green-400" : "text-red-400"
              }`}
            >
              {neutral   ? <Minus size={10} /> :
               positive  ? <TrendingUp size={10} /> :
                           <TrendingDown size={10} />}
              {positive && "+"}{change} pts
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Status row ────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1">
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest ${STATUS_COLORS[status]}`}>
          {status === "calculating" && (
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"
            />
          )}
          {status === "verified" && <Activity size={10} />}
          {STATUS_LABELS[status]}
        </div>

        {lastAssessment && (
          <div className="text-[10px] text-slate-600">{lastAssessment}</div>
        )}
        {previousScore !== undefined && (
          <div className="text-[10px] text-slate-600">
            Previous: <span className={scoreColor(previousScore)}>{previousScore}</span>
          </div>
        )}
      </div>
    </div>
  );
}
