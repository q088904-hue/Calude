"use client";

// Session replay page — /stagecraft/history/[id]
// Reads back the full session: every question, John's transcript,
// all three coaching blocks, and scores. Designed for commute review.

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { parseFeedbackSections } from "@/lib/stagecraft/feedbackParser";
import { renderSampleAnswer } from "@/lib/stagecraft/feedbackRenderers";
import { SessionReportView } from "@/lib/stagecraft/SessionReportView";
import type { QAItem, SessionRecord } from "@/lib/stagecraft/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROUND_LABELS: Record<string, string> = {
  hr: "HR / Screening",
  "hiring-manager": "Hiring Manager",
  portfolio: "Portfolio / CD",
  leadership: "Leadership / CXO",
  stress: "Curveball / Stress",
  mixed: "Mixed mock",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  "warm-up": "Warm-up",
  realistic: "Realistic",
  tough: "Tough",
};

function sessionComposite(record: SessionRecord): number | null {
  if (record.items.length === 0) return null;
  const n = record.items.length;
  const sum = record.items.reduce(
    (a, it) => ({
      c: a.c + it.scores.content,
      e: a.e + it.scores.english,
      d: a.d + it.scores.delivery,
    }),
    { c: 0, e: 0, d: 0 },
  );
  return +(sum.c * 0.4 / n + sum.e * 0.3 / n + sum.d * 0.3 / n).toFixed(1);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreChip({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const cls =
    value >= 8
      ? "text-sc-green border-sc-green/30 bg-sc-green-bg"
      : value >= 6
        ? "text-sc-gold border-sc-gold-dim bg-sc-gold-bg"
        : "text-sc-red border-sc-red/30 bg-sc-red/5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-xs ${cls}`}
    >
      <span className="opacity-50 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="font-bold tabular-nums">{value}/10</span>
    </span>
  );
}

function QACard({ item, n }: { item: QAItem; n: number }) {
  const [open, setOpen] = useState(false);
  const sections = parseFeedbackSections(item.feedback);
  const composite = +(
    (item.scores.content + item.scores.english + item.scores.delivery) /
    3
  ).toFixed(1);

  const compositeColor =
    composite >= 8
      ? "text-sc-green"
      : composite >= 6
        ? "text-sc-gold"
        : "text-sc-red";

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
      {/* ── Card header (always visible) ── */}
      <div className="px-4 py-4 space-y-3">
        {/* Question row */}
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs text-sc-dim shrink-0 mt-0.5 w-5 text-right">
            {n}
          </span>
          <p className="text-sm font-medium text-sc-ink leading-snug flex-1">
            {item.question}
          </p>
          <span
            className={`font-display text-lg font-semibold ${compositeColor} shrink-0 tabular-nums`}
          >
            {composite}
          </span>
        </div>

        {/* Score chips */}
        <div className="flex flex-wrap gap-1.5 pl-8">
          <ScoreChip label="Content" value={item.scores.content} />
          <ScoreChip label="English" value={item.scores.english} />
          <ScoreChip label="Delivery" value={item.scores.delivery} />
        </div>

        {/* Pattern tags */}
        {item.patterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-8">
            {[...new Set(item.patterns)].map((p) => (
              <span
                key={p}
                className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-2 py-0.5 font-mono text-xs text-sc-muted"
              >
                {p}
              </span>
            ))}
          </div>
        )}

        {/* John's answer (always visible) */}
        {item.answer && (
          <div className="pl-8">
            <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1.5">
              Your answer
            </p>
            <p className="text-sm text-sc-muted leading-relaxed">{item.answer}</p>
          </div>
        )}

        {/* Sample answer preview — always shown, no need to expand */}
        {sections?.sampleAnswer && (
          <div className="pl-8">
            <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-1.5">
              Sample answer
            </p>
            <p className="text-sm text-sc-ink leading-relaxed">
              {renderSampleAnswer(sections.sampleAnswer)}
            </p>
          </div>
        )}
      </div>

      {/* ── Per-question drill link ── */}
      <div className="border-t border-sc-line px-4 py-2.5 flex items-center gap-3">
        <Link
          href={`/stagecraft/drill?q=${encodeURIComponent(item.question)}`}
          className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors"
        >
          Re-drill this question →
        </Link>
      </div>

      {/* ── Expandable coaching detail ── */}
      {sections && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full border-t border-sc-line px-4 py-2.5 flex items-center justify-between font-mono text-xs text-sc-dim hover:text-sc-ink hover:bg-sc-raised transition-colors"
          >
            <span>{open ? "Hide" : "Show"} grammar fix & delivery tip</span>
            <span>{open ? "▲" : "▼"}</span>
          </button>

          {open && (
            <div className="border-t border-sc-line px-4 py-4 space-y-4 bg-sc-raised">
              {/* Grammar fix */}
              <div>
                <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-2">
                  Grammar fix
                </p>
                <p className="text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">
                  {sections.grammarFix}
                </p>
              </div>

              {/* Delivery tip */}
              <div>
                <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1.5">
                  Delivery tip
                </p>
                <p className="text-sm text-sc-muted leading-relaxed">
                  {sections.deliveryTip}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stagecraft/session?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Session not found (${res.status}).`);
        return res.json() as Promise<SessionRecord>;
      })
      .then(setRecord)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const composite = record ? sessionComposite(record) : null;

  const compositeColor =
    composite === null
      ? "text-sc-dim"
      : composite >= 8
        ? "text-sc-green"
        : composite >= 6
          ? "text-sc-gold"
          : "text-sc-red";

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* ── Header ── */}
      <header className="border-b border-sc-border px-6 py-4 flex items-center justify-between sticky top-0 bg-sc-bg z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
          >
            ← Home
          </Link>
          <span className="text-sc-border text-xs">·</span>
          <Link
            href="/stagecraft"
            className="font-mono text-xs text-sc-muted hover:text-sc-gold transition-colors"
          >
            Stagecraft
          </Link>
          <span className="text-sc-border text-xs">·</span>
          <Link
            href="/stagecraft/history"
            className="font-mono text-xs text-sc-muted hover:text-sc-gold transition-colors"
          >
            History
          </Link>
          <span className="text-sc-border text-xs">·</span>
          <span className="font-display text-base font-semibold text-sc-ink">
            Session
          </span>
        </div>
        {record && composite !== null && (
          <span className={`font-display text-xl font-semibold ${compositeColor} tabular-nums`}>
            {composite}
          </span>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {error ? (
          <div className="rounded-sm border border-sc-red/40 bg-sc-red/10 px-4 py-3 text-sm text-sc-red font-mono">
            {error}
          </div>
        ) : loading ? (
          <p className="font-mono text-xs tracking-widest text-sc-dim uppercase animate-pulse">
            Loading…
          </p>
        ) : !record ? null : (
          <>
            {/* ── Session metadata ── */}
            <div className="space-y-1">
              <p className="font-mono text-xs tracking-widest text-sc-gold uppercase">
                Session review
              </p>
              <h1 className="font-display text-2xl font-semibold text-sc-ink leading-tight">
                {record.config.targetRole}
              </h1>
              <p className="font-mono text-xs text-sc-dim mt-1 leading-relaxed">
                {fmtDate(record.startedAt)}
                {" · "}
                {ROUND_LABELS[record.config.round] ?? record.config.round}
                {" · "}
                {DIFFICULTY_LABELS[record.config.difficulty] ?? record.config.difficulty}
                {" · "}
                {record.items.length}Q
              </p>
            </div>

            {/* ── Score summary strip ── */}
            {record.items.length > 0 && (() => {
              const n = record.items.length;
              const avgC = +(record.items.reduce((a, it) => a + it.scores.content, 0) / n).toFixed(1);
              const avgE = +(record.items.reduce((a, it) => a + it.scores.english, 0) / n).toFixed(1);
              const avgD = +(record.items.reduce((a, it) => a + it.scores.delivery, 0) / n).toFixed(1);
              return (
                <div className="flex flex-wrap gap-2.5">
                  <ScoreChip label="Content avg" value={avgC} />
                  <ScoreChip label="English avg" value={avgE} />
                  <ScoreChip label="Delivery avg" value={avgD} />
                </div>
              );
            })()}

            {/* ── AI session report (if exists) ── */}
            {record.report && (
              <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm">
                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  className="w-full px-4 py-3 flex items-center justify-between font-mono text-xs text-sc-dim hover:text-sc-ink hover:bg-sc-raised transition-colors"
                >
                  <span className="tracking-widest uppercase">
                    Session report
                  </span>
                  <span>{reportOpen ? "▲" : "▼"}</span>
                </button>
                {reportOpen && (
                  <div className="border-t border-sc-line px-4 py-4">
                    <SessionReportView raw={record.report} />
                  </div>
                )}
              </div>
            )}

            {/* ── Q&A list ── */}
            <div className="space-y-4">
              <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
                {record.items.length} question{record.items.length !== 1 ? "s" : ""}
              </p>
              {record.items.map((item) => (
                <QACard key={item.index} item={item} n={item.index} />
              ))}
            </div>

            {/* ── Footer actions ── */}
            <div className="flex gap-3 pt-2 border-t border-sc-border">
              <Link
                href="/stagecraft/history"
                className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-ink hover:border-sc-gold-dim transition-colors"
              >
                ← All sessions
              </Link>
              <Link
                href="/stagecraft"
                className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-2.5 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors"
              >
                New session →
              </Link>
              <Link
                href="/stagecraft/drill"
                className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-ink hover:border-sc-gold-dim transition-colors"
              >
                Drill →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
