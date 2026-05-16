"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
  Target,
  Lightbulb,
  Layers,
  ScanEye,
  Palette,
  Type,
  Brain,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Zap,
  Compass,
  ArrowUpCircle,
  Crosshair,
  Award,
} from "lucide-react";
import type { InsightData } from "@/lib/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  target: Target,
  lightbulb: Lightbulb,
  layers: Layers,
  "scan-eye": ScanEye,
  palette: Palette,
  type: Type,
  brain: Brain,
  "shield-check": ShieldCheck,
  "check-circle": CheckCircle,
  "alert-triangle": AlertTriangle,
  zap: Zap,
  compass: Compass,
  "arrow-up-circle": ArrowUpCircle,
  crosshair: Crosshair,
  award: Award,
};

const typeStyles: Record<
  string,
  { border: string; iconBg: string; iconColor: string; label: string }
> = {
  analysis: {
    border: "border-border-subtle",
    iconBg: "bg-surface-secondary",
    iconColor: "text-text-secondary",
    label: "Analysis",
  },
  strength: {
    border: "border-emerald-100 dark:border-emerald-500/25",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600",
    label: "Key Strength",
  },
  improvement: {
    border: "border-amber-100 dark:border-amber-500/25",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600",
    label: "Action Item",
  },
  opportunity: {
    border: "border-blue-100 dark:border-blue-500/25",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600",
    label: "Opportunity",
  },
};

interface InsightSectionProps {
  insight: InsightData;
  index: number;
}

export default function InsightSection({
  insight,
  index,
}: InsightSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [isExpanded, setIsExpanded] = useState(true);
  const IconComponent = iconMap[insight.icon] || Target;
  const styles = typeStyles[insight.type] || typeStyles.analysis;

  const renderContent = () => {
    if (insight.content.includes("\u2022")) {
      return (
        <ul className="space-y-2.5">
          {insight.content
            .split("\u2022")
            .filter(Boolean)
            .map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[14px] text-text-secondary leading-[1.65]"
              >
                <span className="w-1 h-1 rounded-full bg-text-tertiary mt-[10px] flex-shrink-0" />
                <span>{item.trim()}</span>
              </li>
            ))}
        </ul>
      );
    }

    if (insight.content.match(/^\d+\./m)) {
      return (
        <ol className="space-y-3">
          {insight.content
            .split(/\d+\.\s/)
            .filter(Boolean)
            .map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[14px] text-text-secondary leading-[1.65]"
              >
                <span className="text-[11px] font-mono font-semibold text-brand-red mt-[3px] flex-shrink-0 w-5 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item.trim()}</span>
              </li>
            ))}
        </ol>
      );
    }

    return (
      <p className="text-[14px] text-text-secondary leading-[1.7]">
        {insight.content}
      </p>
    );
  };

  return (
    <motion.div
      id={`insight-${insight.id}`}
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.04, 0.4),
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`group rounded-2xl border ${styles.border} bg-[var(--surface-elevated)] hover:shadow-[var(--shadow-md)] transition-shadow duration-300`}
    >
      <div className="p-6 md:p-8">
        {/* Header — clickable to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-start gap-4 w-full text-left"
        >
          <div
            className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${isExpanded ? "" : "scale-95"}`}
          >
            <IconComponent className={`w-[18px] h-[18px] ${styles.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">
              {insight.title}
            </h3>
            <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.08em] mt-0.5 inline-block">
              {styles.label}
            </span>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-text-tertiary flex-shrink-0 mt-1 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Content */}
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="pl-14 pt-4">{renderContent()}</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
