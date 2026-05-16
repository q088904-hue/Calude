"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const analysisPhases = [
  "Initializing Design Intelligence Engine",
  "Scanning visual composition",
  "Analyzing typographic hierarchy",
  "Evaluating color theory application",
  "Mapping eye flow patterns",
  "Assessing semiotic language",
  "Measuring brand alignment",
  "Evaluating strategic positioning",
  "Computing design scores",
  "Generating strategic recommendations",
  "Compiling final analysis",
];

export default function LoadingState() {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setPhase((prev) => (prev + 1) % analysisPhases.length);
    }, 2400);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        // Non-linear progress — pauses at certain thresholds to suggest deeper thinking
        const threshold30 = prev > 28 && prev < 32;
        const threshold60 = prev > 58 && prev < 62;
        const threshold85 = prev > 83 && prev < 87;
        if (threshold30 || threshold60 || threshold85) {
          return prev + Math.random() * 0.3;
        }
        return prev + Math.random() * 2.5 + 0.5;
      });
    }, 250);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="section-container max-w-[520px] mx-auto text-center py-24 md:py-32"
    >
      {/* Precision animation — the signature moment */}
      <div className="relative w-28 h-28 mx-auto mb-14">
        {/* Outer trace — rotating slowly */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <svg viewBox="0 0 112 112" fill="none" className="w-full h-full">
            <circle
              cx="56"
              cy="56"
              r="54"
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
          </svg>
        </motion.div>

        {/* Middle ring — breathing */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.2, 0.08, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-3 rounded-full border border-brand-red"
        />

        {/* Inner ring — counter-rotating */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-6"
        >
          <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
            <circle
              cx="40"
              cy="40"
              r="38"
              stroke="var(--brand-red)"
              strokeWidth="0.5"
              strokeDasharray="2 12"
              opacity="0.3"
            />
          </svg>
        </motion.div>

        {/* Center dot — the "eye" */}
        <motion.div
          animate={{ scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-brand-red shadow-[0_0_16px_rgba(228,0,43,0.4),0_0_40px_rgba(228,0,43,0.15)]" />
        </motion.div>

        {/* Orbiting dot */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{ transformOrigin: "center center" }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full bg-brand-red/60"
            style={{ position: "absolute", top: "4px", left: "50%", transform: "translateX(-50%)" }}
          />
        </motion.div>
      </div>

      {/* Phase text */}
      <div className="h-7 mb-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-[15px] font-medium text-text-primary tracking-[-0.01em]"
          >
            {analysisPhases[phase]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="max-w-[240px] mx-auto">
        <div className="h-[3px] bg-surface-tertiary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-red rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-[11px] text-text-tertiary font-mono tracking-wider">
            {Math.round(progress)}%
          </p>
          <p className="text-[11px] text-text-tertiary font-mono tracking-wider">
            {phase + 1}/{analysisPhases.length}
          </p>
        </div>
      </div>

      {/* Context label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="text-[13px] text-text-tertiary mt-10 max-w-[360px] mx-auto leading-relaxed"
      >
        Performing deep analysis across 10 strategic dimensions. This typically
        takes 15–30 seconds.
      </motion.p>
    </motion.div>
  );
}
