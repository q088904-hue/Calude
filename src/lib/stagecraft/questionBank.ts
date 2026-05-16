// Curated question pool for Stagecraft.
// Questions within each category are ordered easy → hard so that
// difficulty-biased picking naturally surfaces appropriate questions.
//
// Bank size: 18 HR · 18 HM · 16 Portfolio · 16 Leadership · 18 Stress = 86 total.
// A 10-question single-round session will never repeat; mixed sessions
// at any length stay fresh.

import type { Round } from "./types";

export const questionBank: Record<Exclude<Round, "mixed">, string[]> = {
  // ── HR / Screening ──────────────────────────────────────────────────────────
  // Ordered: opener → background → motivation → logistics → pressure
  hr: [
    // Openers (easy)
    "Tell me about yourself.",
    "Walk me through your background in 90 seconds.",
    "What does your current role look like day-to-day?",

    // Background probes (medium-easy)
    "How large is your current team, and what do you own directly versus delegate?",
    "What tools and platforms does your team rely on, and which do you champion?",
    "Have you managed external creative agencies? How do you keep them on brief?",
    "What does a creative review process look like in your organisation right now?",

    // Motivation (medium)
    "What are you looking for in your next role that you are not getting now?",
    "Why now — what has changed to make this the right moment to move?",
    "What do you know about our company and our brand?",
    "Why this industry specifically?",

    // Fit and culture (medium-hard)
    "How would you describe your personal design philosophy in one sentence?",
    "What kind of company culture brings out your best creative work?",
    "How do you stay current with design trends without chasing them?",
    "Tell me about your relationship with the commercial side of the business.",

    // Logistics (varies)
    "What are your salary expectations and notice period?",
    "Are you open to relocation or extended travel?",

    // Harder closer
    "You have had a long tenure at one company. What have you done to keep growing?",
  ],

  // ── Hiring Manager ──────────────────────────────────────────────────────────
  // Ordered: strategy → team → process → stakeholder → pressure
  "hiring-manager": [
    // Strategy and fit (medium-easy)
    "Why this company and why this role?",
    "What would you do in your first 90 days?",
    "How would you raise the creative bar of an existing team quickly?",

    // Team and leadership (medium)
    "Describe your leadership style with a specific example.",
    "How do you structure a creative team for quality and speed?",
    "How do you hire? What do you look for beyond portfolio quality?",
    "What is the first thing you would do to understand an inherited team's strengths?",

    // Process (medium)
    "How do you measure creative success beyond awards and likes?",
    "How do you balance brand consistency with the need for creative freshness?",
    "What does good creative feedback look like from a leader?",
    "How do you protect your team's focus in a deadline-driven environment?",

    // Stakeholder and cross-functional (medium-hard)
    "How do you handle a brief you believe is strategically wrong?",
    "What does a healthy relationship between creative and marketing look like?",
    "Describe a time you had to rebuild trust between creative and a key stakeholder.",
    "How do you brief an agency and then evaluate what they return?",

    // Pressure questions (hard)
    "How would you approach the first six months if the existing team is resistant to change?",
    "What would you do if your best creative person resigned in your first 90 days?",
    "You would be inheriting a team. What is the single most important thing you would change, and why?",
  ],

  // ── Portfolio / Creative Direction ──────────────────────────────────────────
  // Ordered: openers → process → judgment → pressure critique
  portfolio: [
    // Openers (easy-medium)
    "Walk me through your strongest piece of work.",
    "What does premium design mean to you?",
    "How do you define brand equity, and how does design protect it?",

    // Process (medium)
    "What does your creative process look like from brief to final output?",
    "How do you know when a design is ready to present to a stakeholder?",
    "Walk me through a rebrand or brand evolution you led.",
    "How has AI changed your creative process in the last two years?",

    // Judgment and taste (medium-hard)
    "Tell me about a campaign that failed creatively. What would you do differently?",
    "How do you approach a brand that has lost its creative voice?",
    "Show me a project where you disagreed with the brief. What happened?",
    "How do you make design decisions when stakeholders pull in different directions?",

    // Cultural and contextual (medium-hard)
    "What does motion and digital design add to a brand that static cannot?",
    "How do you design for different cultures — what changes between India, the UAE, and Southeast Asia?",

    // Pressure critique (hard)
    "Critique our current brand honestly — what would you change and why?",
    "Talk about a piece of work you were proud of that was rejected. How did you respond?",
    "What is one genuine weakness in your portfolio, and what are you doing about it?",
  ],

  // ── Leadership / CXO ────────────────────────────────────────────────────────
  // Ordered: vision → function-building → AI → business → pressure
  leadership: [
    // Vision (medium)
    "Where do you see the creative function in three years?",
    "What is the role of the Creative Director in the age of AI generation tools?",
    "How do you define the difference between a creative manager and a creative leader?",

    // Function-building (medium)
    "How do you build creative culture in a B2B or enterprise environment?",
    "Walk me through how you built or scaled a creative function from the ground up.",
    "How do you balance top-down creative direction with bottom-up input from your team?",

    // AI and future of work (medium-hard)
    "What is changing in creative leadership because of AI, and what is not?",
    "How would you approach integrating AI into this team's workflow in year one?",
    "How do you ensure AI tools raise quality rather than lower the creative floor?",

    // Business and stakeholder (medium-hard)
    "How do you defend creative budget to a CFO who sees design as a cost centre?",
    "How do you build the case for design as a business function, not a service function?",
    "Describe a time you influenced a strategic decision through design thinking.",
    "How do you manage up — presenting creative work to a CMO or CEO?",

    // Pressure (hard)
    "Tell me about a time you failed as a leader. What did you learn?",
    "What is the most difficult personnel decision you have made, and would you make it again?",
    "What is the role of data in your creative decision-making, and where does intuition take over?",
  ],

  // ── Curveball / Stress ──────────────────────────────────────────────────────
  // Ordered: gentle challenge → identity challenges → company-specific → hardest
  stress: [
    // Gentle challenges (medium)
    "What is a strong opinion you hold about design that most people disagree with?",
    "What would make you walk away from this role in the first six months?",
    "What is one thing you would never compromise on creatively?",

    // Tenure and identity challenges (medium-hard)
    "You have been at one company for a long time — are you too comfortable to adapt?",
    "You have spent your career in B2B enterprise. We are a premium consumer brand. Why should we believe you can make that shift?",
    "Your tenure at one company is long. How do we know you are not just institutionalised?",

    // Age and team dynamics (hard)
    "You are more senior than most of our current creative team. How will that dynamic work?",
    "What would your current team say is your biggest weakness as a leader, honestly?",

    // Company-specific pressure (hard)
    "Our brand is not yet as design-led as the top tier. Why would you join rather than wait for a brand that is already there?",
    "Our last Creative Director lasted 18 months. What would you do differently?",
    "Our CEO does not believe design drives revenue. How would you change that in year one?",

    // Hypotheticals (hard)
    "If we gave you a blank brief tomorrow with no constraints, what is the first question you would ask?",
    "Sell me the idea of hiring you over a Creative Director who has already worked at a premium consumer brand.",
    "How do you respond when a senior stakeholder publicly criticises your team's work?",

    // Hardest closers
    "You are interviewing at multiple companies. If everyone offers, why would you choose us?",
    "If we say no today, what specifically would you do differently in your next interview?",
    "What are you most afraid of in this role?",
  ],
};

