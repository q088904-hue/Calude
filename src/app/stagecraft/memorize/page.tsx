"use client";

// Memorize queue — two modes:
//
//  LIST MODE   — browse all saved answers, play TTS, drill, remove.
//  RECALL MODE — one card at a time, spaced-repetition ordered.
//                Question shown → try it aloud → Reveal → Nailed it / Again.
//
// Spaced ordering: least-recently-reviewed first (so stale cards surface).
// TTS via Web Speech API — no extra key needed.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MemorizedAnswer } from "@/lib/stagecraft/types";
import { renderSampleAnswer } from "@/lib/stagecraft/feedbackRenderers";

// ── TTS hook ─────────────────────────────────────────────────────────────────

function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const clean = text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\[pause\]/gi, "... ")
      .replace(/\[[^\]]+\]/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.88;
    utterance.pitch = 1.0;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return (
        voices.find((v) => v.name === "Samantha") ??
        voices.find((v) => v.name === "Google US English") ??
        voices.find((v) => v.lang === "en-US" && !v.name.includes("Google")) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        null
      );
    };

    const voice = pickVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return { speaking, speak, stop };
}

// ── Spaced-repetition sort ────────────────────────────────────────────────────
// Least-recently-reviewed first; never-reviewed items always at the front.

function spacedSort(items: MemorizedAnswer[]): MemorizedAnswer[] {
  return [...items].sort((a, b) => {
    const aTime = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
    const bTime = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
    return aTime - bTime; // oldest-reviewed first
  });
}

// ── Listen button (reusable) ──────────────────────────────────────────────────

