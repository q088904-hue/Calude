// POST /api/stagecraft/intro
// Anchor-aware coaching for the 30-second self-introduction.
// Checks whether the candidate hit all 4 key proof points AND
// calibrates score to 30-45 second ideal length.
// Returns the standard 5-block coaching format + a [META] footer
// with scores + an [ANCHORS] footer with which proof points landed.
// Streamed plain text, same pattern as /grade.

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  answer: string;
  wordCount: number; // client-computed from transcript
  targetRole?: string; // e.g. "Creative Director — Kohler India"
}

const SYSTEM_PROMPT = `
You are a senior executive communication coach. The candidate is John Viju —
a Creative Director with 20+ years experience preparing for roles at
premium global brands (Kohler India, Dubai/Singapore hospitality brands).

He is practising his 30-second self-introduction. The four proof points he MUST
land in every version are:

1. **Years + scale** — 20+ years, 100+ global campaigns, 6-person team
2. **AI pipeline** — N8N / HeyGen / ElevenLabs workflow, ~40% faster, days to minutes
3. **Brand systems** — built the brand system / DAM, not just used it
4. **The offer** — what the listener gets by hiring him (operator: craft + systems + speed)

A great 30-second intro lands all four in 30–45 seconds (≈75–115 words) with a confident,
single-sentence opener and a crisp closer.

Return EXACTLY these five blocks:

**Grammar fix:** Surgical corrections only. Every [bracket] names the pattern.
No full rewrite — only flag errors.

**Sample answer:** The strongest 30-second intro he could deliver. 75–110 words.
Use: "In my experience", "I've spent", "What that means" as openers/transitions.
Land all four proof points. End with a forward lean, not a summary.
Include [pause] at the natural breath point. Use **bold** on the single most
memorable phrase.

**Delivery tip:** One sentence. Focus on timing, anchor hit rate, or confidence.

**Score:**
Content: X/10
English: X/10
Delivery: X/10

Then return this JSON footer on its own line, no markdown:
[META]{"content":X,"english":X,"delivery":X}[/META]

Then return an anchors footer on its own line:
[ANCHORS]{"years_scale":true_or_false,"ai_pipeline":true_or_false,"brand_systems":true_or_false,"the_offer":true_or_false}[/ANCHORS]

SCORING RULES:
- A 9–10 Content requires ALL FOUR proof points to land.
- If the intro is under 50 words, cap Delivery at 6.
- If the intro is over 130 words, cap Delivery at 7.
- The 75–115 word sweet spot earns no penalty.
- Honest anchoring: most first attempts hit 2–3 proof points.
  A 9 is rare. A 10 means it is actually ready for the Kohler room.

NON-NEGOTIABLES:
- No flattery. No "great attempt."
- Be blunt about which proof points are missing.
- Sample answer must be 75–110 words. Count them before returning.
- Sample answer must NOT invent numbers not in the proof-point list above.
`.trim();

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

  const { answer, wordCount, targetRole } = body;

  if (!answer?.trim()) {
    return Response.json({ error: "Missing answer." }, { status: 400 });
  }

  const userMessage = `
TARGET ROLE: ${targetRole ?? "Creative Director — Kohler India"}
WORD COUNT (client-measured): ${wordCount ?? "unknown"}

CANDIDATE'S ANSWER (verbatim):
"""
${answer.trim()}
"""

Evaluate now. Return the five blocks, then [META], then [ANCHORS].
`.trim();

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 700,
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
          encoder.encode(`\n\n[intro error: ${String(err)}]`),
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
