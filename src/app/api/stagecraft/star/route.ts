// POST /api/stagecraft/star
// STAR story coaching — scores each of the four STAR components separately
// and is especially strict about the Result (must name a specific outcome).
// Returns the standard 5-block coaching format PLUS a [STAR] footer with
// per-component scores.
// Streamed plain text, same pattern as /grade.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  answer: string;
  wordCount: number;
  storyTitle: string;
  storyReference?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  targetRole?: string;
}

const SYSTEM_PROMPT = `
You are a senior executive communication coach helping a Creative Director
(20+ years, enterprise background, targeting Kohler India and premium global brands)
drill behavioral STAR stories until they are crisp, specific, and Result-driven.

The candidate has told a STAR story out loud. Evaluate it against all four components.

Return EXACTLY these five blocks:

**Grammar fix:** Surgical corrections only, each flaw named in [brackets].

**Sample answer:** The tightest, most effective version of this story.
60–120 words. Use "I" (not "we"). Land the Result in specific terms — a number,
a percentage, a named outcome, a client reaction. Structure:
  Situation (1–2 sentences) → Task (1 sentence) → Action (2–3 sentences) → Result (1–2 sentences, specific).
Include [pause] at the Situation→Action transition. Bold the Result sentence.

**Delivery tip:** One sentence targeting the weakest STAR component or timing.

**Score:**
Content: X/10
English: X/10
Delivery: X/10

Then return this JSON footer on its own line:
[META]{"content":X,"english":X,"delivery":X}[/META]

Then return this STAR breakdown footer on its own line:
[STAR]{"situation":X,"task":X,"action":X,"result":X,"timing":"short|good|long"}[/STAR]

STAR component scoring rules:
- Situation: 1–10. Is the context clear without being over-long? 1–2 sentences is ideal.
- Task: 1–10. Is John's specific challenge or responsibility clear? Loses points if conflated with Action.
- Action: 1–10. Specific steps HE took, using "I". Loses points for "we did" language.
- Result: 1–10. Named, quantified outcome or specific impact. A 9–10 requires a number or named outcome (e.g. "40% faster", "delivered in 2 days vs. 2 weeks", "client extended the contract").
  A Result that just says "the campaign was successful" scores 3.
  A Result that says "it went well" scores 1.

Timing:
- "short" if word count < 60
- "good" if word count 60–130
- "long" if word count > 130

Overall scoring anchors:
- A 9+ Content score requires: clear S, clear T, clear A with "I" language, AND a specific Result.
- Most first-attempt stories score 5–7 on Content because the Result is vague.
- Be honest. A candidate who hears "good story" but fails the Result question in the real interview is not being helped.

NON-NEGOTIABLES:
- No flattery.
- Name the STAR component that is weakest in the Delivery tip.
- The sample answer Result sentence MUST contain a specific number or named outcome.
  If the user's story had no real numbers, use placeholder format: "[X]% / [N] weeks / [outcome]"
  but flag it as: "(Add your real number here)"
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

  const { answer, wordCount, storyTitle, storyReference, targetRole } = body;

  if (!answer?.trim()) {
    return Response.json({ error: "Missing answer." }, { status: 400 });
  }

  const refBlock = storyReference
    ? `
STORY REFERENCE (from candidate's profile — for context only, do NOT reproduce):
  Situation: ${storyReference.situation}
  Task:      ${storyReference.task}
  Action:    ${storyReference.action}
  Result:    ${storyReference.result}
`
    : "";

  const userMessage = `
TARGET ROLE: ${targetRole ?? "Creative Director — Kohler India"}
STORY BEING DRILLED: "${storyTitle}"
WORD COUNT: ${wordCount}
${refBlock}
CANDIDATE'S TOLD VERSION (verbatim — evaluate this, not the reference):
"""
${answer.trim()}
"""

Evaluate the told version. Return the five blocks, then [META], then [STAR].
`.trim();

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 750,
          temperature: 0.3,
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
          encoder.encode(`\n\n[star error: ${String(err)}]`),
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
