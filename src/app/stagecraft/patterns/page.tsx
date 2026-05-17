"use client";

// Stagecraft — Patterns Dashboard.
// Cross-session analytics: which grammar and delivery patterns are you
// repeating, at what rate, and is the rate going down?
//
// Layout: ranked pattern list → per-pattern sparkline + trend arrow +
// example questions. Click any row to expand examples + session history.

import { useEffect, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { ScrollReveal } from "@/components/stagecraft/ScrollReveal";
import type {
  PatternData,
  PatternsPayload,
} from "@/app/api/stagecraft/patterns/route";

// ── Pattern fix tips ─────────────────────────────────────────────────────────
// Fuzzy-matched against model-generated pattern tag names.

const FIX_RULES: { match: RegExp; fix: string; example?: string }[] = [
  {
    match: /article|the\s|a\/an/i,
    fix: "Add 'a', 'an', or 'the' before singular nouns. Ask: is this specific (the) or first-mention (a/an)?",
    example: "\"I am creative leader\" → \"I am a creative leader\"",
  },
  {
    match: /run.?on|long sentence|sentence.?length/i,
    fix: "Break after every idea. One sentence = one thought. If it is over 20 words, split it.",
    example: "\"I led the team and we delivered the project and the client was happy\" → \"I led the team. We delivered on time. The client renewed.\"",
  },
  {
    match: /plural|missing.?s|count.?noun/i,
    fix: "Count nouns need -s: 'campaigns', 'systems', 'skills', 'brands'. Check every group noun.",
    example: "\"3 campaign across 8 market\" → \"3 campaigns across 8 markets\"",
  },
  {
    match: /filler|actually|basically|the same|kind of|sort of|as such/i,
    fix: "Remove filler before submitting. Replace 'actually' with nothing. Replace 'kind of' with the real word.",
    example: "\"I actually kind of led the team\" → \"I led the team\"",
  },
  {
    match: /continuous|progressive|am having|is being|are doing/i,
    fix: "Swap continuous tense for simple tense. 'I am having' → 'I have'. 'We are building' → 'We build'.",
    example: "\"I am having 20 years experience\" → \"I have 20 years of experience\"",
  },
  {
    match: /preposition|about|on|at|for|with/i,
    fix: "Prepositions after verbs are fixed collocations — memorise them. 'Discuss about' → 'discuss'. 'Focused at' → 'focused on'.",
    example: "\"We discussed about the brief\" → \"We discussed the brief\"",
  },
  {
    match: /weak opener|filler opener|start.*so|start.*well|start.*um/i,
    fix: "Lead with your subject. Start with 'I', a specific number, or a short context phrase. Never 'So', 'Well', 'Um', or 'Actually'.",
    example: "\"So I think what happened was...\" → \"In that situation, I made a call...\"",
  },
  {
    match: /result|outcome|impact|star/i,
    fix: "Every story needs a measurable Result. Ask: 'So what?' and answer with a number or a change in state.",
    example: "Add: \"...which resulted in a 40% reduction in production time.\"",
  },
  {
    match: /ownership|we.*instead.*i|passive|team.*did/i,
    fix: "Own your contribution. Lead with 'I' not 'we'. Say 'I led the team that...' not 'we delivered'.",
    example: "\"We launched the campaign\" → \"I led the launch — a 6-person team, 3-week sprint\"",
  },
  {
    match: /tense|past.*present|mixed.?tense|consistency/i,
    fix: "Pick one tense per story and stay in it. Past stories use simple past ('I decided', 'we delivered'). Never mix.",
    example: "\"I led the team and we are delivering on time\" → \"I led the team and we delivered on time\"",
  },
  {
    match: /hedge|hedg|not.*confident|overly.*tentative|uncertain/i,
    fix: "Remove soft qualifiers: 'kind of', 'sort of', 'a bit', 'quite', 'rather'. State it flat.",
    example: "\"I think it was quite a strong campaign\" → \"It was a strong campaign — it delivered X.\"",
  },
  {
    match: /plural.*possessive|possessive|apostrophe/i,
    fix: "Add apostrophe-s for ownership: 'brand's objectives', 'team's output', 'client's brief'.",
    example: "\"the brand objective\" → \"the brand's objective\"",
  },
  {
    match: /subject.?verb|agreement|singular.*plural/i,
    fix: "Match verb to subject. 'The team is' (singular), 'The campaigns are' (plural).",
    example: "\"Our team are working\" → \"Our team is working\"",
  },
];

function getPatternFix(tag: string): { fix: string; example?: string } | null {
  const rule = FIX_RULES.find((r) => r.match.test(tag));
  return rule ? { fix: rule.fix, example: rule.example } : null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROUND_SHORT: Record<string, string> = {
  hr: "HR",
  "hiring-manager": "HM",
  portfolio: "Portfolio",
  leadership: "CXO",
  stress: "Stress",
  mixed: "Mixed",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function trendColor(trend: PatternData["trend"]): string {
  if (trend === "improving") return "text-sc-green";
  if (trend === "worsening") return "text-sc-red";
  if (trend === "stable") return "text-sc-gold";
  return "text-sc-dim";
}

function trendArrow(trend: PatternData["trend"]): string {
  if (trend === "improving") return "↓";
  if (trend === "worsening") return "↑";
  if (trend === "stable") return "→";
  return "—";
}

function trendLabel(trend: PatternData["trend"]): string {
  if (trend === "improving") return "Improving";
  if (trend === "worsening") return "Getting worse";
  if (trend === "stable") return "Holding steady";
  return "Not enough data";
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────

function Sparkline({
  rates,
  trend,
  width = 80,
  height = 24,
}: {
  rates: number[];
  trend: PatternData["trend"];
  width?: number;
  height?: number;
}) {
  if (rates.length < 2) {
    return (
      <span className="font-mono text-[10px] text-sc-dim w-20 inline-block text-center">
        —
      </span>
    );
  }

  const max = Math.max(...rates, 0.01);
  const points = rates.map((r, i) => {
    const x = (i / (rates.length - 1)) * width;
    const y = height - (r / max) * (height - 2) - 1;
    return `${x},${y}`;
  });

  const strokeColor =
    trend === "improving"
      ? "var(--sc-green)"
      : trend === "worsening"
        ? "var(--sc-red)"
        : "var(--sc-gold)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block align-middle"
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Latest dot */}
      {rates.length > 0 && (() => {
        const lastX = width;
        const lastY = height - (rates[rates.length - 1] / max) * (height - 2) - 1;
        return (
          <circle cx={lastX} cy={lastY} r="2" fill={strokeColor} opacity="0.9" />
        );
      })()}
    </svg>
  );
}

// ── Frequency bar ─────────────────────────────────────────────────────────────

function FreqBar({ rate, max }: { rate: number; max: number }) {
  const pct = max > 0 ? (rate / max) * 100 : 0;
  const color =
    rate > 0.4
      ? "bg-sc-red"
      : rate > 0.2
        ? "bg-sc-gold"
        : "bg-sc-green";
  return (
    <div className="flex-1 h-1 bg-sc-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Pattern row ───────────────────────────────────────────────────────────────

function PatternRow({
  pattern,
  rank,
  maxRate,
}: {
  pattern: PatternData;
  rank: number;
  maxRate: number;
}) {
  const [open, setOpen] = useState(false);

  const latestRate =
    pattern.allSessionRates.length > 0
      ? pattern.allSessionRates[pattern.allSessionRates.length - 1].rate
      : 0;

  const sparkRates = pattern.allSessionRates.map((s) => s.rate);

  return (
    <div className="rounded-sm border border-sc-border bg-sc-surface overflow-hidden">
      {/* Main row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-4 hover:bg-sc-raised transition-colors text-left"
      >
        {/* Rank */}
        <span className="font-mono text-xs text-sc-dim w-5 shrink-0 text-right">
          {rank}
        </span>

        {/* Tag name */}
        <span className="font-mono text-sm text-sc-ink flex-1 min-w-0">
          {pattern.tag}
        </span>

        {/* Count + questions */}
        <span className="font-mono text-xs text-sc-dim shrink-0 hidden sm:block">
          {pattern.totalCount}×
        </span>

        {/* Frequency bar */}
        <div className="flex items-center gap-2 w-24 shrink-0 hidden md:flex">
          <FreqBar rate={latestRate} max={maxRate} />
          <span className="font-mono text-[10px] text-sc-dim w-8 text-right">
            {Math.round(latestRate * 100)}%
          </span>
        </div>

        {/* Sparkline */}
        <div className="shrink-0 hidden sm:block">
          <Sparkline rates={sparkRates} trend={pattern.trend} />
        </div>

        {/* Trend */}
        <span
          className={`font-mono text-sm shrink-0 ${trendColor(pattern.trend)}`}
          title={trendLabel(pattern.trend)}
        >
          {trendArrow(pattern.trend)}
        </span>

        {/* Toggle */}
        <span className="font-mono text-xs text-sc-dim shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-sc-line px-4 py-4 space-y-5">
          {/* Fix tip — shown when a rule matches */}
          {(() => {
            const tip = getPatternFix(pattern.tag);
            if (!tip) return null;
            return (
              <div className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-3 space-y-1.5">
                <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
                  How to fix this
                </p>
                <p className="text-sm text-sc-ink leading-relaxed">{tip.fix}</p>
                {tip.example && (
                  <p className="font-mono text-xs text-sc-muted leading-relaxed border-l-2 border-sc-gold-dim pl-3 mt-2">
                    {tip.example}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Stats row */}
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1">
                Total occurrences
              </p>
              <p className="font-display text-xl font-semibold text-sc-ink">
                {pattern.totalCount}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1">
                Questions affected
              </p>
              <p className="font-display text-xl font-semibold text-sc-ink">
                {pattern.totalQuestions}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1">
                Sessions with this
              </p>
              <p className="font-display text-xl font-semibold text-sc-ink">
                {pattern.sessions.length}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1">
                Trend
              </p>
              <p
                className={`font-mono text-sm font-semibold ${trendColor(pattern.trend)}`}
              >
                {trendArrow(pattern.trend)} {trendLabel(pattern.trend)}
              </p>
            </div>
          </div>

          {/* Session-by-session rate */}
          {pattern.sessions.length > 0 && (
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-2">
                Rate per session (occurrences / questions)
              </p>
              <div className="space-y-1.5">
                {pattern.sessions.map((s) => (
                  <div
                    key={s.sessionId}
                    className="flex items-center gap-3 text-xs"
                  >
                    <span className="font-mono text-sc-dim w-16 shrink-0">
                      {formatDate(s.startedAt)}
                    </span>
                    <div className="flex-1 h-1.5 bg-sc-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          s.rate > 0.4
                            ? "bg-sc-red"
                            : s.rate > 0.2
                              ? "bg-sc-gold"
                              : "bg-sc-green"
                        }`}
                        style={{ width: `${Math.min(s.rate * 100 * 2, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-sc-dim shrink-0 w-16 text-right">
                      {s.count}× / {s.questions}q
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent examples */}
          {pattern.recentExamples.length > 0 && (
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-2">
                Recent questions where this appeared
              </p>
              <div className="space-y-2">
                {pattern.recentExamples.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-sm border border-sc-border bg-sc-raised px-3 py-2.5 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-sc-ink leading-snug">
                        {ex.question}
                      </p>
                      <p className="font-mono text-[10px] text-sc-dim mt-1">
                        {formatDate(ex.startedAt)} ·{" "}
                        {ROUND_SHORT[ex.round] ?? ex.round}
                      </p>
                    </div>
                    <Link
                      href={`/stagecraft/history/${ex.sessionId}`}
                      className="shrink-0 font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
                    >
                      review →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatternsPage() {
  const [data, setData] = useState<PatternsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stagecraft/patterns", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<PatternsPayload>;
      })
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const maxRate =
    data?.patterns.reduce((max, p) => {
      const r =
        p.allSessionRates.length > 0
          ? p.allSessionRates[p.allSessionRates.length - 1].rate
          : 0;
      return Math.max(max, r);
    }, 0) ?? 1;

  // Counts for the top legend
  const improving = data?.patterns.filter((p) => p.trend === "improving").length ?? 0;
  const worsening = data?.patterns.filter((p) => p.trend === "worsening").length ?? 0;
  const stable = data?.patterns.filter((p) => p.trend === "stable").length ?? 0;

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <StagecraftHeader label="Patterns">
        {/* Trend legend */}
        {data && data.patterns.length > 0 && data.hasEnoughData && (
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="text-sc-green">↓ {improving}</span>
            <span className="text-sc-gold">→ {stable}</span>
            <span className="text-sc-red">↑ {worsening}</span>
          </div>
        )}
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Hero */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            Grammar &amp; delivery patterns
          </p>
          <h1 className="font-fraunces text-3xl font-semibold text-sc-ink leading-tight">
            What keeps coming back?
          </h1>
          {data && (
            <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
              {data.totalSessions} session
              {data.totalSessions !== 1 ? "s" : ""} · {data.totalQuestions}{" "}
              question{data.totalQuestions !== 1 ? "s" : ""}
              {data.hasEnoughData
                ? " — enough data for trend analysis."
                : " — need 4+ sessions for trend arrows."}
            </p>
          )}
        </div>

        {/* States */}
        {error ? (
          <div className="rounded-sm border border-sc-red/40 bg-sc-red/10 px-4 py-3 text-sm text-sc-red font-mono">
            {error}
          </div>
        ) : loading ? (
          <p className="font-mono text-xs tracking-widest text-sc-dim uppercase animate-pulse">
            Loading…
          </p>
        ) : !data || data.patterns.length === 0 ? (
          <div className="rounded-sm border border-dashed border-sc-border p-8 text-center space-y-3">
            <p className="font-mono text-xs text-sc-dim">No patterns detected yet</p>
            <p className="text-sm text-sc-muted">
              Complete a few practice sessions. Pattern tags appear in the coaching
              feedback once the grader detects recurring issues.
            </p>
            <Link
              href="/stagecraft"
              className="inline-block rounded-sm bg-sc-gold px-4 py-2 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
            >
              Start a session →
            </Link>
          </div>
        ) : (
          <>
            {/* Legend (mobile-visible) */}
            {data.hasEnoughData && (
              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-sc-green font-semibold">↓</span>
                  <span className="text-sc-dim">Improving</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sc-gold font-semibold">→</span>
                  <span className="text-sc-dim">Holding steady</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sc-red font-semibold">↑</span>
                  <span className="text-sc-dim">Getting worse</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sc-dim font-semibold">—</span>
                  <span className="text-sc-dim">Not enough data</span>
                </div>
              </div>
            )}

            {/* Table header */}
            <div className="hidden sm:flex items-center gap-4 px-4 pb-1 border-b border-sc-border">
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase w-5 shrink-0 text-right">#</span>
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase flex-1">Pattern</span>
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase w-8 shrink-0 text-right hidden sm:block">Total</span>
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase w-24 shrink-0 hidden md:block">Latest rate</span>
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase w-20 shrink-0 hidden sm:block">Trend</span>
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase w-8 shrink-0"></span>
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase w-8 shrink-0"></span>
            </div>

            {/* Pattern rows */}
            <ScrollReveal>
              <div className="space-y-2">
                {data.patterns.map((pattern, i) => (
                  <PatternRow
                    key={pattern.tag}
                    pattern={pattern}
                    rank={i + 1}
                    maxRate={maxRate}
                  />
                ))}
              </div>
            </ScrollReveal>

            {/* Priority callout */}
            {data.patterns.length > 0 && (() => {
              const top = data.patterns.find(
                (p) => p.trend !== "improving",
              );
              if (!top) return null;
              return (
                <ScrollReveal delay={80}>
                  <div className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-4">
                    <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase mb-1.5">
                      Focus drill
                    </p>
                    <p className="text-sm text-sc-ink">
                      Your most persistent pattern is{" "}
                      <strong className="font-semibold">[{top.tag}]</strong> —
                      {top.totalCount} occurrences across{" "}
                      {top.sessions.length} session
                      {top.sessions.length !== 1 ? "s" : ""}. Set{" "}
                      <span className="font-mono text-sc-gold">focus grammar</span>{" "}
                      in your next session to drill against it specifically.
                    </p>
                    <Link
                      href="/stagecraft?focus=grammar"
                      className="inline-block mt-3 rounded-sm border border-sc-gold-dim bg-sc-gold/10 px-3 py-1.5 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors"
                    >
                      Start a session with focus grammar →
                    </Link>
                  </div>
                </ScrollReveal>
              );
            })()}

            {/* Footer links */}
            <div className="border-t border-sc-border pt-6 flex flex-wrap gap-4">
              <Link
                href="/stagecraft/history"
                className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors"
              >
                ← Session history
              </Link>
              <Link
                href="/stagecraft/drill"
                className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors"
              >
                Drill priority questions →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
