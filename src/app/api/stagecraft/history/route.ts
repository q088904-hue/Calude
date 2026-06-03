// /api/stagecraft/history
// GET → returns per-session summaries + all-time aggregates
// Computed server-side so the client doesn't have to crunch full session JSON.

import { listSessions } from "@/lib/stagecraft/sessionStore";
import { summarise, type SessionSummary } from "@/lib/stagecraft/sessionSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Re-exported so existing page imports (`from ".../history/route"`) keep working.
export type { SessionSummary };

export interface HistoryPayload {
  sessions: SessionSummary[];      // newest first, all sessions with ≥1 item
  allPatterns: { tag: string; count: number }[]; // sorted by count desc
  kohlerReadiness: number | null;  // rolling 5-session composite (null if <3 sessions)
  totalQuestions: number;
}

export async function GET() {
  const all = await listSessions();

  // Newest first, skip empty shells (sessions that were created but never answered)
  const summaries: SessionSummary[] = all
    .map(summarise)
    .filter((s): s is SessionSummary => s !== null)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

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

  const payload: HistoryPayload = {
    sessions: summaries,
    allPatterns,
    kohlerReadiness,
    totalQuestions,
  };

  return Response.json(payload);
}
