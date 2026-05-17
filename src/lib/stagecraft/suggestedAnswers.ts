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
    "The way I think about this is simple — I'm not leaving something, I'm moving toward it. [pause] Eighteen years gave me range: brand systems, a six-person team, **100+ campaigns a year**, and an AI pipeline I built from scratch. What changed is the work I want next — premium, design-led, global. That is the direction I am moving in.",
  note: "Reframes the risk; 'moving toward', not 'running from'.",
});

// ─── QuickFire bank ──────────────────────────────────────────────────────────

add("Why Kohler? What draws you to this brand specifically?", {
  answer:
    "For me, the draw is design that has genuine stakes — where craft translates into something people live with, not just click past. [pause] Kohler is serious about its design language in a way most brands are not. After 18 years shaping a B2B brand at scale, I want work where **design conviction drives the product, not just the packaging**. That is what I would bring here.",
  note: "Specific about design seriousness; avoids flattery; bridges B2B experience to consumer aspiration.",
});

add(
  "Tell me about your AI workflow — what did you actually build, and what changed because of it?",
  {
    answer:
      "My approach is simple — identify the bottleneck, then build around it. [pause] Video production was our biggest constraint: a two-day cycle per asset. I built an N8N pipeline integrating HeyGen and ElevenLabs with brand checkpoints at each stage. **The cycle dropped from two days to under two minutes.** Campaign production got about forty percent faster overall. That is the approach that has worked for me.",
    note: "Uses only verified realNumbers; explains the build and the measurable outcome clearly.",
  },
);

add("Walk me through your biggest creative leadership challenge.", {
  answer:
    "What I have found is that the hardest challenges are structural, not creative. [pause] At Datamatics the brand had drifted across business units through acquisitions. I led a cross-unit audit, rebuilt the design system, and rolled it out with review checkpoints — all while active campaigns kept shipping. **Every unit landed under one consistent identity within two cycles, with no campaign delays.** That is how it gets done.",
  note: "Directly maps to the Brand Transformation STAR story; no invented metrics.",
});

add(
  "How do you balance creative direction with business objectives when they conflict?",
  {
    answer:
      "Creative work earns respect through results, not arguments. [pause] When they conflict, I ask what the business objective actually is, then find the creative execution that serves it best. Sometimes I push back with data; sometimes I adapt. **The goal is always to make the business case for the better idea**, not to win a creative argument. That is the discipline.",
    note: "Shows executive maturity; frames creative as a business tool, not an ego exercise.",
  },
);

add(
  "What does a premium consumer brand like Kohler need from a Creative Director that a B2B brand doesn't?",
  {
    answer:
      "Over twenty years, what I have learned is that B2B design earns attention. [pause] Premium consumer design creates desire — it works before a single word is read. Kohler needs someone who thinks about **emotional resonance first, information second** — someone who understands that a bathroom fixture can carry aspiration. My B2B background gave me rigour. The work I want next demands taste. That is what I would bring here.",
    note: "Calm reframe for a hot question; names the real distinction without being defensive about B2B.",
  },
);

add("How would you describe your leadership style to your team?", {
  answer:
    "Direction without trust is just micromanagement. [pause] I set the bar with a brief and a reference, then give people space to do the work. I review for concept strength, consistency, and execution quality. If someone is stuck, I get into it with them. **I lead by staying close to the craft**, not by delegating it entirely. That is what the team needs from a CD.",
  note: "Matches voiceSamples cadence on balance and trust; specific about review criteria.",
});

add(
  "What is your biggest professional weakness — and what are you doing about it?",
  {
    answer:
      "The thing that matters here is being honest rather than diplomatic. [pause] My weakness is impatience when execution quality slips — I notice it fast, and I have to decide: fix it or coach through it. I have been deliberate about building the team's craft so I rescue less. **The goal is a team that holds the standard without me patching gaps.** That is the bar I hold myself to.",
    note: "Vulnerability question handled with self-awareness; turns weakness into a growth arc, not a script.",
  },
);

add(
  "Describe a time you had to push back on a senior stakeholder's creative direction.",
  {
    answer:
      "In my experience, pushback works best when it is educational, not confrontational. [pause] A senior stakeholder wanted dense, cluttered layouts; the brand needed to breathe. I brought comparison work and eye-tracking precedents to the room and explained the why behind minimalism. I did not argue — I showed. **The stakeholder ended up championing the minimal direction** in the next review. That is how I think about it.",
    note: "Maps directly to Stakeholder Conflict STAR story; shows influence through education, not hierarchy.",
  },
);

add(
  "How do you keep a creative team motivated during a long, grinding project?",
  {
    answer:
      "For me, the answer is visibility and ownership. [pause] Long projects hollow out motivation when people feel like production hands, not contributors. I break the work into stages with clear milestones, assign ownership to individuals rather than tasks, and call out good work publicly. **Momentum comes from seeing your contribution land**, not from a pep talk. That is what I have found works.",
    note: "Concrete in its approach; no generic motivational language; references observable actions.",
  },
);

add(
  "You're coming from 18 years at one company. How do we know you can adapt quickly?",
  {
    answer:
      "What I have found is that tenure is not the same as stagnation. [pause] In 18 years I moved through full rebrands, tool migrations, team builds from scratch, and building an AI pipeline no one had asked for yet. Every two or three years the brief changed substantially. **I adapted because the work demanded it**, not because someone told me to. Change is something I seek out.",
    note: "Calm reframe for a high-risk question; uses concrete evidence of change-inside-tenure.",
  },
);

