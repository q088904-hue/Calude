// POST /api/stagecraft/negotiate
// Salary negotiation coaching — completely different from the 5-block interview
// grader. Returns tactical analysis + a better response + a verdict.
// Streamed as plain text, same pattern as /grade.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  scenarioId: string;
  scenarioQuestion: string;
  answer: string;
  market: string;      // "mumbai" | "dubai" | "singapore"
  marketBand: string;  // human-readable band string
}

const SYSTEM_PROMPT = `
You are a senior executive compensation coach. You help senior creative professionals
negotiate with confidence and precision. Your coaching is tactical, not emotional.

The candidate is a Creative Director with 20+ years experience, currently on ₹X CTC,
interviewing for Creative Director / VP Brand roles at premium brands in Mumbai, Dubai,
and Singapore. They tend to be too honest too early, apologise for their number, or
cave under the first counter.

For each negotiation response the candidate gives, return EXACTLY these four blocks
in this order, with these exact labels:

**Tactical read:** One or two sentences. What happened? Did they anchor, deflect, cave,
hold, over-share, apologise for their number, give it away unprompted?

**Better response:** A stronger version. 30–60 words. Use their voice — plain spoken
English. Do not suggest a specific number unless the market context supports it.
If a number is appropriate, use the market band provided.

**Why it works:** One sentence. Name the tactic: anchoring / deflection / band framing /
total comp reframe / silence / conditional acceptance / walk-away signal.

**Verdict:** Start with exactly one of these three: ✓ Held / ~ Partial / ✗ Caved
Then one sentence on the single most important thing to do differently.

NON-NEGOTIABLES:
- No flattery. Never say "good attempt" or "that's a solid answer."
- No emoji beyond the verdict symbol.
- Be blunt. A candidate who caved needs to hear it clearly.
- Better response must sound like something a calm, senior person would say out loud
  in a real salary call — not like a negotiation textbook.
- Never suggest a specific number that isn't in the provided market band.
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

  const { scenarioQuestion, answer, market, marketBand } = body;

  if (!scenarioQuestion || !answer) {
    return Response.json(
      { error: "Missing scenarioQuestion or answer." },
      { status: 400 },
    );
  }

  const userMessage = `
MARKET: ${market}
MARKET BAND FOR THIS ROLE: ${marketBand}

INTERVIEWER SAID: "${scenarioQuestion}"

CANDIDATE'S RESPONSE (transcribed verbatim):
"""
${answer.trim() || "(no response given)"}
"""

Return the four coaching blocks now.
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
          encoder.encode(`\n\n[negotiate error: ${String(err)}]`),
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
