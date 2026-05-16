"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface VerdictCardProps {
  score: number;
  verdict: string;
  summary: string;
}

function AnimatedScore({ target }: { target: number }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 1800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Dramatic ease-out with slight overshoot
      const eased = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, isInView]);

  return (
    <span ref={ref} className="tabular-nums">
      {current}
    </span>
  );
}

const verdictConfig: Record<
  string,
  { badge: string; ring: string }
> = {
  Excellent: {
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25",
    ring: "ring-emerald-500/20",
  },
  Strong: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    ring: "ring-blue-500/20",
  },
  Good: {
    badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25",
    ring: "ring-amber-500/20",
  },
  "Needs Work": {
    badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/25",
    ring: "ring-orange-500/20",
  },
  Weak: {
    badge: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/25",
    ring: "ring-red-500/20",
  },
};

export default function VerdictCard({
  score,
  verdict,
  summary,
}: VerdictCardProps) {
  const config = verdictConfig[verdict] || verdictConfig.Good;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-border-subtle bg-[var(--surface-elevated)]"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {/* Red accent — 2px, not 1px. Intentional brand mark. */}
      <div className="h-[2px] bg-brand-red red-line-shimmer" />

      <div className="p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          {/* Score — the dramatic centerpiece */}
          <div className="flex items-baseline gap-1.5">
            <div className="text-[72px] md:text-[88px] font-bold tracking-[-0.04em] leading-none text-text-primary font-mono">
              <AnimatedScore target={score} />
            </div>
            <div className="flex flex-col pb-2">
              <span className="text-[13px] text-text-tertiary font-mono">
                /100
              </span>
            </div>
          </div>

          {/* Verdict + Label */}
          <div className="flex flex-col gap-3">
            <div
              className={`inline-flex self-start px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border ${config.badge}`}
            >
              {verdict}
            </div>
            <span className="text-[11px] text-text-tertiary uppercase tracking-[0.1em] font-medium">
              Overall Design Score
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-subtle my-8" />

        {/* Summary — editorial paragraph */}
        <p className="text-[15px] text-text-secondary leading-[1.7] max-w-[640px]">
          {summary}
        </p>
      </div>
    </motion.div>
  );
}
