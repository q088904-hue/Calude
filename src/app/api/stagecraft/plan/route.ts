// POST /api/stagecraft/plan
// Generates a tailored 30-60-90 day plan for John as a Creative Director
// entering a specific target company. Streamed plain text.
//
// The plan is structured as three phases with concrete, rehearsable
// commitments — designed to be quoted almost verbatim in an HM interview.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  companyId: string;
  companyName: string;
  brandBrief: string;
  watchOuts: string[];
}

const SYSTEM_PROMPT = `
You are a senior executive coach and creative leadership consultant. You help
Creative Directors prepare for hiring manager interviews at premium brands.

The candidate is John Viju — Creative Director, 20+ years experience,
18 years at Datamatics Global Services. Key facts:
- Led 100+ global campaigns/year with a 6-person team
- Built the company's brand system and DAM from scratch
- AI-driven workflow: N8N + HeyGen + ElevenLabs → ~40% production speedup
- Strong on brand systems, motion, 3D/AR, UI/UX
- Moving from enterprise B2B to premium consumer/hospitality

Write a 30-60-90 day plan for John joining the target company as Creative Director.

FORMAT — return exactly this structure, no markdown fences:

## Day 1–30: Listen and map.

[3–4 sentences. What does a new CD do in month one? Deep listening, brand audit,
team assessment, stakeholder mapping. Concrete and specific to this company.
Use "I will" language. Name one deliverable he will produce.]

## Day 31–60: Build trust through output.

[3–4 sentences. First visible creative contribution. One quick win. Establish
review cadence. Show the AI pipeline value without making it the whole story.
Name one deliverable.]

## Day 61–90: Set the creative direction.

[3–4 sentences. Present a creative roadmap. Address the team's capability gaps.
Make the case for design as a business function. Name one deliverable that
signals he is now in the chair, not just sitting in it.]

## What stays constant across all three.

[2 sentences. The principles he brings regardless of phase — brand integrity,
craft standard, AI fluency, team investment.]

WRITING RULES:
- Write in first person as John would say it in the interview room.
- Plain spoken executive English. No bullet lists. No buzzwords.
- Each phase should be 50–75 words.
- Be specific to the target company — use their vocabulary and known context.
- The deliverables must be concrete and nameable, not vague ("a report").
- This should sound like something a calm, senior person would say out loud
  in a real interview — not a consulting deck.
- Do not include any preamble or explanation outside the four sections.
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

  const { companyName, brandBrief, watchOuts } = body;

  if (!companyName) {
    return Response.json({ error: "Missing companyName." }, { status: 400 });
  }

  const userMessage = `
TARGET COMPANY: ${companyName}

BRAND CONTEXT:
${brandBrief.trim()}

KNOWN CHALLENGES (watch-outs for this company):
${watchOuts.map((w, i) => `${i + 1}. ${w}`).join("\n")}

Generate John's 30-60-90 day plan for joining ${companyName} as Creative Director.
Make it quotable in an interview — specific, confident, and in his voice.
`.trim();

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 700,
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
          encoder.encode(`\n\n[plan error: ${String(err)}]`),
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
