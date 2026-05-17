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

add("Why Kohler? What draws you to this role specifically?", {
  answer:
    "The role caught my attention for a specific reason — it is not a brand-building position, it is a craft position. [pause] Kohler leads with design conviction in a category that usually leads with function. After 18 years building a B2B brand system at scale, I want work where **the design quality is the product**, not the wrapper around it. That is the fit I am looking for.",
  note:
    "Distinguishes role-fit from brand-flattery; bridges B2B tenure to a craft-led aspiration without inventing specifics.",
});

add(
  "Walk me through the AI pipeline you built — what problem did it solve, and what did it change?",
  {
    answer:
      "Start with the problem, not the tool — video production was a two-day cycle per asset, which made campaigns slow and expensive to iterate. [pause] I built an N8N pipeline integrating HeyGen and ElevenLabs with brand checkpoints at each stage. **The cycle dropped from two days to under two minutes**, and campaign production got roughly forty percent faster overall. That is what the pipeline actually changed.",
    note:
      "Business-problem-first structure per drill context; all metrics from realNumbers (2-day→2-min, ~40% faster).",
  },
);

add(
  "Tell me about a time you had to lead a team through a major creative direction change.",
  {
    answer:
      "A real direction change tests the team before it tests the work. [pause] At Datamatics the brand had drifted across acquisitions, and my task was to unify it without pausing active campaigns. I led a cross-unit audit, rebuilt the design system, and staged the rollout with review checkpoints. **Every unit landed under one consistent identity within two cycles, with no campaign delays.** That is what leading through change looks like.",
    note:
      "Full STAR via Brand Transformation story; result stated explicitly; no invented metrics.",
  },
);

// ─── Negotiate scenarios ─────────────────────────────────────────────────────

add(
  "What is your current CTC? We need to understand where you are before we can discuss an offer.",
  {
    answer:
      "Respectfully, that number is not the right starting point for either of us. [pause] What matters is the scope of this role and what the market pays for it. **I am targeting the range that reflects market value for a Creative Director at this level** — and I would rather anchor there than to a figure from a different context. Can we start from that basis?",
    note:
      "Deflects current CTC disclosure; redirects firmly to market value and role scope without revealing or inventing a number.",
  },
);

add("What are your salary expectations for this role?", {
  answer:
    "Based on the scope and the market for a Creative Director at this level, I am anchoring at the upper end. [pause] This role carries brand strategy, team leadership, and execution at scale — **the number that reflects that combination sits at the high end of the market band for senior creative leadership here**. I am looking at a range where that market rate is my floor, not my ceiling.",
  note:
    "Anchors high using market and scope framing; no fabricated figure; backs the position with role complexity.",
});

add(
  "That is above our budget. We were thinking more in the ₹42–48L range. Can you work with that?",
  {
    answer:
      "Before we move on numbers, let us make sure we are comparing the same thing. [pause] The ₹42–48L range does not account for a team of six, an AI-driven pipeline, and 100+ campaigns a year in-house. **The question is not whether I can work with that range, but whether it reflects the full value of this role.** It does not — and that is the conversation I want to have.",
    note:
      "Reframes without countering numerically first; challenges the anchor with scope and value, not a competing number.",
  },
);

add(
  "I appreciate the context, but we need a specific number from you right now to move this forward.",
  {
    answer:
      "Fair enough — here it is. [pause] My number is the top of the market band for a Creative Director leading brand, team, and AI workflow at this scope. **That is the figure I am standing on, and I am comfortable with the silence that follows it.** I am not hedging, and I am not negotiating against myself. The number stands.",
    note:
      "Names aspiration as 'top of market band' without fabricating a figure; calm, no apology, lets silence hold.",
  },
);

add(
  "Our final offer is ₹62L CTC. This is the best we can do. Can we move forward?",
  {
    answer:
      "I appreciate you getting there — ₹62L works as the base. [pause] Before we close, I want to ask for one thing: an accelerated performance review at six months rather than twelve, with a defined compensation trigger tied to it. **A six-month review with a pre-agreed uplift mechanism is a clean way to bridge the gap and gives us both a milestone to work toward.** Can we build that in?",
    note:
      "Accepts with a condition; echoes the ₹62L from the scenario question; asks for one more thing cleanly without rejecting the offer.",
  },
);

// ─── Company packs ───────────────────────────────────────────────────────────

