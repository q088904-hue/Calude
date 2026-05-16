"use client";

// Feature: BiteTime™ Score Card
// Outcome: #2 Find fish — surface the best time + harbor at a glance
// Success metric: user picks the highest-score harbor ≥70% of the time vs random

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export interface HarborBiteTime {
  slug: string;
  nameEn: string;
  nameTa: string;
  nameMl: string;
  state: "KL" | "TN";
  score: number;         // 0-100
  bandLabel: string;     // "Poor" | "Slow" | "Fair" | "Good" | "Excellent"
  explanation: string;   // Claude-generated one-liner
  distanceNm?: number;
}

interface Props {
  harbor: HarborBiteTime;
  locale?: "en" | "ta" | "ml";
  isPro?: boolean;         // false = show simplified 3-band (free)
  isLocked?: boolean;      // forecast locked, today unlocked
  onUnlock?: () => void;
}

function scoreBand(score: number): {
  label: string;
  color: string;
  bg: string;
  barColor: string;
} {
  if (score >= 85) return { label: "Excellent", color: "text-mt-aqua",  bg: "bg-mt-aqua/10",  barColor: "bg-mt-aqua"  };
  if (score >= 70) return { label: "Good",      color: "text-mt-green", bg: "bg-mt-green/10", barColor: "bg-mt-green" };
  if (score >= 50) return { label: "Fair",      color: "text-mt-amber", bg: "bg-mt-amber/10", barColor: "bg-mt-amber" };
  if (score >= 30) return { label: "Slow",      color: "text-mt-muted", bg: "bg-mt-muted/10", barColor: "bg-mt-muted" };
  return               { label: "Poor",      color: "text-mt-muted", bg: "bg-mt-border",   barColor: "bg-mt-border" };
}

function simpleBand(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "Good", color: "text-mt-green" };
  if (score >= 40) return { label: "Fair", color: "text-mt-amber" };
  return               { label: "Slow", color: "text-mt-muted" };
}

export function BiteTimeCard({ harbor, locale = "en", isPro = false, isLocked = false, onUnlock }: Props) {
  const name = locale === "ta" ? harbor.nameTa : locale === "ml" ? harbor.nameMl : harbor.nameEn;
  const band = isPro ? scoreBand(harbor.score) : simpleBand(harbor.score);
  const showScore = isPro;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className="relative bg-mt-surface rounded-2xl p-4 flex flex-col gap-3 border border-mt-border"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-mt-ink font-semibold text-base leading-tight">{name}</p>
          <p className="text-mt-muted text-xs mt-0.5">{harbor.state === "KL" ? "Kerala" : "Tamil Nadu"}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${band.color} ${isPro ? (band as ReturnType<typeof scoreBand>).bg : "bg-mt-border"}`}>
          {band.label}
        </span>
      </div>

      {/* Score display */}
      {showScore ? (
        <div className="flex items-end gap-1.5">
          <span className={`font-mono text-3xl font-bold ${band.color}`}>{harbor.score}</span>
          <span className="text-mt-muted text-xs mb-1">/ 100</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xl font-bold ${band.color}`}>{band.label}</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1.5 bg-mt-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isPro ? (band as ReturnType<typeof scoreBand>).barColor : "bg-mt-muted"}`}
          initial={{ width: 0 }}
          animate={{ width: `${isPro ? harbor.score : (harbor.score >= 70 ? 80 : harbor.score >= 40 ? 50 : 25)}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        />
      </div>

      {/* Explanation — Pro only */}
      {isPro && !isLocked && (
        <p className="text-mt-muted text-xs leading-relaxed">{harbor.explanation}</p>
      )}

      {/* Locked forecast overlay */}
      {isLocked && (
        <button
          onClick={onUnlock}
          className="flex items-center gap-1.5 text-mt-aqua text-xs font-medium mt-1"
        >
          <Lock className="w-3 h-3" />
          Unlock 48h forecast — Pro
        </button>
      )}

      {/* Distance chip */}
      {harbor.distanceNm !== undefined && (
        <p className="text-mt-muted text-xs">
          {harbor.distanceNm} nm from your harbor
        </p>
      )}
    </motion.div>
  );
}

// ── Seed data for demo ────────────────────────────────────────────────────────

export const DEMO_HARBORS: HarborBiteTime[] = [
  {
    slug: "kochi",
    nameEn: "Kochi",
    nameTa: "கொச்சி",
    nameMl: "കൊച്ചി",
    state: "KL",
    score: 78,
    bandLabel: "Good",
    explanation: "Rising tide and cool water (27°C) off Kochi. Best window: 5–9 AM.",
    distanceNm: 0,
  },
  {
    slug: "neendakara",
    nameEn: "Neendakara",
    nameTa: "நீண்டகரை",
    nameMl: "നീണ്ടകര",
    state: "KL",
    score: 62,
    bandLabel: "Fair",
    explanation: "Moderate PFZ overlap. Slack tide until 10 AM — expect slower bite.",
    distanceNm: 85,
  },
  {
    slug: "vizhinjam",
    nameEn: "Vizhinjam",
    nameTa: "விழிஞ்சம்",
    nameMl: "വിഴിഞ്ഞം",
    state: "KL",
    score: 91,
    bandLabel: "Excellent",
    explanation: "Strong PFZ + new moon + falling tide. Top seer zone today.",
    distanceNm: 120,
  },
  {
    slug: "tuticorin",
    nameEn: "Tuticorin",
    nameTa: "தூத்துக்குடி",
    nameMl: "തൂത്തുക്കുടി",
    state: "TN",
    score: 44,
    bandLabel: "Slow",
    explanation: "High swell (2.8 m) dampening activity. Consider waiting for tomorrow.",
    distanceNm: 210,
  },
  {
    slug: "kanyakumari",
    nameEn: "Kanyakumari",
    nameTa: "கன்னியாகுமரி",
    nameMl: "കന്യാകുമാരി",
    state: "TN",
    score: 55,
    bandLabel: "Fair",
    explanation: "Mixed signals — chlorophyll high but wind 18 knots. Caution advised.",
    distanceNm: 140,
  },
  {
    slug: "royapuram",
    nameEn: "Royapuram",
    nameTa: "ராயபுரம்",
    nameMl: "രായപുരം",
    state: "TN",
    score: 33,
    bandLabel: "Slow",
    explanation: "Low PFZ overlap and high urban runoff. Better options further south.",
    distanceNm: 450,
  },
];
