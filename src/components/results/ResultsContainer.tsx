"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { AnalysisResult } from "@/lib/types";
import VerdictCard from "./VerdictCard";
import InsightSection from "./InsightSection";
import Scorecard from "./Scorecard";
import ExportPanel from "./ExportPanel";

interface ResultsContainerProps {
  result: AnalysisResult;
  onReset: () => void;
  onHome?: () => void;
}

const sectionNav = [
  { id: "verdict", label: "Verdict" },
  { id: "scorecard", label: "Scorecard" },
  { id: "insights", label: "Analysis" },
  { id: "export", label: "Export" },
];

const ease = [0.16, 1, 0.3, 1] as const;

export default function ResultsContainer({
  result,
  onReset,
  onHome,
}: ResultsContainerProps) {
  const [activeSection, setActiveSection] = useState("verdict");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["verdict", "scorecard", "insights", "export"];
      for (const id of sections) {
        const el = document.getElementById(`section-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom > 140) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const offset = 140;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="section-container max-w-[960px] mx-auto py-12 md:py-16"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/25 mb-4">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6.5L5 9L9.5 3.5"
                stroke="#22C55E"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-[0.06em]">
              Analysis Complete
            </span>
          </div>
          <h2 className="text-headline text-text-primary">
            Design Analysis
          </h2>
          <p className="text-[14px] text-text-tertiary mt-1.5">
            {`Deep strategic analysis across ${result.scores.length} dimensions · ${result.insights.length} insights`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-end">
          {onHome && (
            <button
              onClick={onHome}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary border border-border-subtle rounded-xl hover:bg-surface-secondary transition-all duration-200"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 6.5L7 2L12 6.5V12H9V8H5V12H2V6.5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Home
            </button>
          )}
          <button
            onClick={onReset}
            className="px-4 py-2.5 text-[13px] font-medium text-text-inverse bg-text-primary hover:opacity-90 rounded-xl transition-all duration-200"
          >
            Analyze Another
          </button>
        </div>
      </motion.div>

      {/* Sticky Section Nav */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease }}
        className="sticky top-16 z-40 bg-[var(--background)]/80 backdrop-blur-2xl -mx-6 md:-mx-12 px-6 md:px-12 py-3 mb-10 border-b border-border-subtle"
      >
        <div className="flex items-center gap-1">
          {sectionNav.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`relative px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                activeSection === item.id
                  ? "bg-text-primary text-text-inverse"
                  : "text-text-tertiary hover:text-text-primary hover:bg-surface-secondary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Results Sections */}
      <div className="space-y-10">
        {/* Verdict */}
        <section id="section-verdict">
          <VerdictCard
            score={result.overallScore}
            verdict={result.verdict}
            summary={result.verdictSummary}
          />
        </section>

        {/* Scorecard */}
        <section id="section-scorecard">
          <Scorecard scores={result.scores} />
        </section>

        {/* Insights */}
        <section id="section-insights">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8 pt-2"
          >
            <h3 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
              Detailed Analysis
            </h3>
            <p className="text-[13px] text-text-tertiary mt-1">
              {result.insights.length} strategic insights across design, brand,
              and positioning
            </p>
          </motion.div>

          <div className="space-y-4">
            {result.insights.map((insight, i) => (
              <InsightSection key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        </section>

        {/* Export */}
        <section id="section-export" className="pt-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="rounded-2xl border border-border-subtle bg-surface-secondary/40 p-8 md:p-10"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
                  Export Analysis
                </h3>
                <p className="text-[13px] text-text-secondary mt-1">
                  Download the full report or copy insights to clipboard
                </p>
              </div>
              <ExportPanel result={result} />
            </div>
          </motion.div>
        </section>
      </div>
    </motion.div>
  );
}