add("How do you approach building a brand system from scratch?", {
  answer:
    "Good brand work starts with diagnosis, not prescription. [pause] I start by understanding what the brand is trying to say, who it is talking to, and what competitive space it is in. Then I build in layers: foundations first, components second, applications last. **The system has to hold without me in the room** — that is the test I apply at every stage. That is the standard I build toward.",
  note: "Craft question; shows structured thinking and a clear personal quality bar.",
});

add("What would your first 30 days look like in this role?", {
  answer:
    "You cannot lead well what you do not yet understand. [pause] The first thirty days are for listening — the team, the brand's current state, the brief backlog, where the gaps are. I would not redesign anything in week one. **My goal is to know exactly what deserves to change and what must be protected** before I touch anything. That is how I earn the right to lead it.",
  note: "Shows strategic patience; avoids the generic 'hit the ground running' answer.",
});

add("Tell me about a time a project failed. What happened?", {
  answer:
    "The clearest lessons I have had come from pressure, not comfort. [pause] I have managed windows where three global events overlapped with shared deliverables — the thing that saved us was a priority layer: essential versus nice-to-have decided upfront, then a fast review loop. **What I changed after that is how I scope every high-stakes brief from the start.** That is the discipline failure taught me.",
  note: "Draws on the High-Pressure Deadlines STAR story's hard moment and process change; no invented incident, metric, client, or outcome.",
});

add(
  "You've had 18 years of stability. Honestly — aren't you too comfortable to thrive in a high-pressure premium brand?",
  {
    answer:
      "The thing that matters here is what the 18 years actually looked like. [pause] Eighteen years at one company does not mean 18 years of the same work. I built a team, rebuilt a brand system, shipped **100+ campaigns a year**, and built an AI pipeline from scratch. Comfort was never an option. High-pressure is where I have always operated best.",
    note: "Curveball; stays calm and non-defensive; uses realNumbers to disprove the premise.",
  },
);

add(
  "Convince me in 30 seconds that your B2B enterprise work translates to a design-led consumer brand. Go.",
  {
    answer:
      "Strip away the category and the discipline is identical — brand clarity, system thinking, execution at scale. [pause] I have run **100+ global campaigns a year** with a six-person team across markets and time zones. B2B taught me to make design work hard under constraints. Consumer design asks for desire. The foundations are the same; the emotional register shifts. That is the translation.",
    note: "Curveball; 30-second format handled with confidence; no rambling; stays under word limit.",
  },
);

add(
  "If we hired you and six months in the board asked 'what has the new Creative Director actually changed?' — what would the honest answer be?",
  {
    answer:
      "Visible change and meaningful change are not always the same thing. [pause] In six months I would expect a clearer brief-to-review loop, the brand system documented and enforced, and at least one AI workflow running. **The board would see tighter, faster, more consistent creative output** — and the team would feel why. That is what real change looks like from the inside.",
    note: "Executive question; names concrete deliverables without overpromising; connects output to team culture.",
  },
);

add(
  "How do you measure the business impact of creative work to a CFO who thinks design is decoration?",
  {
    answer:
      "My approach is simple — speak in the language they already trust. [pause] I do not argue about aesthetics with a CFO. I connect creative decisions to metrics they own: conversion, retention, time-to-market, cost-per-asset. When I built the AI video pipeline, the story was not 'it looks better' — it was **'the same output in under two minutes instead of two days.'** That is how I think about it.",
    note: "Hot executive question; bridges creative to business language using the AI pipeline as proof.",
  },
);

add(
  "Singapore — Marina Bay Sands runs gaming, hospitality, retail and events under one roof. How do you hold brand coherence across verticals that pull in different directions?",
  {
    answer:
      "The way I think about this is — a brand system is what holds when the verticals pull apart. [pause] Each vertical can own its tone and audience while the master brand supplies the foundations: design language, colour logic, typography, spatial standards. At Datamatics I unified multiple business units under one identity without slowing any of them down. **The principle is shared foundations, flexible expression.** That is the model.",
    note: "Brand System question for Singapore; maps Datamatics brand unification story to MBS context.",
  },
);

add(
  "Pidilite — Fevicol is a 60-year-old cultural icon. How do you modernise a brand like that without breaking the trust that built it?",
  {
    answer:
      "Evolution, not revolution — and a deep respect for what is already working. [pause] Iconic brands earn their equity over decades. You modernise the execution — digital formats, motion, visual freshness — while keeping the core idea completely intact. **The brief is never 'reinvent Fevicol' — it is 'bring Fevicol into now without losing what people love.'** That is what brand stewardship means.",
    note: "Brand Fit question; shows cultural sensitivity and strategic restraint; no overconfidence.",
  },
);

add(
  "Your AI pipeline cut production from days to minutes. What did that do to the six people on your team — and how did you handle it?",
  {
    answer:
      "Over twenty years, what I have learned is that automation changes roles, not always headcount. [pause] The pipeline removed the repetitive assembly work — rendering, voice-over syncing, format resizing. What it freed was time for **upstream creative thinking**: concept, direction, quality control. I was transparent about what was changing and why. The team moved up the stack, not out of the picture. That is the leadership responsibility.",
    note: "Hot AI Story question; honest about the impact; shows human-centred leadership through the transition.",
  },
);

// ─── Drill bank ──────────────────────────────────────────────────────────────
// (populated in a later task)

// ─── Negotiate scenarios ─────────────────────────────────────────────────────
// (populated in a later task)

// ─── Company packs ───────────────────────────────────────────────────────────
// (populated in a later task)