// Kohler India
add("Why are you looking to move after 18 years at Datamatics?", {
  answer:
    "Eighteen years is not the story — what I built inside those years is. [pause] Brand systems, a six-person team, 100+ global campaigns a year, and an AI pipeline I designed from the ground up. **The work I want next is design-led, premium, and consumer-facing** — and Kohler is exactly where that ambition points. That is the move I am making.",
  note:
    "Forward-looking reframe; echoes realNumbers; bridges tenure to aspiration without sounding like an escape.",
});

add(
  "You have spent your career in B2B enterprise. We are a premium consumer brand. Why should we believe you can make that shift?",
  {
    answer:
      "The discipline is the same — the register changes. [pause] B2B taught me to make design earn its place under constraint, across markets, at scale. What changes for a premium consumer brand is the emotional load the work must carry. I understand that distinction clearly. **I am not unlearning B2B — I am applying its rigour to work that now needs to move people**, not just inform them.",
    note:
      "Covers Kohler and Emaar (shared question text); calm reframe; no fabricated consumer experience.",
  },
);

add("Critique our current brand honestly — what would you change and why?", {
  answer:
    "Critiquing with respect is how I think about this. [pause] Kohler's global brand is restrained, material-honest, and earns its premium positioning consistently. What I notice in the India market is occasional moments where the visual language over-explains — it trusts the product to speak less than it should. **My instinct would be to let the craft carry more weight and the copy carry less.** That is the direction I would push.",
  note:
    "Uses Kohler's own companyPack vocabulary; no invented facts; grounded critique that shows taste, not arrogance.",
});

add("What does premium design mean to you?", {
  answer:
    "Premium is not about cost — it is about intention. [pause] A premium piece of design removes everything that does not need to be there, then makes what remains work harder than you thought possible. It is restraint with confidence. **Premium is when the absence of something communicates as much as the presence of something.** That is the bar I apply to my own work.",
  note:
    "Craft philosophy question; no fabricated metric; matches Kohler's vocabulary of restraint and earned elegance.",
});

add(
  "How would you approach integrating AI into this team's workflow in year one?",
  {
    answer:
      "Year one is about removing the friction that slows good creative down. [pause] I have done this before — built an N8N pipeline integrating HeyGen and ElevenLabs that cut video production from two days to under two minutes. The principle is the same here: **identify the highest-volume bottlenecks, automate the assembly, and protect the craft decisions for human judgment.** By month twelve, the team should be working faster without working harder.",
    note:
      "Covers Kohler AI question; uses only verified realNumbers; concrete roadmap in 40–70 words.",
  },
);

add(
  "Your tenure at one company is long. How do we know you are not just institutionalised?",
  {
    answer:
      "Institutionalisation is choosing comfort over challenge — I have done the opposite. [pause] In 18 years I ran full rebrands, built a team from scratch, overhauled our production system twice, and designed an AI pipeline before anyone asked for one. **Each of those was a choice to make things harder in the short term because the long-term output demanded it.** That is not institutionalisation — that is how I operate.",
    note:
      "Stress question; non-defensive reframe; draws on real career evidence without inventing numbers.",
  },
);

// Hettich India
add("What do you know about our company and our brand?", {
  answer:
    "Hettich is 130 years of German precision — hinges, drawer systems, sliding hardware built on the idea that functional beauty is not a compromise. [pause] In India, the brand works through architects, interior designers, and builders — specification marketing rather than mass consumer. **What distinguishes Hettich is the discipline to make precision visible**, not just functional. That is a creative brief I find genuinely compelling.",
  note:
    "HR round brand knowledge answer; all facts sourced from companyPacks.ts; no fabricated specifics.",
});

add("How do you measure creative success beyond awards and likes?", {
  answer:
    "Awards tell you how the industry feels — they do not tell you if the work is doing its job. [pause] I measure success through the brief: did it reach the right audience, did it move a metric the business cares about, is the brand more consistent six months later? **The metric I trust most is how much less we have to explain ourselves** to clients. That signals clarity.",
  note:
    "Hettich metric-conscious culture; bridges enterprise discipline to measurable creative outcomes.",
});

add("Walk me through a rebrand or brand evolution you led.", {
  answer:
    "The Datamatics rebrand was a system problem before it was a creative one. [pause] The brand had drifted across acquired units — each with its own visual logic. I led a cross-unit audit, rebuilt the design system, and staged the rollout so no active campaigns went dark. **Every unit shipped under one consistent identity within two cycles, zero delay.** That is what brand system leadership looks like.",
  note:
    "Maps directly to Brand Transformation STAR story; no invented metrics; Hettich-relevant framing on system over aesthetic.",
});