function ListenButton({ text }: { text: string }) {
  const { speaking, speak, stop } = useSpeech();
  return (
    <button
      type="button"
      onClick={speaking ? stop : () => speak(text)}
      className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-mono transition-all shrink-0 ${
        speaking
          ? "border-sc-gold bg-sc-gold text-sc-void"
          : "border-sc-gold-dim text-sc-gold hover:bg-sc-gold/10"
      }`}
      title={speaking ? "Stop" : "Listen aloud"}
    >
      {speaking ? (
        <>
          <span className="inline-block w-2 h-2 bg-sc-void rounded-sm" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 8 10" className="w-2 h-2.5 fill-current">
            <path d="M0 0 L8 5 L0 10 Z" />
          </svg>
          <span>Listen</span>
        </>
      )}
    </button>
  );
}

// ── Recall card ───────────────────────────────────────────────────────────────

function RecallCard({
  item,
  index,
  total,
  onNailed,
  onAgain,
}: {
  item: MemorizedAnswer;
  index: number;
  total: number;
  onNailed: () => void;
  onAgain: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  // Reset reveal state when card changes
  const itemIdRef = useRef(item.id);
  if (itemIdRef.current !== item.id) {
    itemIdRef.current = item.id;
    // Can't set state during render — use a key prop on the parent instead
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-sc-dim">
          {index + 1} / {total}
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`inline-block h-1 rounded-full transition-all ${
                i < index
                  ? "w-3 bg-sc-green"
                  : i === index
                    ? "w-5 bg-sc-gold"
                    : "w-3 bg-sc-border"
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-sc-dim">
          {item.reviewCount ? `Reviewed ${item.reviewCount}×` : "First attempt"}
        </span>
      </div>

      {/* Question card */}
      <div className="rounded-sm border border-sc-border bg-sc-surface px-5 py-5 space-y-2">
        <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
          Question
        </p>
        <p className="text-lg font-semibold text-sc-ink leading-snug">
          {item.question}
        </p>
        <p className="font-mono text-xs text-sc-muted mt-1">
          Say it aloud from memory — then reveal.
        </p>
      </div>

      {/* Reveal / Answer section */}
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-sm border border-sc-gold-dim bg-sc-gold-bg py-4 text-sm font-semibold text-sc-gold hover:brightness-110 transition-all"
        >
          Reveal answer →
        </button>
      ) : (
        <div className="space-y-4">
          {/* Answer */}
          <div className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-sc-gold-dim/40">
              <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
                Sample answer — compare &amp; close the gap
              </p>
              <ListenButton text={item.answer} />
            </div>
            <div className="px-4 py-4">
              <p className="text-sm text-sc-ink leading-relaxed">
                {renderSampleAnswer(item.answer)}
              </p>
            </div>
          </div>

          {/* Judgment buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onAgain}
              className="rounded-sm border border-sc-border bg-sc-surface px-4 py-3 text-sm font-semibold text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-all"
            >
              ↻ Again
            </button>
            <button
              onClick={onNailed}
              className="rounded-sm bg-sc-green px-4 py-3 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
            >
              ✓ Nailed it
            </button>
          </div>
          <p className="font-mono text-[10px] text-sc-dim text-center">
            "Again" moves this card to the end. "Nailed it" marks it reviewed.
          </p>
        </div>
      )}

      {/* Drill link */}
      <div className="flex justify-center">
        <Link
          href={`/stagecraft?drill=${encodeURIComponent(item.question)}`}
          className="font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
        >
          Drill this question in a full session →
        </Link>
      </div>
    </div>
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────

function RecallDone({ count, onRestart }: { count: number; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-14 text-center">
      <div className="w-14 h-14 rounded-full bg-sc-green-bg border border-sc-green/30 flex items-center justify-center">
        <span className="text-sc-green text-2xl">✓</span>
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold text-sc-ink">
          Queue complete
        </h2>
        <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
          You ran through {count} answer{count !== 1 ? "s" : ""}. Commit the
          structure to muscle memory — say each one again in the shower
          tomorrow.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onRestart}
          className="rounded-sm bg-sc-gold px-6 py-3 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
        >
          Run again →
        </button>
        <Link
          href="/stagecraft"
          className="rounded-sm border border-sc-border bg-sc-surface px-6 py-3 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
        >
          Full session →
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type ViewMode = "list" | "recall";

export default function MemorizePage() {
  const [items, setItems] = useState<MemorizedAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("list");

  // Recall state
  const [recallQueue, setRecallQueue] = useState<MemorizedAnswer[]>([]);
  const [recallIndex, setRecallIndex] = useState(0);
  const [recallDone, setRecallDone] = useState(false);
  const [recallStartCount, setRecallStartCount] = useState(0);

  // Key to force-reset RecallCard state on card change
  const [cardKey, setCardKey] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stagecraft/memorize", { cache: "no-store" });
      if (!res.ok) throw new Error(`List ${res.status}`);
      const data = (await res.json()) as MemorizedAnswer[];
      setItems(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/stagecraft/memorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", id }),
        });
        if (!res.ok) throw new Error(`Remove ${res.status}`);
        await refresh();
      } catch (err) {
        setError(String(err));
      }
    },
    [refresh],
  );

  const bump = useCallback(async (id: string) => {
    try {
      await fetch("/api/stagecraft/memorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bump", id }),
      });
    } catch {
      /* non-blocking */
    }
  }, []);

  // ── Recall mode ────────────────────────────────────────────────────────────

  const startRecall = useCallback(() => {
    const sorted = spacedSort(items);
    setRecallQueue(sorted);
    setRecallIndex(0);
    setRecallDone(false);
    setRecallStartCount(sorted.length);
    setCardKey((k) => k + 1);
    setMode("recall");
  }, [items]);

  const handleNailed = useCallback(async () => {
    const current = recallQueue[recallIndex];
    if (current) await bump(current.id);

    const next = recallIndex + 1;
    if (next >= recallQueue.length) {
      setRecallDone(true);
    } else {
      setRecallIndex(next);
      setCardKey((k) => k + 1);
    }
  }, [recallQueue, recallIndex, bump]);

  const handleAgain = useCallback(() => {
    const current = recallQueue[recallIndex];
    if (!current) return;
    // Move current card to end of queue
    setRecallQueue((q) => {
      const next = [...q];
      next.splice(recallIndex, 1);
      next.push(current);
      return next;
    });
    // index stays the same (now pointing to the next card)
    // If we were at the last position, wrap
    setRecallIndex((i) => Math.min(i, recallQueue.length - 2));
    setCardKey((k) => k + 1);
  }, [recallQueue, recallIndex]);

  const restartRecall = useCallback(() => {
    const sorted = spacedSort(items);
    setRecallQueue(sorted);
    setRecallIndex(0);
    setRecallDone(false);
    setRecallStartCount(sorted.length);
    setCardKey((k) => k + 1);
  }, [items]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <header className="border-b border-sc-border px-6 py-4 flex items-center justify-between sticky top-0 bg-sc-bg z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/stagecraft"
            className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
          >
            ← Stagecraft
          </Link>
          <span className="text-sc-border text-xs">·</span>
          <span className="font-display text-base font-semibold text-sc-ink">
            Memorize queue
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!loading && items.length > 0 && (
            <span className="font-mono text-xs text-sc-dim">
              {items.length} saved
            </span>
          )}
          {mode === "recall" && (
            <button
              onClick={() => setMode("list")}
              className="rounded-sm border border-sc-border bg-sc-surface px-3 py-1.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
            >
              List view
            </button>
          )}
          {mode === "list" && !loading && items.length > 0 && (
            <button
              onClick={startRecall}
              className="rounded-sm bg-sc-gold px-3 py-1.5 font-mono text-xs font-semibold text-sc-void hover:brightness-110 transition-all"
            >
              Recall mode →
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* ── LIST MODE ── */}
        {mode === "list" && (
          <>
            <div className="mb-8">
              <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
                Your drill
              </p>
              <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
                Answers worth memorizing.
              </h1>
              <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
                Sample answers you&apos;ve saved from practice. Hit{" "}
                <span className="font-semibold text-sc-gold">Recall mode</span>{" "}
                to run through them one by one — question first, then reveal.
              </p>
            </div>

            {error ? (
              <div className="mb-6 rounded-sm border border-sc-red/40 bg-sc-red/10 px-4 py-3 text-sm text-sc-red font-mono">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="font-mono text-xs tracking-widest text-sc-dim uppercase animate-pulse">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <div className="rounded-sm border border-dashed border-sc-border p-10 text-center">
                <p className="font-mono text-xs text-sc-dim mb-2">Queue is empty</p>
                <p className="text-sm text-sc-muted mb-5">
                  Heart a sample answer during practice and it appears here.
                </p>
                <Link
                  href="/stagecraft"
                  className="inline-block rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
                >
                  Start a session →
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((m, i) => (
                  <li
                    key={m.id}
                    className="rounded-sm border border-sc-border bg-sc-surface hover:border-sc-gold-dim/40 transition-colors overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="px-4 py-3 border-b border-sc-line flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-sc-gold shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-xs text-sc-dim shrink-0">
                          {new Date(m.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {m.reviewCount ? (
                          <span className="font-mono text-xs text-sc-dim shrink-0">
                            · {m.reviewCount}× reviewed
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-sc-red shrink-0">
                            · not yet recalled
                          </span>
                        )}
                        {m.lastReviewedAt && (
                          <span className="font-mono text-[10px] text-sc-dim truncate">
                            · last{" "}
                            {new Date(m.lastReviewedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/stagecraft?drill=${encodeURIComponent(m.question)}`}
                          className="rounded-sm border border-sc-border bg-sc-raised px-2.5 py-1 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-all"
                        >
                          Drill →
                        </Link>
                        <button
                          type="button"
                          onClick={() => void remove(m.id)}
                          className="rounded-sm border border-sc-border bg-sc-raised px-2.5 py-1 text-xs font-mono text-sc-dim hover:border-sc-red/40 hover:text-sc-red transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Question */}
                    <div className="px-4 pt-3 pb-2">
                      <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1">
                        Question
                      </p>
                      <p className="text-sm font-semibold text-sc-ink leading-snug">
                        {m.question}
                      </p>
                    </div>

                    {/* Answer with TTS */}
                    <div className="border-t border-sc-line mx-4 mt-2" />
                    <div className="px-4 pt-3 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
                          Sample answer
                        </p>
                        <ListenButton text={m.answer} />
                      </div>
                      <p className="text-sm text-sc-muted leading-relaxed">
                        {renderSampleAnswer(m.answer)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* ── RECALL MODE ── */}
        {mode === "recall" && (
          <>
            <div className="mb-8">
              <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
                Recall mode
              </p>
              <h1 className="font-display text-2xl font-semibold text-sc-ink leading-tight">
                Stale cards first.
              </h1>
              <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
                Say the answer aloud before you reveal. The gap between what
                you meant to say and what you actually said — that's where the
                work is.
              </p>
            </div>

            {recallDone ? (
              <RecallDone
                count={recallStartCount}
                onRestart={restartRecall}
              />
            ) : recallQueue.length > 0 ? (
              <RecallCard
                key={cardKey}
                item={recallQueue[recallIndex]!}
                index={recallIndex}
                total={recallQueue.length}
                onNailed={handleNailed}
                onAgain={handleAgain}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
