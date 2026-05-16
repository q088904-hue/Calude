// POST /api/stagecraft/brief
// Generates a personalized daily coaching brief for the morning session.
// Takes: session history summary + interview countdown + top patterns.
// Returns a short, streamed plain-text brief (≈100 words) telling John
// exactly what to practice today and why.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  daysUntilInterview: number | null;
  targetCompany: string | null;
  totalSessions: number;
  totalQuestions: number;
  kohlerReadiness: number | null;
  lastSessionComposite: number | null;
  lastSessionRole: string | null;
  weakestRound: string | null; // round with lowest avg composite
  worstPatterns: string[]; // top 3 most frequent grammar/delivery patterns
  englishTrend: "improving" | "worsening" | "stable" | null;
  dayOfWeek: string; // e.g. "Friday"
}

const SYSTEM_PROMPT = `
You are a senior executive interview coach giving John Viju his morning briefing.
John is a Creative Director (20+ years, 18 at Datamatics) preparing for Kohler India
and other premium brand interviews.

Write a DAILY COACHING BRIEF — 80–110 words. No greeting. No sign-off.
Start directly with the most important insight or action.

Structure:
1. One sentence on where he stands (readiness score or trend — blunt, not fluffy).
2. One sentence identifying today's primary focus (the one thing that would move his
   score most if he worked on it today).
3. One concrete, specific recommendation for today's practice session (which mode,
   which round, which tool from the list: session / intro / star / drill / negotiate /
   portfolio / debrief / plan).
4. One sentence on a pattern to watch for (from the worst patterns list).

Tone: a good coach giving a 60-second pre-game brief. Blunt. No flattery.
No "today would be a great day to..." — that is weak. Say what to do.

If interview is ≤7 days away: create urgency. Every session now counts.
If interview is ≤3 days: say so directly. Recommend only high-priority tools.
If no interview date is set: focus on the weakest score axis.

Word budget: 80–110 words. Do not exceed 110.
`.trim();

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch (err) {
    return Response.json(
      { error: "Invalid JSON body.", detail: String(err) },
      { status: 400 },
    );
  }

  const {
    daysUntilInterview,
    targetCompany,
    totalSessions,
    totalQuestions,
    kohlerReadiness,
    lastSessionComposite,
    lastSessionRole,
    weakestRound,
    worstPatterns,
    englishTrend,
    dayOfWeek,
  } = body;

  const userMessage = `
${dayOfWeek.toUpperCase()} BRIEFING

INTERVIEW COUNTDOWN: ${
    daysUntilInterview === null
      ? "No interview date set"
      : daysUntilInterview === 0
        ? "Interview is today"
        : daysUntilInterview === 1
          ? "1 day until interview"
          : `${daysUntilInterview} days until interview`
  }${targetCompany ? ` (${targetCompany})` : ""}

PRACTICE HISTORY:
- Total sessions: ${totalSessions}
- Total questions answered: ${totalQuestions}
- Kohler readiness: ${kohlerReadiness !== null ? `${kohlerReadiness}/10` : "not enough data"}
- Last session: ${lastSessionComposite !== null ? `${lastSessionComposite}/10 composite` : "no sessions yet"}${lastSessionRole ? ` (${lastSessionRole})` : ""}

WEAKNESSES:
- Weakest round: ${weakestRound ?? "unknown (not enough data)"}
- Top grammar/delivery patterns: ${worstPatterns.length > 0 ? worstPatterns.join(", ") : "none detected yet"}
- English trend: ${englishTrend ?? "insufficient data"}

Write the daily brief now. 80–110 words.
`.trim();

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 200,
          temperature: 0.4,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userMessage }],
        });

        response.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });
        response.on("error", (err) => {
          controller.enqueue(
            encoder.encode(`\n\n[brief error: ${String(err)}]`),
          );
          controller.close();
        });
        response.on("end", () => {
          controller.close();
        });

        await response.finalMessage();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n[brief error: ${String(err)}]`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