add(
  "How do you design for different cultures — what changes between India, the UAE, and Southeast Asia?",
  {
    answer:
      "Culture changes the emotional logic behind the same visual choice. [pause] In India, warmth comes through in layout density and human reference; in the GCC, geometric precision carries authority; in Southeast Asia, aspiration works through status and craft detail. **What never changes is the underlying brand architecture — that has to hold across all of it.** Consistency in the system, flexibility in the expression.",
    note:
      "Covers Hettich, Marriott Dubai, and Emaar Dubai (same question text); honest principle-based answer with genuine cultural observation; no fabricated cross-cultural project experience.",
  },
);

add(
  "How do you build creative culture in a B2B or enterprise environment?",
  {
    answer:
      "Creative culture in B2B is built on clarity, not inspiration. [pause] Tight briefs, visible standards, fast feedback loops. At Datamatics I built an in-house function that runs 100+ global campaigns a year — the culture behind that was simple: **high standards, clear ownership, and a CD who stays close to the work.** That is what I have seen actually hold.",
    note:
      "Most transferable strength question per Hettich why field; uses In-House Creative System STAR; real number; operational answer.",
  },
);

add(
  "Our brand is not yet as design-led as the top tier. Why would you join rather than wait for a brand that is already there?",
  {
    answer:
      "A brand that is already there does not need what I offer. [pause] What I do well is build — systems, standards, culture, pipelines. The interesting opportunities are where the gap between where the brand is and where it could be is still real. **Hettich has the foundations and the ambition — the creative layer is the work still to be done.** That is the work I want.",
    note:
      "Builder opportunity reframe per Hettich watch-out; confident and honest; no flattery; no fabricated facts.",
  },
);

// Marriott Dubai
add("Are you open to relocation or extended travel?", {
  answer:
    "Fully open — Dubai is a considered move, not a reluctant one. [pause] I have been building toward a global creative role and the Gulf market is where the premium brand work I want to do is concentrated. There is no hesitation on relocation. **Dubai is the right market for the next chapter**, and I am ready to commit to it without conditions.",
  note:
    "Covers Marriott Dubai and Emaar Dubai (same question text); confident relocation statement; no hedging.",
});

add(
  "How do you balance brand consistency with the need for creative freshness?",
  {
    answer:
      "Consistency and freshness are not opposites — they operate at different levels of the brand. [pause] Consistency lives in the foundations: the visual system, the tone, the core idea. Freshness lives in execution: how you interpret those foundations for a new campaign, channel, or season. **The brief is always to push as far as the system allows**, not to redesign the system with every campaign. That is the creative director's job.",
    note:
      "Multi-brand Marriott stewardship question; frames the tension correctly; no fabricated example needed.",
  },
);

add(
  "What does motion and digital design add to a brand that static cannot?",
  {
    answer:
      "Motion carries the emotional beat that a still frame can only suggest. [pause] A static image shows a room; motion lets the light move, the door open, the sound settle in. For a hospitality brand, that is not a production upgrade — it is the difference between a product shot and an experience. **Motion is how you make someone feel the stay before they book it.** That is what it adds.",
    note:
      "Experience-first hospitality question; craft answer; motion is in John's stated skills; no fabricated production example.",
  },
);

add(
  "How do you build the case for design as a business function, not a service function?",
  {
    answer:
      "Design earns its seat at the strategy table by speaking the language that the table already trusts. [pause] The argument is not aesthetic — it is economic. Better visual clarity reduces decision friction. Stronger brand coherence increases loyalty and repeat booking. Faster production through better systems lowers cost-per-asset. **The case for design is always a revenue and efficiency case**, not a beauty case. That is the argument that lands.",
    note:
      "CMO/RevPAR framing per why field; bridges creative to hospitality business metrics without fabricating RevPAR figures.",
  },
);

add(
  "Sell me the idea of hiring you over a Creative Director who has already worked at a premium consumer brand.",
  {
    answer:
      "Someone from a premium consumer brand knows the category — they may not know how to build what you need. [pause] I bring 18 years of building a creative function at scale, a design system held under real pressure, and an AI workflow that changed how fast a team produces. **That enterprise infrastructure discipline is hard to find in a pure lifestyle creative.** That combination is what I am offering.",
    note:
      "No hospitality experience bridge; uses realNumbers for proof; honest about difference without being defensive.",
  },
);

