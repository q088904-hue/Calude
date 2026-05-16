// POST /api/stagecraft/recruiter
// Analyzes a recruiter message or job description and returns:
//   1. A drafted reply in John's voice (40-60 words)
//   2. 5 likely first-call questions based on the message + John's profile
//   3. A reading on role fit and any red-flag gaps to address
//
// Returns structured JSON (not streamed) — compact enough for one call.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL =
  process.env.STAGECRAFT_ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface Body {
  message: string;       // raw recruiter message or JD paste
  companyHint?: string;  // optional: "Kohler India", "Marriott Dubai", etc.
}

export interface RecruiterPayload {
  reply: string;
  questions: { question: string; why: string }[];
  fitNotes: string; // 1-2 sentences on alignment + gaps to address on the call
  detectedCompany: string | null;
  detectedRole: string | null;
}

const SYSTEM_PROMPT = `
You are a senior executive career coach helping John Viju — Creative Director,
20+ years experience (18 at Datamatics Global Services), now targeting premium
consumer brands in Mumbai, Dubai, and Singapore.

His profile:
- Led 100+ global campaigns/year, 6-person team
- Built the brand system and DAM from scratch
- AI-driven production pipeline (N8N + HeyGen + ElevenLabs, ~40% faster)
- Multi-craft: branding, motion, 3D/AR, UI/UX
- Moving from enterprise B2B → premium consumer/hospitality
- Currently in Mumbai; open to Dubai and Singapore relocation

When given a recruiter message or job description, return EXACTLY this JSON object
with no preamble, no markdown fence, no extra keys:

{
  "detectedCompany": "Company name or null",
  "detectedRole": "Role title or null",
  "reply": "Drafted reply email/message. 40-60 words. Senior tone — warm but not eager. First person. Confirms interest, mentions one specific differentiator (AI pipeline or brand systems), proposes a time. No sycophancy.",
  "questions": [
    {
      "question": "A likely first-call question",
      "why": "One sentence: why this recruiter will ask it given the role and John's profile."
    }
  ],
  "fitNotes": "1-2 sentences on role-profile alignment AND the key gap John should address proactively on the call."
}

QUESTIONS RULES:
- Exactly 5 questions.
- Ordered: easiest/warmest first, hardest last.
- Q1 is always a background/intro question.
- Q4-5 must include at least one of: the 18-year tenure question, the B2B→consumer pivot, or salary expectations — whichever is most relevant to this role.
- Tailor questions to what this specific recruiter/company will care about.
- Never invent questions that have no relation to the role or message.

REPLY RULES:
- Write as John would speak — plain, confident, senior.
- Include exactly one differentiator (choose the most relevant one).
- Propose a call window (e.g. "this week or next").
- Do not use the word "passionate" or "excited" or "opportunity."
- Maximum 60 words.

FIT NOTES RULES:
- Be honest. If there's a real gap (no hospitality experience, no luxury brand), say so.
- End with what John should address proactively on the call, not how to hide it.
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

  const { message, companyHint } = body;

  if (!message?.trim()) {
    return Response.json({ error: "Missing message." }, { status: 400 });
  }

  const userMessage = `
${companyHint ? `COMPANY CONTEXT HINT: ${companyHint}\n\n` : ""}RECRUITER MESSAGE / JD:
"""
${message.trim()}
"""

Return the JSON object now.
`.trim();

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.35,
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
      response.content[0]?.type === "text" ? response.content[0].text : "";

    let parsed: RecruiterPayload;
    try {
      parsed = JSON.parse(raw) as RecruiterPayload;
    } catch {
      // Strip potential markdown fences
      const stripped = raw.replace(/```(?:json)?\n?/g, "").trim();
      parsed = JSON.parse(stripped) as RecruiterPayload;
    }

    return Response.json(parsed);
  } catch (err) {
    return Response.json(
      { error: "Analysis failed.", detail: String(err) },
      { status: 500 },
    );
  }
}
