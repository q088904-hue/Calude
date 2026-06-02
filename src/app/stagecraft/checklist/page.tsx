"use client";

// Stagecraft — Pre-Interview Checklist.
// The night-before page. 10 must-nail items, each with a status derived
// from real session/drill data. Shows what's ready, what still needs work,
// and links to fix anything that isn't locked in.
//
// Reads from: /api/stagecraft/history (scores + patterns)
// No AI calls — pure data aggregation.

import { useEffect, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import type { HistoryPayload } from "@/app/api/stagecraft/history/route";

// ── Checklist definition ──────────────────────────────────────────────────────

type ItemStatus = "ready" | "needs-work" | "not-started";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  category: "narrative" | "craft" | "business" | "tactical";
  drillHref: string;
  toolLabel: string;
  toolHref: string;
  // How to derive status from history data
  derive: (h: HistoryPayload) => {
    status: ItemStatus;
    detail: string; // one-line status detail
  };
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: "self-intro",
    label: "30-second self-introduction",
    description:
      "Land all four proof points: 20+ years, AI pipeline, brand systems, the offer. Under 45 seconds.",
    category: "narrative",
    drillHref: "/stagecraft/intro",
    toolLabel: "Intro Forge",
    toolHref: "/stagecraft/intro",
    derive: (h) => {
      // Status based on average content score in recent HR/mixed sessions (where
      // self-intro questions commonly appear), falling back to all recent sessions.
      const recentSessions = h.sessions
        .filter((s) => s.round === "hr" || s.round === "mixed")
        .slice(0, 5);
      const fallback = h.sessions.slice(0, 5);
      const pool = recentSessions.length > 0 ? recentSessions : fallback;
      const avgContent =
        pool.length > 0
          ? pool.reduce((a, s) => a + s.avgContent, 0) / pool.length
          : 0;
      const roundLabel = recentSessions.length > 0 ? "HR/mixed sessions" : "recent sessions";
      if (h.sessions.length === 0) {
        return { status: "not-started", detail: "No practice sessions yet" };
      }
      if (avgContent >= 7.5) {
        return {
          status: "ready",
          detail: `Avg content ${avgContent.toFixed(1)} across last ${Math.min(pool.length, 5)} ${roundLabel}`,
        };
      }
      return {
        status: "needs-work",
        detail: `Avg content ${avgContent.toFixed(1)} in ${roundLabel} — drill until 4 anchors land`,
      };
    },
  },
  {
    id: "eighteen-year",
    label: "Why move after 18 years?",
    description:
      "Forward-looking, not escape-themed. What changed for you, not what's wrong with Datamatics. Under 60 seconds.",
    category: "narrative",
    drillHref: `/stagecraft/drill?q=${encodeURIComponent("Why are you looking to move after 18 years at Datamatics?")}`,
    toolLabel: "Drill this question",
    toolHref: `/stagecraft/drill?q=${encodeURIComponent("Why are you looking to move after 18 years at Datamatics?")}`,
    derive: (h) => {
      const hasStressSessions = h.sessions.some(
        (s) => s.round === "stress" || s.round === "hr",
      );
      if (!hasStressSessions) {
        return {
          status: "not-started",
          detail: "No HR or stress round practice yet",
        };
      }
      const stressSessions = h.sessions.filter(
        (s) => s.round === "stress" || s.round === "hr",
      );
      const avgComposite =
        stressSessions.reduce((a, s) => a + s.composite, 0) /
        stressSessions.length;
      if (avgComposite >= 7.5) {
        return {
          status: "ready",
          detail: `HR/stress avg ${avgComposite.toFixed(1)} — this is a strong area`,
        };
      }
      return {
        status: "needs-work",
        detail: `HR/stress avg ${avgComposite.toFixed(1)} — this is your highest-risk question`,
      };
    },
  },
  {
    id: "ai-pipeline",
    label: "AI pipeline story",
    description:
      "N8N + HeyGen + ElevenLabs → 40% faster, 2-day to 2-minute video. Have one concrete before/after metric.",
    category: "craft",
    drillHref: `/stagecraft/drill?q=${encodeURIComponent("How has AI changed your creative process in the last two years?")}`,
    toolLabel: "Drill this",
    toolHref: `/stagecraft/drill?q=${encodeURIComponent("How has AI changed your creative process in the last two years?")}`,
    derive: (h) => {
      const portfolioSessions = h.sessions.filter(
        (s) => s.round === "portfolio" || s.round === "leadership",
      );
      if (portfolioSessions.length === 0) {
        return {
          status: "not-started",
          detail: "No portfolio/leadership round practice",
        };
      }
      const avg =
        portfolioSessions.reduce((a, s) => a + s.avgContent, 0) /
        portfolioSessions.length;
      if (avg >= 7.5) {
        return {
          status: "ready",
          detail: `Portfolio/leadership content avg ${avg.toFixed(1)}`,
        };
      }
      return {
        status: "needs-work",
        detail: `Portfolio/leadership content avg ${avg.toFixed(1)} — sharpen the before/after metric`,
      };
    },
  },
  {
    id: "portfolio-piece",
    label: "One portfolio piece defended cold",
    description:
      "Pick your strongest piece. Be able to defend the creative rationale, the business result, and what you'd change — without reading notes.",
    category: "craft",
    drillHref: "/stagecraft/portfolio",
    toolLabel: "Portfolio Defence",
    toolHref: "/stagecraft/portfolio",
    derive: (h) => {
      const portfolioSessions = h.sessions.filter(
        (s) => s.round === "portfolio",
      );
      if (portfolioSessions.length === 0) {
        return {
          status: "not-started",
          detail: "No portfolio round practice yet",
        };
      }
      const avg =
        portfolioSessions.reduce((a, s) => a + s.composite, 0) /
        portfolioSessions.length;
      return {
        status: avg >= 7 ? "ready" : "needs-work",
        detail: `Portfolio sessions: ${portfolioSessions.length}, avg ${avg.toFixed(1)}`,
      };
    },
  },
  {
    id: "star-stories",
    label: "2 STAR stories with specific Results",
    description:
      "Situation clear, Task distinct from Action, Result is a number or named outcome — not 'it went well'.",
    category: "narrative",
    drillHref: "/stagecraft/star",
    toolLabel: "STAR Story Drill",
    toolHref: "/stagecraft/star",
    derive: (h) => {
      const hmSessions = h.sessions.filter(
        (s) => s.round === "hiring-manager" || s.round === "leadership",
      );
      if (hmSessions.length === 0) {
        return {
          status: "not-started",
          detail: "No hiring manager/leadership round practice",
        };
      }
      const avg =
        hmSessions.reduce((a, s) => a + s.avgContent, 0) / hmSessions.length;
      return {
        status: avg >= 7.5 ? "ready" : "needs-work",
        detail: `HM/leadership content avg ${avg.toFixed(1)} — Result specificity is the common gap`,
      };
    },
  },
  {
    id: "ninety-day",
    label: "30-60-90 day plan",
    description:
      "Phases 1-3 with one concrete deliverable per phase. Quotable in 90 seconds without reading.",
    category: "business",
    drillHref: "/stagecraft/plan",
    toolLabel: "Generate plan",
    toolHref: "/stagecraft/plan",
    derive: (h) => {
      // Can't know if they've generated a plan — use HM round as proxy
      const hmSessions = h.sessions.filter(
        (s) => s.round === "hiring-manager",
      );
      if (hmSessions.length === 0) {
        return {
          status: "not-started",
          detail: "Generate your plan and drill the question",
        };
      }
      return {
        status: hmSessions.length >= 2 ? "ready" : "needs-work",
        detail:
          hmSessions.length >= 2
            ? `${hmSessions.length} HM sessions completed`
            : "Generate your Kohler plan and drill it once more",
      };
    },
  },
  {
    id: "b2b-consumer",
    label: "B2B → premium consumer pivot answer",
    description:
      "Your enterprise brand discipline translates. Name the specific transferable skill: brand system thinking, production at scale, stakeholder management.",
    category: "narrative",
    drillHref: `/stagecraft/drill?q=${encodeURIComponent("You have spent your career in B2B enterprise. We are a premium consumer brand. Why should we believe you can make that shift?")}`,
    toolLabel: "Drill this",
    toolHref: `/stagecraft/drill?q=${encodeURIComponent("You have spent your career in B2B enterprise. We are a premium consumer brand. Why should we believe you can make that shift?")}`,
    derive: (h) => {
      const stressSessions = h.sessions.filter(
        (s) => s.round === "stress",
      );
      if (stressSessions.length === 0) {
        return {
          status: "not-started",
          detail: "No stress round practice — this question is near-certain",
        };
      }
      const avg =
        stressSessions.reduce((a, s) => a + s.composite, 0) /
        stressSessions.length;
      return {
        status: avg >= 7.5 ? "ready" : "needs-work",
        detail: `Stress round avg ${avg.toFixed(1)}`,
      };
    },
  },
  {
    id: "grammar-patterns",
    label: "Top grammar pattern under control",
    description:
      "Your most frequent pattern (dropped articles, run-ons, or filler words) is showing a declining trend.",
    category: "tactical",
    drillHref: "/stagecraft/patterns",
    toolLabel: "Patterns dashboard",
    toolHref: "/stagecraft/patterns",
    derive: (h) => {
      if (h.allPatterns.length === 0) {
        return {
          status: "not-started",
          detail: "No pattern data yet — complete more sessions",
        };
      }
      const top = h.allPatterns[0];
      const recentSessions = h.sessions.slice(0, 3);
      const olderSessions = h.sessions.slice(3, 6);
      if (recentSessions.length === 0) {
        return { status: "not-started", detail: "Need more sessions for trend data" };
      }
      const recentRate =
        recentSessions.reduce(
          (a, s) =>
            a +
            s.patterns.filter((p) => p === top.tag).length /
              Math.max(s.questionCount, 1),
          0,
        ) / recentSessions.length;
      const olderRate =
        olderSessions.length > 0
          ? olderSessions.reduce(
              (a, s) =>
                a +
                s.patterns.filter((p) => p === top.tag).length /
                  Math.max(s.questionCount, 1),
              0,
            ) / olderSessions.length
          : recentRate + 0.1;
      const improving = recentRate < olderRate - 0.05;
      return {
        status: improving || top.count < 3 ? "ready" : "needs-work",
        detail: `"${top.tag}" — ${top.count} total occurrences${improving ? ", improving" : ", still showing up"}`,
      };
    },
  },
  {
    id: "salary",
    label: "Salary anchor — can hold the number",
    description:
      "Know your number. Mumbai ₹65–85L. Dubai AED 32–42K/month. Can deflect without caving when pushed back on.",
    category: "tactical",
    drillHref: "/stagecraft/negotiate",
    toolLabel: "Negotiate simulator",
    toolHref: "/stagecraft/negotiate",
    derive: (h) => {
      // This can't be derived from history — treat as always-prep
      return {
        status: "needs-work",
        detail: "Run 2 negotiate scenarios — one Mumbai, one Dubai",
      };
    },
  },
  {
    id: "kohler-vocabulary",
    label: "Kohler brand vocabulary — internalized",
    description:
      "Restraint. Craft. Material honesty. Design leadership. Brand integrity. These words should come naturally, not be forced.",
    category: "tactical",
    drillHref: "/stagecraft/companies/kohler-india",
    toolLabel: "Company brief",
    toolHref: "/stagecraft/companies/kohler-india",
    derive: (h) => {
      const kohlerSessions = h.sessions.filter((s) =>
        s.role.toLowerCase().includes("kohler"),
      );
      if (kohlerSessions.length === 0) {
        return {
          status: "not-started",
          detail: "No Kohler-targeted sessions yet",
        };
      }
      return {
        status: kohlerSessions.length >= 3 ? "ready" : "needs-work",
        detail: `${kohlerSessions.length} Kohler session${kohlerSessions.length !== 1 ? "s" : ""} — read the company brief tonight`,
      };
    },
  },
];

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: ItemStatus }) {
  const styles = {
    ready: "text-sc-green border-sc-green/40 bg-sc-green-bg",
    "needs-work": "text-sc-gold border-sc-gold-dim bg-sc-gold-bg",
    "not-started": "text-sc-red border-sc-red/30 bg-sc-red/5",
  };
  const labels = {
    ready: "✓ Ready",
    "needs-work": "~ Needs work",
    "not-started": "✗ Not started",
  };
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide shrink-0 ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  narrative: "text-sc-gold",
  craft: "text-sc-green",
  business: "text-sc-muted",
  tactical: "text-sc-dim",
};