const allRounds: Exclude<Round, "mixed">[] = [
  "hr",
  "hiring-manager",
  "portfolio",
  "leadership",
  "stress",
];

/**
 * Picks a question for the given round and index.
 *
 * Difficulty biasing:
 *   warm-up  → first 55% of the pool (opener / gentle questions)
 *   realistic → full pool
 *   tough    → last 60% of the pool (harder, more pressure)
 *
 * Already-asked questions are always filtered first; the bias is applied
 * after filtering so the session never repeats even in short pools.
 */
export function pickQuestion(opts: {
  round: Round;
  index: number; // 1-based question number in the session
  total: number;
  alreadyAsked: string[];
  difficulty: "warm-up" | "realistic" | "tough";
}): { round: Round; question: string } {
  const { round, index, total, alreadyAsked, difficulty } = opts;

  // Resolve round for mixed / stress injection
  let activeRound: Exclude<Round, "mixed">;
  if (round === "mixed") {
    // Inject one stress curveball every 7 questions after Q1 (realistic/tough only)
    if (difficulty !== "warm-up" && index > 1 && index % 7 === 0) {
      activeRound = "stress";
    } else {
      activeRound = allRounds[(index - 1) % allRounds.length];
    }
  } else {
    activeRound = round;
    // Anti-monotony: in realistic difficulty, inject a stress curveball ~1 in 8
    if (
      difficulty === "realistic" &&
      activeRound !== "stress" &&
      index > 2 &&
      index % 8 === 0
    ) {
      activeRound = "stress";
    }
  }

  const fullPool = questionBank[activeRound];
  const fresh = fullPool.filter((q) => !alreadyAsked.includes(q));
  const candidates = fresh.length > 0 ? fresh : fullPool; // fallback: allow repeats

  // Apply difficulty bias to the candidate slice, then pick randomly.
  // Random selection means sessions don't repeat the same opening question
  // every time — the pool feels twice as large after a few sessions.
  const biasedCandidates = applyDifficultyBias(candidates, difficulty);
  const chosen =
    biasedCandidates[Math.floor(Math.random() * biasedCandidates.length)];

  void total; // reserved for future session-length weighting
  return { round: activeRound, question: chosen };
}

/**
 * Returns a slice of the pool based on difficulty.
 * Questions are ordered easy→hard within each category, so slicing
 * from the front (warm-up) or back (tough) surfaces the right tier.
 */
function applyDifficultyBias(
  pool: string[],
  difficulty: "warm-up" | "realistic" | "tough",
): string[] {
  if (pool.length <= 3) return pool; // pool too small to slice meaningfully

  if (difficulty === "warm-up") {
    // First ~55% — opener and context questions
    return pool.slice(0, Math.ceil(pool.length * 0.55));
  }
  if (difficulty === "tough") {
    // Last ~60% — harder questions dominate, but opener variety preserved
    return pool.slice(Math.floor(pool.length * 0.4));
  }
  // realistic: full pool
  return pool;
}