// Emaar Dubai
add("What would you do in your first 90 days?", {
  answer:
    "Ninety days is three phases: listen, assess, begin. [pause] The first thirty are for understanding — the brand's current state, the team's capability, the brief backlog, and where the system is weakest. Days thirty to sixty, I find the highest-leverage fixes and start building. **By day ninety, the team has seen how I work and the first new output is already in market.** That is the pace I set.",
  note:
    "Emaar speed-at-scale question; structured 30-60-90 answer; no fabricated Emaar-specific deliverables.",
});

add("Walk me through your strongest piece of work.", {
  answer:
    "The work I am proudest of is the one I built from nothing — the Datamatics in-house creative system. [pause] Not a campaign: an infrastructure call. A team of six, 100+ global campaigns a year, an AI pipeline that cut video from two days to under two minutes. **The ambition: make enterprise creative perform at agency standard** — at a fraction of the cost. That is the bar I set.",
  note:
    "Emaar landmark-scale question; uses In-House Creative System + AI STAR stories; realNumbers throughout.",
});

add(
  "How do you approach integrating AI into this team's workflow in year one?",
  {
    answer:
      "The first thing I do is audit where the team loses time to tasks that need no human judgment. [pause] At Datamatics that led me to build an N8N pipeline integrating HeyGen and ElevenLabs — video dropped from two days to under two minutes, campaign output forty percent faster. **The same logic applies here: find the bottleneck, automate the repetitive, protect the creative decisions.** At Emaar's scale that ROI compounds fast.",
    note:
      "Emaar AI question; different opener from Kohler AI answer; same facts, Emaar-specific framing on scale and ROI.",
  },
);

// Marina Bay Sands
add(
  "Are you open to relocating to Singapore, and are you familiar with the EP application process?",
  {
    answer:
      "Singapore is a deliberate target — not a fallback. [pause] I have been scoping creative director roles in Singapore and Dubai specifically because that is where the premium brand work at global scale is happening. The EP process is something I have researched, and I am prepared to move through it without hesitation. **The relocation is not a risk factor — it is part of the plan.** I am ready.",
    note:
      "MBS EP question; confident without overconfidence; honest about research, not fabricating EP experience.",
  },
);

add(
  "MBS operates across entertainment, hospitality, gaming, retail, and MICE. How do you maintain brand coherence across such a wide range of guest experiences?",
  {
    answer:
      "Brand coherence at that scale is an architecture question, not a style question. [pause] The master brand supplies the foundations — design language, spatial standards, typographic logic, photography bar. Each vertical owns its execution within those foundations. At Datamatics I unified acquired business units with different audiences under one consistent system. **The principle is that the system holds the coherence — the CD holds the system.** That is the discipline.",
    note:
      "MBS brand systems question; maps DAM and Datamatics unification experience; architecture framing per why field.",
  },
);

add(
  "Walk me through the most culturally complex brief you have designed for — how did you navigate competing sensitivities across markets?",
  {
    answer:
      "The most complex briefs I managed were global technology campaigns running simultaneously across APAC, the Middle East, and Europe. [pause] Each market had different aesthetic expectations and status cues. My approach: hold the brand architecture constant, regionalise the execution — different imagery, pacing, reference points, same system. **What protected us was a clear framework: which elements are fixed, which are flexible, who approves the deviation.** That structure removed the conflict.",
    note:
      "MBS cultural complexity question; honest about the nature of the work at Datamatics global campaigns; no fabricated client named; principled approach + real evidence.",
  },
);

add(
  "What does luxury mean when your audience spans international tourists, local Singapore residents, high-net-worth gamblers, and corporate convention delegates — sometimes in the same week?",
  {
    answer:
      "Luxury is not one thing — it is the right thing, precisely calibrated. [pause] For an HNW casino guest, it is exclusivity and discretion. For a MICE delegate, seamlessness and command. For a tourist, the sense of being somewhere genuinely extraordinary. **The visual system has to hold at every tier without cheapening any of them.** That means brand tiers, not one-size-fits-all creative. That is the architecture I would build.",
    note:
      "Audience stratification question per MBS why field; principled answer grounded in brand architecture thinking; no fabricated luxury brand experience.",
  },
);

add(
  "How do you integrate AI into a premium experiential brand's creative workflow without degrading the quality the brand is known for?",
  {
    answer:
      "The risk is not AI — it is removing the human checkpoint from the wrong place. [pause] At Datamatics I built an N8N pipeline that cut video from two days to under two minutes, forty percent faster overall. Quality held because of one rule: **AI handles the assembly, a human makes every creative decision.** For a brand at MBS's level, that rule does not change. Speed applies to production, not judgment.",
    note:
      "MBS AI question; speed-to-market framing per why field; clear quality safeguard principle; all metrics from realNumbers.",
  },
);

