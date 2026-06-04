// POST /api/stagecraft/portfolio
// Generates 3 escalating critique challenges for a described portfolio piece.
// The challenges are persona-specific (Kohler CD, CMO, or CFO).
// Returns a plain-text stream of JSON: { challenges: [string, string, string] }

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  portfolioDescription: string;
  criticPersona: "kohler-cd" | "cmo" | "cfos";
}

const CRITIC_CONTEXT: Record<
  Body["criticPersona"],
  { label: string; angle: string }
> = {
  "kohler-cd": {
    label: "Kohler Design Lead",
    angle: `You are a Principal Design Lead at Kohler — 15 years building premium
consumer products. You care about restraint, system thinking, and the
craft behind every decision. You're skeptical of B2B / enterprise work
making the jump to premium consumer. You probe for taste-level thinking,
not just executional craft. Your critiques are precise and design-specific.`,
  },
  cmo: {
    label: "CMO / VP Marketing",
    angle: `You are a CMO at a global premium brand. You care about brand
coherence, measurable impact, and whether the creative moved business
metrics. You're not interested in aesthetic self-indulgence. Your
critiques press on business rationale, audience insight, and what the
numbers actually showed.`,
  },
  cfos: {
    label: "Skeptical CFO / Cost Challenger",
    angle: `You are a CFO who has sat in too many creative reviews. Your default
question is: "What did we get for the money?" You challenge
cost-to-impact ratios, timelines, and whether the production investment
was justified by the outcome. You're not hostile — you're forensic.`,
  },
};

const SYSTEM_PROMPT = `
You are a senior interview preparation coach generating portfolio defence
challenges for a Creative Director (20+ years, enterprise / global brand
background, targeting premium consumer and hospitality brands).

Given a portfolio piece description and a critic persona, return EXACTLY
this JSON — nothing else, no markdown fence, no preamble:

{
  "challenges": [
    "challenge 1 — the softest probe, opens the conversation",
    "challenge 2 — presses harder on the weakest assumption in the work",
    "challenge 3 — the sharpest challenge, hits at creative rationale OR business impact OR process under pressure"
  ]
}

Rules:
- Each challenge is a single question (30–55 words). Specific to the piece described.
- Challenge 1: genuine curiosity, not hostile. Gets the candidate talking.
- Challenge 2: surfaces the tension between craft and business. Doesn't let vague claims slide.
- Challenge 3: the hardest question. If the answer is weak here, they won't get the offer.
- Do NOT use "walk me through" in more than one challenge.
- Never ask about team size, org chart, or process logistics — this is about the work.
- The challenges must be about THIS specific piece, not generic portfolio questions.
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

  const { portfolioDescription, criticPersona } = body;

  if (!portfolioDescription?.trim()) {
    return Response.json(
      { error: "Missing portfolioDescription." },
      { status: 400 },
    );
  }

  const critic = CRITIC_CONTEXT[criticPersona] ?? CRITIC_CONTEXT["kohler-cd"];

  const userMessage = `
CRITIC PERSONA: ${critic.label}
${critic.angle}

PORTFOLIO PIECE DESCRIBED BY THE CANDIDATE:
"""
${portfolioDescription.trim()}
"""

Generate the three challenges now. Return only the JSON object.
`.trim();

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
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

    const raw =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    // Validate JSON before returning
    let parsed: { challenges: string[] };
    try {
      parsed = JSON.parse(raw) as { challenges: string[] };
    } catch {
      // If the model wrapped it in fences, strip them
      const stripped = raw.replace(/```(?:json)?\n?/g, "").trim();
      parsed = JSON.parse(stripped) as { challenges: string[] };
    }

    return Response.json(parsed);
  } catch (err) {
    return Response.json(
      { error: "Challenge generation failed.", detail: String(err) },
      { status: 500 },
    );
  }
}
