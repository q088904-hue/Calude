"use client";

// Stagecraft — Company Prep Deep-Dive.
// Full brand brief, round structure, watch-outs, company-specific
// question preview, and a direct CTA to start a targeted session.
//
// Study this the night before. Know the vocabulary before you walk in.

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackById, COMPANY_PACKS } from "@/lib/stagecraft/companyPacks";
import { useState } from "react";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { ScrollReveal } from "@/components/stagecraft/ScrollReveal";
import { SuggestedAnswer } from "@/components/stagecraft/SuggestedAnswer";

// ── Company-specific question selections ──────────────────────────────────────
// Hardest / most likely questions for each company — curated per brand.

const COMPANY_QUESTIONS: Record<
  string,
  { round: string; question: string; why: string }[]
> = {
  "kohler-india": [
    {
      round: "HR",
      question: "Why are you looking to move after 18 years at Datamatics?",
      why: "Guaranteed in round 1. Your answer must be forward-looking, not escape-themed.",
    },
    {
      round: "Hiring Manager",
      question:
        "You have spent your career in B2B enterprise. We are a premium consumer brand. Why should we believe you can make that shift?",
      why: "The B2B→consumer pivot is Kohler's #1 challenge with your profile.",
    },
    {
      round: "Portfolio / CD",
      question: "Critique our current brand honestly — what would you change and why?",
      why:
        "Kohler will test your taste and brand judgment directly. Prepare a considered answer.",
    },
    {
      round: "Portfolio / CD",
      question: "What does premium design mean to you?",
      why:
        "This is not a soft question. Premium at Kohler means restraint, craft, and earned elegance — not just high production value.",
    },
    {
      round: "Leadership / CXO",
      question:
        "How would you approach integrating AI into this team's workflow in year one?",
      why:
        "Your AI pipeline (N8N / HeyGen / ElevenLabs) is your biggest differentiator. Have a concrete answer.",
    },
    {
      round: "Stress",
      question:
        "Your tenure at one company is long. How do we know you are not just institutionalised?",
      why:
        "18 years = pattern question. Your answer needs to demonstrate intellectual restlessness, not loyalty.",
    },
  ],

  "hettich-india": [
    {
      round: "HR",
      question: "What do you know about our company and our brand?",
      why:
        "Hettich is a precision hardware brand. Know: 130 years, German engineering, specification B2B channel.",
    },
    {
      round: "Hiring Manager",
      question: "How do you measure creative success beyond awards and likes?",
      why:
        "Hettich is metric-conscious — German business culture. Have a specification / conversion story.",
    },
    {
      round: "Portfolio / CD",
      question: "Walk me through a rebrand or brand evolution you led.",
      why:
        "Brand system thinking over campaign aesthetics. Talk about the system, not just the visuals.",
    },
    {
      round: "Portfolio / CD",
      question:
        "How do you design for different cultures — what changes between India, the UAE, and Southeast Asia?",
      why: "Hettich's India operation serves architects, designers, and builders across markets.",
    },
    {
      round: "Leadership / CXO",
      question: "How do you build creative culture in a B2B or enterprise environment?",
      why: "This is your most transferable strength. Make it specific and operational.",
    },
    {
      round: "Stress",
      question:
        "Our brand is not yet as design-led as the top tier. Why would you join rather than wait for a brand that is already there?",
      why:
        "Hettich is aspirational, not yet at the Kohler premium tier. Frame this as a builder opportunity.",
    },
  ],

  "marriott-dubai": [
    {
      round: "HR",
      question: "Are you open to relocation or extended travel?",
      why:
        "Dubai relocation readiness must be stated confidently and without hedging in round 1.",
    },
    {
      round: "Hiring Manager",
      question: "How do you balance brand consistency with the need for creative freshness?",
      why:
        "Multi-brand Marriott (Ritz, W, JW) requires distinct voices under one creative umbrella. Address this.",
    },
    {
      round: "Portfolio / CD",
      question: "What does motion and digital design add to a brand that static cannot?",
      why:
        "Hospitality creative is experience-first. Motion and atmosphere are table stakes for a Marriott CD.",
    },
    {
      round: "Portfolio / CD",
      question:
        "How do you design for different cultures — what changes between India, the UAE, and Southeast Asia?",
      why:
        "Marriott Dubai serves European, American, GCC, and South Asian guests. Cultural fluency is mandatory.",
    },
    {
      round: "Leadership / CXO",
      question:
        "How do you build the case for design as a business function, not a service function?",
      why:
        "Hospitality CMOs want creative that drives RevPAR and ADR — not just pretty assets.",
    },
    {
      round: "Stress",
      question:
        "Sell me the idea of hiring you over a Creative Director who has already worked at a premium consumer brand.",
      why:
        "No direct hospitality background. You must bridge Datamatics enterprise discipline to luxury brand execution — concisely.",
    },
  ],

  "emaar-dubai": [
    {
      round: "HR",
      question: "Are you open to relocation or extended travel?",
      why:
        "Dubai relocation must be stated clearly. Emaar hires people committed to the market.",
    },
    {
      round: "Hiring Manager",
      question: "What would you do in your first 90 days?",
      why:
        "Emaar operates at scale and speed. A specific 30-60-90 answer signals you can hit the ground running.",
    },
    {
      round: "Portfolio / CD",
      question: "Walk me through your strongest piece of work.",
      why:
        "Emaar's work is landmark-scale (Burj Khalifa, Address Hotels). Your example must show ambition and craft at a comparable level.",
    },
    {
      round: "Portfolio / CD",
      question:
        "How do you design for different cultures — what changes between India, the UAE, and Southeast Asia?",
      why:
        "Arabic/English bilingual brand sensibility. GCC cultural sensitivity is not optional.",
    },
    {
      round: "Leadership / CXO",
      question:
        "How do you approach integrating AI into this team's workflow in year one?",
      why:
        "Emaar moves fast at scale. AI pipeline story (40% faster, days to minutes) is directly relevant here.",
    },
    {
      round: "Stress",
      question:
        "You have spent your career in B2B enterprise. We are a premium consumer brand. Why should we believe you can make that shift?",
      why:
        "Real estate is a consumer lifestyle brand. Your B2B background needs a clear translation story.",
    },
  ],

  "marina-bay-sands": [
    {
      round: "HR",
      question:
        "Are you open to relocating to Singapore, and are you familiar with the EP application process?",
      why:
        "Singapore work authorization is a hard dependency — they will not invest in a candidate who is uncertain about relocation or unfamiliar with the EP process.",
    },
    {
      round: "Hiring Manager",
      question:
        "MBS operates across entertainment, hospitality, gaming, retail, and MICE. How do you maintain brand coherence across such a wide range of guest experiences?",
      why:
        "Brand systems at this scale require architecture thinking, not campaign thinking. Your DAM and design-system experience is directly relevant here.",
    },
    {
      round: "Portfolio / CD",
      question:
        "Walk me through the most culturally complex brief you have designed for — how did you navigate competing sensitivities across markets?",
      why:
        "MBS serves guests from China, India, SE Asia, Western Europe, and the Americas simultaneously. Cultural fluency under a premium lens is the core creative challenge.",
    },
    {
      round: "Portfolio / CD",
      question:
        "What does luxury mean when your audience spans international tourists, local Singapore residents, high-net-worth gamblers, and corporate convention delegates — sometimes in the same week?",
      why:
        "MBS cannot afford to alienate any segment. A nuanced answer about audience stratification and brand tiers will differentiate you.",
    },
    {
      round: "Leadership / CXO",
      question:
        "How do you integrate AI into a premium experiential brand's creative workflow without degrading the quality the brand is known for?",
      why:
        "Your N8N / HeyGen / ElevenLabs pipeline is directly relevant. Frame it around speed-to-market for campaign assets, not as a replacement for craft.",
    },
    {
      round: "Stress",
      question:
        "You have no direct hospitality or entertainment industry experience. What gives you confidence you can deliver creative at Marina Bay Sands' standard from day one?",
      why:
        "No sector experience is the single biggest risk. Your answer must bridge enterprise discipline, premium brand vocabulary, and cross-cultural sensitivity — concisely and without defensiveness.",
    },
  ],

  "pidilite-india": [
    {
      round: "HR",
      question:
        "Fevicol is one of India's most iconic advertising legacies. How do you feel about working inside that creative heritage, and what would you bring to it?",
      why:
        "Pidilite will test whether you are intimidated by their legacy or energised by it. You need a specific, respectful answer that also signals your own creative point of view.",
    },
    {
      round: "Hiring Manager",
      question:
        "Pidilite's core buyer is the contractor, mason, and carpenter in tier-2 and tier-3 cities. How does your creative experience speak to that audience?",
      why:
        "Most of your work is urban, digital, B2B, or premium. You need a clear bridge argument — or a genuine plan to develop rural-consumer understanding quickly.",
    },
    {
      round: "Portfolio / CD",
      question:
        "Walk me through a campaign you created that had genuine mass-market or cultural breadth — something that worked beyond urban India.",
      why:
        "Pidilite's Hindi-belt reach is non-negotiable. If you lack this example, have a plan. If you have a cross-cultural Datamatics campaign (global campaigns), angle it toward range and reach.",
    },
    {
      round: "Portfolio / CD",
      question:
        "How would you approach brand premiumisation for a brand like Dr. Fixit or Fevicol DE without alienating the core trade and construction audience that made these brands iconic?",
      why:
        "Pidilite's premium lines (Dr. Fixit, Fevicol De, FeviStik) need to climb the value ladder without losing the trust of their heartland user base. This is a genuine strategic creative challenge.",
    },
    {
      round: "Leadership / CXO",
      question:
        "How do you integrate AI and modern production tools into a creative process that must resonate with audiences who primarily consume content in Hindi and regional languages?",
      why:
        "Your AI pipeline story works — but frame it around content velocity for regional markets and vernacular adaptations, not just English-language campaign assets.",
    },
    {
      round: "Stress",
      question:
        "Your career has been in global enterprise B2B for urban, English-language markets. Pidilite is vernacular India. How do we know you can genuinely understand this audience, not just brief an agency to handle it?",
      why:
        "This is the sharpest challenge your profile faces here. Have a grounded, honest answer about how you plan to close the cultural distance — field visits, regional creative partnerships, team hiring. Don't be dismissive.",
    },
  ],
};