add(
  "You have no direct hospitality or entertainment industry experience. What gives you confidence you can deliver creative at Marina Bay Sands' standard from day one?",
  {
    answer:
      "Sector experience is one input — creative infrastructure is another. [pause] I have 18 years building what MBS needs: brand systems across complex multi-unit operations, a team shipping 100+ global campaigns a year, a production pipeline built from scratch. **What I bring is not hospitality experience — it is the discipline to raise and hold a premium bar under scale and speed.** That is what day one looks like.",
    note:
      "No hospitality experience reframe per MBS why field; calm and non-defensive; uses realNumbers; bridges enterprise discipline to luxury execution.",
  },
);

// Pidilite India
add(
  "Fevicol is one of India's most iconic advertising legacies. How do you feel about working inside that creative heritage, and what would you bring to it?",
  {
    answer:
      "Working inside an iconic creative legacy is a privilege with real responsibility. [pause] Fevicol earned its status through decades of advertising that understood Indian life — warm, witty, deeply human. My role is to protect what built it while bringing the brand into the formats where its next-generation buyers already live. **What I bring is brand system discipline** and genuine respect for what this brand has earned.",
    note:
      "Pidilite HR round; respectful of legacy without being deferential; honest about what John brings; no fabrication.",
  },
);

add(
  "Pidilite's core buyer is the contractor, mason, and carpenter in tier-2 and tier-3 cities. How does your creative experience speak to that audience?",
  {
    answer:
      "Directly, my work has been urban and digital — I will not pretend otherwise. [pause] What I bring is a clear plan: field visits, learning visual codes that earn trust in those markets, regional hires who know that India from the inside. **My job is not to write the brief in Mumbai — it is to build the team that makes the work speak to them.** That is the honest answer.",
    note:
      "Tier-2/3 audience question; honest about gap; no fabricated rural India experience; plan-based answer grounded in real leadership approach.",
  },
);

add(
  "Walk me through a campaign you created that had genuine mass-market or cultural breadth — something that worked beyond urban India.",
  {
    answer:
      "The broadest work I have led spanned multiple markets — but not vernacular Indian markets. [pause] What I can show is range: campaigns across APAC, the Middle East, and Europe calibrated for different cultural registers within one brand system. **The transferable skill is building creative that holds across audiences who think and feel differently**, and leading the team that makes it happen. For Hindi-belt reach, I would hire for it.",
    note:
      "Honest answer where profile has no vernacular India example; transferable principle + honest plan; no fabricated mass-market campaign.",
  },
);

add(
  "How would you approach brand premiumisation for a brand like Dr. Fixit or Fevicol DE without alienating the core trade and construction audience that made these brands iconic?",
  {
    answer:
      "Premiumisation works when it climbs without abandoning — you extend up, you do not leave behind. [pause] The trade audience trusts Dr. Fixit because it is always honest about its job. The premium line earns its place by being visibly more capable, not just more expensive-looking. **You never make the original feel lesser in order to make the premium feel better.** That is where most premiumisation efforts fail.",
    note:
      "Strategic creative question; grounded in brand architecture principle; no fabricated Pidilite research; honest brand thinking.",
  },
);

add(
  "How do you integrate AI and modern production tools into a creative process that must resonate with audiences who primarily consume content in Hindi and regional languages?",
  {
    answer:
      "The pipeline I built at Datamatics — N8N with HeyGen and ElevenLabs — handles multilingual voice and localised video. [pause] The same architecture scales to Hindi and regional: generate the master, localise the audio, adapt the visual references for the register. **What AI enables here is not just speed — it is the volume of regional variants that was previously too expensive to produce.** That changes what vernacular reach is possible.",
    note:
      "Pidilite AI question; frames AI pipeline in terms of regional content velocity; all facts from realNumbers; no fabricated Hindi campaign.",
  },
);

add(
  "Your career has been in global enterprise B2B for urban, English-language markets. Pidilite is vernacular India. How do we know you can genuinely understand this audience, not just brief an agency to handle it?",
  {
    answer:
      "That is a fair challenge and I will answer honestly. [pause] I do not have vernacular India the way someone who grew up in it does. What I commit to: field visits, regional hires who know that India, and willingness to be corrected. **Understanding an audience you did not grow up with is a leadership discipline** — humility and structured listening. That is how I earn the right to lead this.",
    note:
      "Sharpest challenge per Pidilite why field; honest non-defensive reframe; no fabricated rural India experience; plan grounded in real leadership principle.",
  },
);
