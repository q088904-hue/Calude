"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import type { AnalysisScore } from "@/lib/types";

interface ScorecardProps {
  scores: AnalysisScore[];
}

function AnimatedBar({
  score,
  label,
  delay,
}: {
  score: number;
  label: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1000;
    const startTime = Date.now();
    const actualDelay = delay * 1000;

    const timeout = setTimeout(() => {
      const animate = () => {
        const elapsed = Date.now() - startTime - actualDelay;
        if (elapsed < 0) {
          requestAnimationFrame(animate);
          return;
        }
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(eased * score));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, actualDelay);

    return () => clearTimeout(timeout);
  }, [score, delay, isInView]);

  const getBarColor = (s: number) => {
    if (s >= 85) return "bg-emerald-500";
    if (s >= 70) return "bg-blue-500";
    if (s >= 55) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div ref={ref} className="group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-text-primary font-medium tracking-[-0.01em]">
          {label}
        </span>
        <span className="text-[13px] font-mono font-semibold text-text-primary tabular-nums">
          {displayScore}
        </span>
      </div>
      <div className="h-[6px] bg-surface-tertiary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getBarColor(score)}`}
          initial={{ width: "0%" }}
          animate={isInView ? { width: `${score}%` } : { width: "0%" }}
          transition={{
            duration: 1,
            delay: delay,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </div>
    </div>
  );
}

export default function Scorecard({ scores }: ScorecardProps) {
  const radarData = scores.map((s) => ({
    subject: s.category,
    score: s.score,
    fullMark: 100,
  }));

  const average = Math.round(
    scores.reduce((a, b) => a + b.score, 0) / scores.length
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border-subtle bg-[var(--surface-elevated)] overflow-hidden"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="p-8 md:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
              Performance Scorecard
            </h3>
            <p className="text-[13px] text-text-tertiary mt-1">
              Across 10 strategic dimensions
            </p>
          </div>
          <div className="text-right">
            <div className="text-[28px] font-bold font-mono text-text-primary tracking-tighter tabular-nums">
              {average}
            </div>
            <div className="text-[11px] text-text-tertiary font-mono uppercase tracking-[0.1em]">
              Average
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Radar Chart — minimal, clean */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="68%"
                data={radarData}
              >
                <PolarGrid
                  stroke="var(--border-subtle)"
                  strokeWidth={0.5}
                  gridType="polygon"
                />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{
                    fontSize: 11,
                    fill: "var(--text-tertiary)",
                  }}
                  tickLine={false}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="var(--brand-red)"
                  fill="var(--brand-red)"
                  fillOpacity={0.06}
                  strokeWidth={1.5}
                  dot={{
                    r: 2.5,
                    fill: "var(--brand-red)",
                    stroke: "var(--brand-red)",
                    strokeWidth: 0,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Score Bars */}
          <div className="space-y-5">
            {scores.map((s, i) => (
              <AnimatedBar
                key={s.category}
                score={s.score}
                label={s.category}
                delay={i * 0.06}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
