// POST /api/stagecraft/report
// Generates the session report using SESSION_REPORT_PROMPT + the saved items
// for the session, streams it back, and persists it via setReport().

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import Anthropic from "@anthropic-ai/sdk";
import { getSession, setReport } from "@/lib/stagecraft/sessionStore";
import { SESSION_REPORT_PROMPT } from "@/lib/stagecraft/prompts";
import type { Round } from "@/lib/stagecraft/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  sessionId: string;
  targetRole: string;
  round: Round;
}

export async function POST(request: NextRequest) {
  const gate = await requireStagecraftUser();
  if (gate instanceof Response) return gate;
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

  const session = await getSession(body.sessionId);
  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
  if (session.items.length === 0) {
    return Response.json(
      { error: "Session has no graded items yet." },
      { status: 400 },
    );
  }

  const itemsBlock = session.items
    .map((it) => {
      return `--- Q${it.index} (${it.round}) ---
Question: ${it.question}
Answer (transcribed): ${it.answer || "(no answer given)"}
Scores: Content ${it.scores.content}/10, English ${it.scores.english}/10, Delivery ${it.scores.delivery}/10
Patterns: ${it.patterns.length ? it.patterns.map((p) => `[${p}]`).join(" ") : "(none)"}
Feedback (verbatim from coach):
${it.feedback}`;
    })
    .join("\n\n");

  const userMessage = `Role: ${body.targetRole}
Round: ${body.round}
Questions: ${session.items.length}

Below are all the questions, the candidate's transcribed answers, the scores
the coach assigned, and the verbatim feedback. Produce the SESSION REPORT in
the EXACT format specified by the system prompt — averages, top 3 wins, top 3
fixes, repeated grammar patterns with question references, and three sample
answers to memorize tonight (pick the strongest from the feedback above).

${itemsBlock}`;

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let finalText = "";
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 1500,
          temperature: 0.3,
          system: [
            {
              type: "text",
              text: SESSION_REPORT_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userMessage }],
        });

        response.on("text", (delta) => {
          finalText += delta;
          controller.enqueue(encoder.encode(delta));
        });
        response.on("error", (err) => {
          controller.enqueue(
            encoder.encode(`\n\n[stream error: ${String(err)}]`),
          );
          controller.close();
        });
        response.on("end", async () => {
          try {
            await setReport(body.sessionId, finalText);
          } catch {
            /* persistence is best-effort here */
          }
          controller.close();
        });

        await response.finalMessage();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n[report error: ${String(err)}]`),
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
