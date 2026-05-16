// GET /api/stagecraft/patterns
// Rich per-pattern analytics across all sessions.
// For each detected grammar/delivery pattern tag, returns:
//   - total count + questions affected
//   - per-session rate history (oldest → newest, for sparkline)
//   - 3 most recent example questions where it appeared
//   - trend: improving / worsening / stable / insufficient
//
// Used by the dedicated Patterns dashboard page.

import { listSessions } from "@/lib/stagecraft/sessionStore";
import type { SessionRecord } from "@/lib/stagecraft/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatternSession {
  sessionId: string;
  startedAt: string;
  role: string;
  count: number; // occurrences of this tag in this session
  questions: number; // total questions in the session
  rate: number; // count / questions
}

export interface PatternExample {
  sessionId: string;
  startedAt: string;
  question: string;
  round: string;
}

export interface PatternData {
  tag: string;
  totalCount: number; // all-time occurrences
  totalQuestions: number; // questions it appeared in (deduplicated)
  sessions: PatternSession[]; // oldest→newest, only sessions where it appeared
  allSessionRates: { startedAt: string; rate: number }[]; // oldest→newest, ALL sessions (0 if absent)
  recentExamples: PatternExample[]; // up to 3, newest first
  trend: "improving" | "worsening" | "stable" | "insufficient";
}

export interface PatternsPayload {
  patterns: PatternData[]; // sorted: highest total count first
  totalSessions: number; // sessions with ≥1 item
  totalQuestions: number;
  hasEnoughData: boolean; // need ≥4 sessions for trend
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function computeTrend(
  allSessionRates: { startedAt: string; rate: number }[],
): PatternData["trend"] {
  if (allSessionRates.length < 4) return "insufficient";
  // Compare last 3 sessions vs the 3 before that
  const rates = allSessionRates.map((s) => s.rate);
  const recent = rates.slice(-3);
  const older = rates.slice(-6, -3);
  if (older.length === 0) return "insufficient";
  const delta = avg(recent) - avg(older);
  if (delta < -0.07) return "improving";
  if (delta > 0.07) return "worsening";
  return "stable";
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET() {
  const allSessions = await listSessions();

  // Sort oldest → newest for time-series
  const sessions: SessionRecord[] = allSessions
    .filter((s) => s.items.length > 0)
    .sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));

  if (sessions.length === 0) {
    const payload: PatternsPayload = {
      patterns: [],
      totalSessions: 0,
      totalQuestions: 0,
      hasEnoughData: false,
    };
    return Response.json(payload);
  }

  const totalQuestions = sessions.reduce((a, s) => a + s.items.length, 0);

  // ── Build per-pattern data ────────────────────────────────────────────────

  // Collect all unique tags
  const tagSet = new Set<string>();
  for (const s of sessions) {
    for (const item of s.items) {
      for (const p of item.patterns ?? []) {
        tagSet.add(p);
      }
    }
  }

  const patterns: PatternData[] = [];

  for (const tag of tagSet) {
    let totalCount = 0;
    let totalQuestionsAffected = 0;
    const sessionDataList: PatternSession[] = [];
    const allSessionRates: { startedAt: string; rate: number }[] = [];
    const examples: PatternExample[] = [];

    for (const s of sessions) {
      // Count occurrences in this session
      let count = 0;
      let questionsAffected = 0;
      for (const item of s.items) {
        const itemPatterns = item.patterns ?? [];
        const itemCount = itemPatterns.filter((p) => p === tag).length;
        if (itemCount > 0) {
          count += itemCount;
          questionsAffected++;
          // Collect example (we'll take the latest ones at the end)
          examples.push({
            sessionId: s.id,
            startedAt: s.startedAt,
            question: item.question,
            round: item.round,
          });
        }
      }

      const rate = s.items.length > 0 ? count / s.items.length : 0;
      allSessionRates.push({ startedAt: s.startedAt, rate });

      if (count > 0) {
        sessionDataList.push({
          sessionId: s.id,
          startedAt: s.startedAt,
          role: s.config.targetRole,
          count,
          questions: s.items.length,
          rate,
        });
        totalCount += count;
        totalQuestionsAffected += questionsAffected;
      }
    }

    // Take 3 most recent examples (examples array is oldest→newest already)
    const recentExamples = examples.slice(-3).reverse();

    patterns.push({
      tag,
      totalCount,
      totalQuestions: totalQuestionsAffected,
      sessions: sessionDataList, // already oldest→newest
      allSessionRates,
      recentExamples,
      trend: computeTrend(allSessionRates),
    });
  }

  // Sort by total count descending
  patterns.sort((a, b) => b.totalCount - a.totalCount);

  const payload: PatternsPayload = {
    patterns,
    totalSessions: sessions.length,
    totalQuestions,
    hasEnoughData: sessions.length >= 4,
  };

  return Response.json(payload);
}