const CATEGORY_LABELS: Record<string, string> = {
  narrative: "Narrative",
  craft: "Craft",
  business: "Business",
  tactical: "Tactical",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stagecraft/history", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<HistoryPayload>;
      })
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Derive statuses
  const items = data
    ? CHECKLIST.map((item) => ({
        ...item,
        derived: item.derive(data),
      }))
    : null;

  const readyCount = items?.filter((i) => i.derived.status === "ready").length ?? 0;
  const totalCount = CHECKLIST.length;
  const readyPct = Math.round((readyCount / totalCount) * 100);

  const readinessColor =
    readyPct >= 80
      ? "text-sc-green"
      : readyPct >= 50
        ? "text-sc-gold"
        : "text-sc-red";

  // Group by category order
  const categoryOrder: ChecklistItem["category"][] = [
    "narrative",
    "craft",
    "business",
    "tactical",
  ];

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <StagecraftHeader label="Checklist">
        {items && (
          <div className="flex items-center gap-2">
            <span className={`font-display text-2xl font-semibold tabular-nums ${readinessColor}`}>
              {readyPct}%
            </span>
            <span className="font-mono text-xs text-sc-dim">
              {readyCount}/{totalCount} ready
            </span>
          </div>
        )}
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Hero */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            Night before
          </p>
          <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
            Are you ready for the room?
          </h1>
          <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
            Ten things that determine whether you leave with an offer. Statuses
            are derived from your actual session data — not self-reported.
          </p>
        </div>

        {/* Progress bar */}
        {items && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-sc-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  readyPct >= 80
                    ? "bg-sc-green"
                    : readyPct >= 50
                      ? "bg-sc-gold"
                      : "bg-sc-red"
                }`}
                style={{ width: `${readyPct}%` }}
              />
            </div>
            <p className="font-mono text-[10px] text-sc-dim">
              {readyCount} of {totalCount} locked in
              {readyPct < 70 ? " — more work needed before this interview" : readyPct < 90 ? " — almost there" : " — strong position"}
            </p>
          </div>
        )}

        {/* States */}
        {error ? (
          <div className="rounded-sm border border-sc-red/40 bg-sc-red/10 px-4 py-3 text-sm text-sc-red font-mono">
            {error}
          </div>
        ) : loading ? (
          <p className="font-mono text-xs text-sc-dim animate-pulse">
            Reading your session data…
          </p>
        ) : (
          <>
            {/* Items grouped by category */}
            {categoryOrder.map((cat) => {
              const catItems = (items ?? []).filter(
                (i) => i.category === cat,
              );
              if (catItems.length === 0) return null;
              return (
                <div key={cat} className="space-y-2">
                  <p
                    className={`font-mono text-[10px] tracking-widest uppercase ${CATEGORY_COLORS[cat]}`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </p>
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-sm border overflow-hidden transition-all ${
                        item.derived.status === "ready"
                          ? "border-sc-green/30 bg-sc-green-bg"
                          : item.derived.status === "needs-work"
                            ? "border-sc-border bg-sc-surface"
                            : "border-sc-red/20 bg-sc-red/3"
                      }`}
                    >
                      <div className="px-4 py-3.5 space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-sc-ink leading-snug">
                              {item.label}
                            </p>
                            <p className="font-mono text-xs text-sc-dim leading-relaxed mt-0.5">
                              {item.description}
                            </p>
                          </div>
                          <StatusChip status={item.derived.status} />
                        </div>

                        {/* Status detail */}
                        <p
                          className={`font-mono text-[10px] leading-relaxed ${
                            item.derived.status === "ready"
                              ? "text-sc-green"
                              : item.derived.status === "needs-work"
                                ? "text-sc-gold"
                                : "text-sc-red"
                          }`}
                        >
                          {item.derived.detail}
                        </p>
                      </div>

                      {/* Action row */}
                      {item.derived.status !== "ready" && (
                        <div className="border-t border-sc-line px-4 py-2.5 flex items-center gap-4">
                          <Link
                            href={item.toolHref}
                            className="font-mono text-[10px] text-sc-gold hover:brightness-110 transition-colors font-medium"
                          >
                            {item.toolLabel} →
                          </Link>
                          {item.drillHref !== item.toolHref && (
                            <Link
                              href={item.drillHref}
                              className="font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
                            >
                              Drill →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Bottom callout */}
            <div className="border-t border-sc-border pt-6 space-y-3">
              <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-4">
                <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-2">
                  On the morning of the interview
                </p>
                <ol className="space-y-1.5 text-sm text-sc-muted leading-relaxed">
                  <li className="flex gap-2">
                    <span className="font-mono text-sc-gold shrink-0">1.</span>
                    Say your 30-second intro out loud three times.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-sc-gold shrink-0">2.</span>
                    Read the Kohler brand brief one more time — internalize their vocabulary.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-sc-gold shrink-0">3.</span>
                    Say your 18-year answer out loud once, standing up.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-sc-gold shrink-0">4.</span>
                    Know your salary number. Don&apos;t give it away first.
                  </li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/stagecraft"
                  className="rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
                >
                  Final mock session →
                </Link>
                <Link
                  href="/stagecraft/companies/kohler-india"
                  className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
                >
                  Kohler brief →
                </Link>
                <Link
                  href="/stagecraft/memorize"
                  className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
                >
                  Memorize queue →
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