// ── Round badge ───────────────────────────────────────────────────────────────

const ROUND_COLORS: Record<string, string> = {
  HR: "text-sc-dim border-sc-border",
  "Hiring Manager": "text-sc-gold border-sc-gold-dim",
  "Portfolio / CD": "text-sc-green border-sc-green/30",
  "Leadership / CXO": "text-sc-ink border-sc-muted",
  Stress: "text-sc-red border-sc-red/30",
};

function RoundBadge({ round }: { round: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs uppercase tracking-wide ${
        ROUND_COLORS[round] ?? "text-sc-dim border-sc-border"
      }`}
    >
      {round}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CompanyDeepDivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pack = getPackById(id);

  if (!pack) notFound();

  const questions = COMPANY_QUESTIONS[id] ?? [];

  // Parse the brand brief — strip the "TARGET COMPANY —" header line
  const briefLines = pack.brandBrief
    .split("\n")
    .filter((l) => !l.startsWith("TARGET COMPANY"))
    .join("\n")
    .trim();

  // Rounds as array
  const roundSteps = pack.rounds.split("→").map((r) => r.trim());

  const [briefOpen, setBriefOpen] = useState(true);

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <StagecraftHeader label="Company" backHref="/stagecraft/companies" backLabel="← Companies">
        <span className="font-mono text-xs text-sc-muted">{pack.shortName}</span>
        {/* Start session CTA in header */}
        <Link
          href={`/stagecraft?company=${pack.id}`}
          className="rounded-sm bg-sc-gold px-4 py-2 text-xs font-semibold text-sc-void hover:brightness-110 transition-all"
          onClick={() => {
            // Pre-select this company in session setup — handled by URL param on main page
          }}
        >
          Practice session →
        </Link>
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Hero */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            Company prep brief
          </p>
          <h1 className="font-fraunces text-3xl font-semibold text-sc-ink leading-tight">
            {pack.label}
          </h1>
        </div>

        {/* ── Round structure ── */}
        <ScrollReveal delay={0}>
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
              Interview structure
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {roundSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-3 py-1.5 font-mono text-xs text-sc-muted">
                    {step}
                  </span>
                  {i < roundSteps.length - 1 && (
                    <span className="text-sc-dim font-mono text-xs">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Watch-outs ── */}
        <ScrollReveal delay={80}>
        <div className="rounded-sm border border-sc-red/30 bg-sc-red/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-sc-red/20">
            <p className="font-mono text-xs tracking-widest text-sc-red uppercase">
              ⚠ Watch-outs — know these cold
            </p>
          </div>
          <div className="px-4 py-4 space-y-2">
            {pack.watchOuts.map((w, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-sc-red font-mono text-xs shrink-0 mt-0.5">
                  {i + 1}.
                </span>
                <p className="text-sm text-sc-ink leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        </div>
        </ScrollReveal>

        {/* ── Brand brief ── */}
        <ScrollReveal delay={160}>
        <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setBriefOpen((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-sc-raised transition-colors"
          >
            <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
              Brand brief — read this before your interview
            </p>
            <span className="font-mono text-xs text-sc-dim">
              {briefOpen ? "▲" : "▼"}
            </span>
          </button>
          {briefOpen && (
            <div className="border-t border-sc-line px-4 py-4">
              <div className="space-y-3 text-sm text-sc-muted leading-relaxed">
                {briefLines.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  // Section header (all caps or starts with what/adjust)
                  if (
                    trimmed.startsWith("What ") ||
                    trimmed.startsWith("Adjust") ||
                    trimmed.match(/^[A-Z][A-Z\s]+:/)
                  ) {
                    return (
                      <p
                        key={i}
                        className="font-mono text-xs tracking-widest text-sc-gold uppercase mt-4 mb-1"
                      >
                        {trimmed.replace(/:$/, "")}
                      </p>
                    );
                  }
                  // Bullet
                  if (trimmed.startsWith("-")) {
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-sc-gold shrink-0 mt-0.5">◆</span>
                        <p className="text-sc-muted">{trimmed.slice(1).trim()}</p>
                      </div>
                    );
                  }
                  return <p key={i}>{trimmed}</p>;
                })}
              </div>
            </div>
          )}
        </div>
        </ScrollReveal>

        {/* ── Company-specific questions ── */}
        {questions.length > 0 && (
          <ScrollReveal delay={240}>
          <div className="space-y-3">
            <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
              Questions to prepare — specific to this company
            </p>
            <p className="font-mono text-xs text-sc-dim">
              These are the likeliest high-stakes questions based on {pack.shortName}'s
              profile and your background.
            </p>

            {questions.map((q, i) => (
              <div
                key={i}
                className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden"
              >
                <div className="px-4 py-3.5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <RoundBadge round={q.round} />
                    <span className="font-mono text-xs text-sc-dim">
                      Q{i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-sc-ink leading-snug">
                    {q.question}
                  </p>
                  <div className="flex items-start gap-2">
                    <span className="text-sc-gold font-mono text-xs shrink-0 mt-0.5">
                      →
                    </span>
                    <p className="font-mono text-xs text-sc-dim leading-relaxed">
                      {q.why}
                    </p>
                  </div>
                  <SuggestedAnswer question={q.question} />
                </div>

                {/* Drill this question link */}
                <div className="border-t border-sc-line px-4 py-2.5 flex items-center gap-4">
                  <Link
                    href={`/stagecraft/drill?q=${encodeURIComponent(q.question)}&company=${pack.id}`}
                    className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors"
                  >
                    Drill this question →
                  </Link>
                  <Link
                    href={`/stagecraft/debrief?question=${encodeURIComponent(q.question)}`}
                    className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors"
                  >
                    Add to debrief →
                  </Link>
                </div>
              </div>
            ))}
          </div>
          </ScrollReveal>
        )}

        {/* ── CTA ── */}
        <ScrollReveal delay={320}>
        <div className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-5 py-5 space-y-3">
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase">
            You are ready to practice
          </p>
          <p className="text-sm text-sc-ink leading-relaxed">
            Start a session with {pack.shortName} context pre-loaded. Every sample
            answer will use {pack.shortName}&apos;s brand vocabulary.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/stagecraft"
              className="rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
            >
              Start session →
            </Link>
            <Link
              href={`/stagecraft/plan?company=${pack.id}`}
              className="rounded-sm border border-sc-gold-dim bg-sc-gold/10 px-5 py-2.5 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors"
            >
              30-60-90 plan →
            </Link>
            <Link
              href="/stagecraft/portfolio"
              className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
            >
              Portfolio defence →
            </Link>
          </div>
        </div>
        </ScrollReveal>

        {/* Other companies */}
        <ScrollReveal delay={400}>
        <div className="border-t border-sc-border pt-6 space-y-2">
          <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-3">
            Other target companies
          </p>
          <div className="flex flex-wrap gap-2">
            {COMPANY_PACKS.filter((p) => p.id !== id).map((p) => (
              <Link
                key={p.id}
                href={`/stagecraft/companies/${p.id}`}
                className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-3 py-1.5 font-mono text-xs text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
              >
                {p.shortName}
              </Link>
            ))}
          </div>
        </div>
        </ScrollReveal>
      </main>
    </div>
  );
}
