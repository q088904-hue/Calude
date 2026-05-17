// Deterministic, hand-authored suggested answers for Stagecraft's fixed
// question banks. Static by design: same question → same answer, every
// session, every device. No API, no storage. Authoring rubric lives in
// docs/superpowers/plans/2026-05-17-stagecraft-suggested-answers.md.

export interface SuggestedAnswer {
  /** Speakable answer. May contain [pause] and **bold** delivery markers. */
  answer: string;
  /** Optional one-line rationale. Not rendered by default. */
  note?: string;
}

/** Normalize a question so wording/punctuation variants resolve to one key. */
export function normalizeQuestion(q: string): string {
  return q
    .replace(/[''""]/g, (m) => (m === "'" || m === "'" ? "'" : '"'))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** key = normalizeQuestion(originalQuestion) */
const ANSWERS: Record<string, SuggestedAnswer> = {};

export function getSuggestedAnswer(question: string): SuggestedAnswer | null {
  return ANSWERS[normalizeQuestion(question)] ?? null;
}

/** Internal: register an answer under its normalized question key. */
function add(question: string, entry: SuggestedAnswer): void {
  ANSWERS[normalizeQuestion(question)] = entry;
}

add("Tell me about yourself.", {
  answer:
    "In my experience, the cleanest open is three things — what I do, where, and what's different. [pause] I'm a creative and brand leader with 20+ years, the last 18 at Datamatics, leading a team of six on **100+ global campaigns a year**. The last three years I've rebuilt our workflow with AI — production went from days to minutes. That is the approach that has worked for me.",
  note: "Three-beat open; one real number; AI pivot is the differentiator.",
});

add("Why are you looking to move after 18 years at Datamatics?", {
  answer:
    "The way I think about this is simple — I'm not leaving something, I'm moving toward it. [pause] Eighteen years gave me range: brand systems, a six-person team, **100+ campaigns a year**, and an AI pipeline I built from scratch. What changed is the work I want next — premium, design-led, global. That is what I would bring here.",
  note: "Reframes the risk; 'moving toward', not 'running from'.",
});

// ─── QuickFire bank ──────────────────────────────────────────────────────────
// (populated in a later task)

// ─── Drill bank ──────────────────────────────────────────────────────────────
// (populated in a later task)

// ─── Negotiate scenarios ─────────────────────────────────────────────────────
// (populated in a later task)

// ─── Company packs ───────────────────────────────────────────────────────────
// (populated in a later task)
