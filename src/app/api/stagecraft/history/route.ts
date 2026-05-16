// /api/stagecraft/history
// GET → returns per-session summaries + all-time aggregates
// Computed server-side so the client doesn't have to crunch full session JSON.

import { listSessions } from "@/lib/stagecraft/sessionStore";
import type { SessionRecord } from "@/lib/stagecraft/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export interface HistoryPayload {
  sessions: SessionSummary[];      // newest first, all sessions with ≥1 item
  allPatterns: { tag: string; count: number }[]; // sorted by count desc
  kohlerReadiness: number | null;  // rolling 5-session composite (null if <3 sessions)
  totalQuestions: number;
}

function summarise(s: SessionRecord): SessionSummary | null {
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
