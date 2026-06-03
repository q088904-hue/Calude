// Canonical per-session summary computation for Stagecraft.
// Single source of truth shared by the history route (read path) and the
// supabase store (write-time denormalization). Pure; server-safe.

import type { SessionRecord } from "./types";

export interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt?: string;
  role: string;
  round: string;
  difficulty: string;
  questionCount: number; // answered (not configured)
  avgContent: number;
  avgEnglish: number;
  avgDelivery: number;
  composite: number; // 0.4*content + 0.3*english + 0.3*delivery
  patterns: string[]; // every pattern tag across all items (with dupes)
}

/**
 * Reduce a SessionRecord to its summary. Returns null for empty shells
 * (sessions created but never answered) — callers skip those.
 */
export function summarise(s: SessionRecord): SessionSummary | null {
  if (s.items.length === 0) return null;
  const n = s.items.length;
  const sum = s.items.reduce(
    (a, it) => {
      a.c += it.scores.content;
      a.e += it.scores.english;
      a.d += it.scores.delivery;
      return a;
    },
    { c: 0, e: 0, d: 0 },
  );
  const ac = +(sum.c / n).toFixed(1);
  const ae = +(sum.e / n).toFixed(1);
  const ad = +(sum.d / n).toFixed(1);
  const composite = +(ac * 0.4 + ae * 0.3 + ad * 0.3).toFixed(1);
  const patterns = s.items.flatMap((it) => it.patterns ?? []);
  return {
    id: s.id,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    role: s.config.targetRole,
    round: s.config.round,
    difficulty: s.config.difficulty,
    questionCount: n,
    avgContent: ac,
    avgEnglish: ae,
    avgDelivery: ad,
    composite,
    patterns,
  };
}
