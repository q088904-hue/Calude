// /api/stagecraft/history
// GET → returns per-session summaries + all-time aggregates
// Computed server-side so the client doesn't have to crunch full session JSON.

import { listSessionSummaries } from "@/lib/stagecraft/sessionStore";
import type { SessionSummary } from "@/lib/stagecraft/sessionSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Re-exported so existing page imports (`from ".../history/route"`) keep working.
export type { SessionSummary };

export interface HistoryPayload {
  sessions: SessionSummary[];      // newest first, all sessions with ≥1 item
  allPatterns: { tag: string; count: number }[]; // sorted by count desc
  kohlerReadiness: number | null;  // rolling 5-session composite (null if <3 sessions)
  totalQuestions: number;
  total: number;                   // total summarised sessions (for paginated callers)
}

export async function GET(request: Request) {
  // Read amplification mitigation: pull precomputed summaries (never `items`).
  // Returns newest-first, empty shells already excluded.
  const summaries = await listSessionSummaries();

  // Aggregates always span the FULL set so charts/readiness stay accurate even
  // when a caller paginates the session list below.

  // All-time pattern frequency
  const patternMap = new Map<string, number>();
  for (const s of summaries) {
    for (const p of s.patterns) {
      patternMap.set(p, (patternMap.get(p) ?? 0) + 1);
    }
  }
  const allPatterns = Array.from(patternMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // Kohler readiness: rolling composite of last 5 sessions with ≥3 questions
  const eligible = summaries.filter((s) => s.questionCount >= 3).slice(0, 5);
  const kohlerReadiness =
    eligible.length >= 1
      ? +(
          eligible.reduce((a, s) => a + s.composite, 0) / eligible.length
        ).toFixed(1)
      : null;

  const totalQuestions = summaries.reduce((a, s) => a + s.questionCount, 0);

  // Opt-in pagination of the session LIST only (aggregates above stay full-set).
  // No params → identical payload to before (all sessions returned).
  const params = new URL(request.url).searchParams;
  const rawLimit = params.get("limit");
  const limit = rawLimit !== null ? Math.max(0, Number(rawLimit) || 0) : null;
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const sessions =
    limit !== null ? summaries.slice(offset, offset + limit) : summaries;

  const payload: HistoryPayload = {
    sessions,
    allPatterns,
    kohlerReadiness,
    totalQuestions,
    total: summaries.length,
  };

  return Response.json(payload);
}
