// POST /api/stagecraft/grade
// Accepts the transcribed answer + question context, calls Anthropic Sonnet,
// and streams back the 5-block coaching feedback as text/plain.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserMessage } from "@/lib/stagecraft/prompts";
import { getProfile } from "@/lib/stagecraft/profileStore";
import { listSessions } from "@/lib/stagecraft/sessionStore";
import type { Round, FocusMode, Difficulty } from "@/lib/stagecraft/types";

// Compute the top recurring patterns from recent sessions.
// Returns an array of { tag, count, rate } sorted by count desc, capped at 5.
// Uses the last N sessions (max 10) that have at least 1 answered item.
async function getRecurringPatterns(
  maxSessions = 10,
): Promise<{ tag: string; count: number; rate: string }[]> {
  try {
    const all = await listSessions();
    const recent = all
      .filter((s) => s.items.length > 0)
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, maxSessions);
    if (recent.length < 2) return []; // not enough history yet

    const totalQuestions = recent.reduce((n, s) => n + s.items.length, 0);
    const map = new Map<string, number>();
    for (const s of recent) {
      for (const it of s.items) {
        for (const p of it.patterns ?? []) {
          map.set(p, (map.get(p) ?? 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .filter(([, count]) => count >= 2) // only patterns appearing 2+ times
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({
        tag,
        count,
        rate: `${Math.round((count / totalQuestions) * 100)}%`,
      }));
  } catch {
    return [];
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  question: string;
  answer: string;
  round: Round;
  questionIndex: number;
  totalQuestions: number;
  focus?: FocusMode;
  difficulty?: Difficulty;
  /** Company brand brief or session targetRole — injected into system prompt */
  targetContext?: string;
}

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
    question,
    answer,
    round,
    questionIndex,
    totalQuestions,
    focus = null,
    difficulty = "realistic",
    targetContext,
  } = body;

  if (!question || typeof questionIndex !== "number") {
    return Response.json(
      { error: "Missing 'question' or 'questionIndex'." },
      { status: 400 },
    );
  }

  // Load profile and recent pattern history in parallel
  const [profile, recurringPatterns] = await Promise.all([
    getProfile(),
    getRecurringPatterns(),
  ]);

  const system = buildSystemPrompt({
    round,
    difficulty,
    focus,
    profile,
    targetContext,
    recurringPatterns,
  });
  const userMessage = buildUserMessage({
    question,
    answer: answer ?? "",
    questionIndex,
    totalQuestions,
  });

  const client = new Anthropic({ apiKey });

  // Stream Anthropic's text deltas back to the client as plain text.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          temperature: 0.3,
          // Cache the system prompt — same profile + persona reused across
          // every question in the session.
          system: [
            {
              type: "text",
              text: system,
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
            encoder.encode(`\n\n[stream error: ${String(err)}]`),
          );
          controller.close();
        });
        response.on("end", () => {
          controller.close();
        });

        await response.finalMessage();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n[grade error: ${String(err)}]`),
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
