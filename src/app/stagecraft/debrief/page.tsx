"use client";

// Stagecraft — Post-interview debrief.
// After a real interview: type in what you were asked and what you said (from
// memory). Each answer goes through the same grade + coaching pipeline as a
// practice session. The debrief is saved to history so pattern data accumulates.
//
// State machine: compose → grading → done

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import {
  parseFeedbackSections,
  type FeedbackSections,
} from "@/lib/stagecraft/feedbackParser";
import { renderSampleAnswer } from "@/lib/stagecraft/feedbackRenderers";
import { COMPANY_PACKS, getPackById } from "@/lib/stagecraft/companyPacks";
import type { Round, QAItem } from "@/lib/stagecraft/types";
import { getSRClass, type SREvent, type SRInstance } from "@/lib/stagecraft/speechRecognition";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QAPair {
  id: string; // local key
  question: string;
  answer: string;
  round: Round;
}

interface GradedPair extends QAPair {
  feedback: string; // raw 5-block markdown
  content: number;
  english: number;
  delivery: number;
  patterns: string[];
  sections: FeedbackSections | null;
}

type PageStage = "compose" | "grading" | "done";

// ── Helpers ───────────────────────────────────────────────────────────────────

const META_RE = /\[META\](\{[\s\S]*?\})\[\/META\]/;

function parseMeta(text: string) {
  const m = text.match(META_RE);
  if (m) {
    try {
      const p = JSON.parse(m[1]) as {
        content?: number;
        english?: number;
        delivery?: number;
        patterns?: string[];
      };
      return {
        content: Number(p.content) || 0,
        english: Number(p.english) || 0,
        delivery: Number(p.delivery) || 0,
        patterns: Array.isArray(p.patterns) ? p.patterns : [],
      };
    } catch { /* fall through */ }
  }
  const grab = (label: string) =>
    Number(text.match(new RegExp(`${label}\\s*:\\s*(\\d+)\\s*\\/\\s*10`, "i"))?.[1] ?? 0);
  return {
    content: grab("Content"),
    english: grab("English"),
    delivery: grab("Delivery"),
    patterns: [] as string[],
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function newSessionId() {
  return `debrief_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const ROUND_OPTIONS: { value: Round; label: string }[] = [
  { value: "hr", label: "HR / Screening" },
  { value: "hiring-manager", label: "Hiring Manager" },
  { value: "portfolio", label: "Portfolio / CD" },
  { value: "leadership", label: "Leadership / CXO" },
  { value: "stress", label: "Curveball / Stress" },
  { value: "mixed", label: "Mixed / Unsure" },
];

// ── Score chip ────────────────────────────────────────────────────────────────

function ScoreChip({ label, value }: { label: string; value: number }) {
  const cls =
    value >= 8
      ? "text-sc-green border-sc-green/30 bg-sc-green-bg"
      : value >= 6
        ? "text-sc-gold border-sc-gold-dim bg-sc-gold-bg"
        : "text-sc-red border-sc-red/30 bg-sc-red/5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-xs ${cls}`}>
      <span className="opacity-50 text-xs uppercase tracking-wider">{label}</span>
      <span className="font-bold tabular-nums">{value}/10</span>
    </span>
  );
}

// ── Graded Q card ─────────────────────────────────────────────────────────────

function GradedCard({ pair, n }: { pair: GradedPair; n: number }) {
  const [open, setOpen] = useState(false);
  const composite = +((pair.content + pair.english + pair.delivery) / 3).toFixed(1);
  const compositeColor =
    composite >= 8 ? "text-sc-green" : composite >= 6 ? "text-sc-gold" : "text-sc-red";

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
      <div className="px-4 py-4 space-y-3">
        {/* Question + composite */}
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs text-sc-dim shrink-0 mt-0.5 w-5 text-right">{n}</span>
          <p className="text-sm font-medium text-sc-ink leading-snug flex-1">{pair.question}</p>
          <span className={`font-display text-lg font-semibold ${compositeColor} shrink-0 tabular-nums`}>
            {composite}
          </span>
        </div>

        {/* Scores */}
        <div className="flex flex-wrap gap-1.5 pl-8">
          <ScoreChip label="Content" value={pair.content} />
          <ScoreChip label="English" value={pair.english} />
          <ScoreChip label="Delivery" value={pair.delivery} />
        </div>

        {/* Pattern tags */}
        {pair.patterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-8">
            {[...new Set(pair.patterns)].map((p) => (
              <span key={p} className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-2 py-0.5 font-mono text-xs text-sc-muted">
                {p}
              </span>
            ))}
          </div>
        )}

        {/* What you said */}
        <div className="pl-8">
          <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1.5">What you said</p>
          <p className="text-sm text-sc-muted leading-relaxed">{pair.answer}</p>
        </div>

        {/* Sample answer — always visible */}
        {pair.sections?.sampleAnswer && (
          <div className="pl-8">
            <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-1.5">
              Better answer — memorize this
            </p>
            <p className="text-sm text-sc-ink leading-relaxed">
              {renderSampleAnswer(pair.sections.sampleAnswer)}
            </p>
          </div>
        )}
      </div>

      {/* Toggle coaching detail */}
      {pair.sections && (
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
              <div>
                <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-2">Grammar fix</p>
                <p className="text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">{pair.sections.grammarFix}</p>
              </div>
              <div>
                <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1.5">Delivery tip</p>
                <p className="text-sm text-sc-muted leading-relaxed">{pair.sections.deliveryTip}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── In-progress card (streaming) ──────────────────────────────────────────────

function GradingCard({ pair, n, streaming, partial }: {
  pair: QAPair;
  n: number;
  streaming: boolean;
  partial: string;
}) {
  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-sc-dim shrink-0 mt-0.5 w-5 text-right">{n}</span>
        <p className="text-sm font-medium text-sc-ink leading-snug flex-1">{pair.question}</p>
        {streaming && (
          <span className="font-mono text-xs text-sc-gold animate-pulse shrink-0">coaching…</span>
        )}
      </div>
      {partial && (
        <p className="pl-8 text-xs text-sc-muted font-mono leading-relaxed whitespace-pre-wrap line-clamp-4">
          {partial}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DebriefPage() {
  const [stage, setStage] = useState<PageStage>("compose");
  const [companyPackId, setCompanyPackId] = useState("kohler-india");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [pairs, setPairs] = useState<QAPair[]>(() => [
    { id: uid(), question: "", answer: "", round: "hr" },
  ]);

  // Graded results (built up as we process)
  const [graded, setGraded] = useState<GradedPair[]>([]);
  // Which pair is currently being graded
  const [gradingIndex, setGradingIndex] = useState<number>(-1);
  // Partial streamed text for the currently-grading pair
  const [streamingText, setStreamingText] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const sessionIdRef = useRef(newSessionId());

  // ── Web Speech state ──────────────────────────────────────────────────────
  const [speechSupported, setSpeechSupported] = useState(false);
  // Which pair ID is currently being recorded (null = none)
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  // Per-pair interim text while SR is running
  const [interimTexts, setInterimTexts] = useState<Record<string, string>>({});
  // Per-pair elapsed recording seconds
  const [srSecondsMap, setSrSecondsMap] = useState<Record<string, number>>({});
  const srRef = useRef<SRInstance | null>(null);
  const srTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSpeechSupported(getSRClass() !== null);
    return () => {
      srRef.current?.stop();
      srRef.current = null;
      if (srTimerRef.current) clearInterval(srTimerRef.current);
    };
  }, []);

  const activePack = getPackById(companyPackId);

  // ── Compose helpers ──────────────────────────────────────────────────────

  const addPair = () => {
    if (pairs.length >= 10) return;
    const last = pairs[pairs.length - 1];
    setPairs((p) => [
      ...p,
      { id: uid(), question: "", answer: "", round: last?.round ?? "hr" },
    ]);
  };

  const removePair = (id: string) => {
    if (pairs.length <= 1) return;
    setPairs((p) => p.filter((x) => x.id !== id));
  };

  const updatePair = (id: string, field: keyof QAPair, value: string) => {
    setPairs((p) =>
      p.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    );
  };

  const validPairs = pairs.filter((p) => p.question.trim() && p.answer.trim());

  const toggleSR = useCallback((pairId: string) => {
    // If already recording this pair — stop
    if (activeRecordingId === pairId) {
      srRef.current?.stop();
      srRef.current = null;
      if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; }
      setActiveRecordingId(null);
      setInterimTexts((prev) => ({ ...prev, [pairId]: "" }));
      setSrSecondsMap((prev) => ({ ...prev, [pairId]: 0 }));
      return;
    }
    // Stop any currently-running SR and its timer first
    srRef.current?.stop();
    srRef.current = null;
    if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; }

    const SR = getSRClass();
    if (!SR) return;

    const sr = new SR();
    sr.lang = "en-IN";
    sr.continuous = true;
    sr.interimResults = true;

    let final = "";
    sr.onresult = (e: SREvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < Object.keys(e.results).length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final = final ? final.trimEnd() + " " + seg.trimStart() : seg;
          updatePair(pairId, "answer", final);
        } else {
          interim += seg;
        }
      }
      setInterimTexts((prev) => ({ ...prev, [pairId]: interim }));
    };
    sr.onend = () => {
      if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; }
      setActiveRecordingId(null);
      setInterimTexts((prev) => ({ ...prev, [pairId]: "" }));
    };
    sr.onerror = () => {
      if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; }
      setActiveRecordingId(null);
      setInterimTexts((prev) => ({ ...prev, [pairId]: "" }));
    };

    srRef.current = sr;
    // Start elapsed timer for this pair
    setSrSecondsMap((prev) => ({ ...prev, [pairId]: 0 }));
    srTimerRef.current = setInterval(() => {
      setSrSecondsMap((prev) => ({ ...prev, [pairId]: (prev[pairId] ?? 0) + 1 }));
    }, 1000);
    sr.start();
    setActiveRecordingId(pairId);
    // Reset interim for this pair
    setInterimTexts((prev) => ({ ...prev, [pairId]: "" }));
    // Clear current answer so fresh recording replaces it
    final = pairs.find((p) => p.id === pairId)?.answer ?? "";
  }, [activeRecordingId, pairs, updatePair]);

  // ── Grading ──────────────────────────────────────────────────────────────

  const gradeAll = useCallback(async () => {
    if (validPairs.length === 0) return;
    setStage("grading");
    setGraded([]);
    setGradingIndex(0);

    const targetContext = activePack?.brandBrief ??
      `SESSION CONTEXT: Post-interview debrief for ${companyPackId || "a senior creative role"}.`;

    const results: GradedPair[] = [];

    for (let i = 0; i < validPairs.length; i++) {
      const pair = validPairs[i];
      setGradingIndex(i);
      setStreamingText("");

      try {
        const res = await fetch("/api/stagecraft/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: pair.question,
            answer: pair.answer,
            round: pair.round,
            questionIndex: i + 1,
            totalQuestions: validPairs.length,
            difficulty: "realistic",
            targetContext,
          }),
        });

        if (!res.ok || !res.body) {
          results.push({
            ...pair,
            feedback: "[grading failed]",
            content: 0, english: 0, delivery: 0, patterns: [],
            sections: null,
          });
          setGraded([...results]);
          continue;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setStreamingText(acc);
        }

        const scores = parseMeta(acc);
        const sections = parseFeedbackSections(acc);
        results.push({ ...pair, feedback: acc, ...scores, sections });
        setGraded([...results]);
      } catch {
        results.push({
          ...pair,
          feedback: "[grading error]",
          content: 0, english: 0, delivery: 0, patterns: [],
          sections: null,
        });
        setGraded([...results]);
      }
    }

    setGradingIndex(-1);
    setStreamingText("");
    setStage("done");
  }, [validPairs, activePack, companyPackId]);

  // ── Save to history ───────────────────────────────────────────────────────

  const saveToHistory = useCallback(async () => {
    if (graded.length === 0) return;
    setSaveStatus("saving");
    const sessionId = sessionIdRef.current;

    // Build QAItems from graded pairs
    const items: QAItem[] = graded.map((g, i) => ({
      index: i + 1,
      round: g.round,
      question: g.question,
      answer: g.answer,
      feedback: g.feedback,
      scores: { content: g.content, english: g.english, delivery: g.delivery },
      patterns: g.patterns,
      createdAt: new Date().toISOString(),
    }));

    try {
      // Create session record
      await fetch("/api/stagecraft/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          id: sessionId,
          config: {
            targetRole: activePack?.label ?? companyPackId ?? "Post-interview debrief",
            round: "mixed",
            questionCount: items.length,
            difficulty: "realistic",
            focus: null,
          },
        }),
      });

      // Append all items
      for (const item of items) {
        await fetch("/api/stagecraft/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "appendItem", id: sessionId, item }),
        });
      }

      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [graded, activePack, companyPackId]);

  // ── Render ────────────────────────────────────────────────────────────────

  const avgComposite = graded.length > 0
    ? +(graded.reduce((a, g) => a + (g.content + g.english + g.delivery) / 3, 0) / graded.length).toFixed(1)
    : null;

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* ── Header ── */}
      <StagecraftHeader label="Debrief">
        {avgComposite !== null && (
          <span className={`font-display text-xl font-semibold tabular-nums ${
            avgComposite >= 8 ? "text-sc-green" : avgComposite >= 6 ? "text-sc-gold" : "text-sc-red"
          }`}>
            {avgComposite}
          </span>
        )}
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* ── Hero ── */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            Post-interview debrief
          </p>
          <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
            What happened in there?
          </h1>
          <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
            Type what you were asked and what you said — from memory, right now,
            while it&apos;s fresh. The coach will score each answer and show you
            what would have landed better.
          </p>
        </div>

        {/* ── Compose stage ── */}
        {stage === "compose" && (
          <>
            {/* Company + date */}
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">Company</p>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => setCompanyPackId(pack.id)}
                      className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-all ${
                        companyPackId === pack.id
                          ? "border-sc-gold-dim bg-sc-gold-bg text-sc-gold"
                          : "border-sc-border bg-sc-surface text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold"
                      }`}
                    >
                      {pack.shortName}
                    </button>
                  ))}
                  <button
                    onClick={() => setCompanyPackId("")}
                    className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-all ${
                      companyPackId === ""
                        ? "border-sc-gold-dim bg-sc-gold-bg text-sc-gold"
                        : "border-sc-border bg-sc-surface text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold"
                    }`}
                  >
                    Other
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">Interview date</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-3 py-2 text-sm text-sc-ink focus:border-sc-gold-dim focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Q&A pairs */}
            <div className="space-y-4">
              <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
                Questions &amp; answers ({pairs.length}/10)
              </p>

              {pairs.map((pair, i) => (
                <div key={pair.id} className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
                  {/* Pair header */}
                  <div className="px-4 py-2.5 border-b border-sc-line flex items-center justify-between bg-sc-raised">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-sc-gold w-5">Q{i + 1}</span>
                      <select
                        value={pair.round}
                        onChange={(e) => updatePair(pair.id, "round", e.target.value)}
                        className="bg-transparent font-mono text-xs text-sc-dim border-none focus:outline-none cursor-pointer hover:text-sc-ink transition-colors"
                      >
                        {ROUND_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {pairs.length > 1 && (
                      <button
                        onClick={() => removePair(pair.id)}
                        className="font-mono text-xs text-sc-dim hover:text-sc-red transition-colors"
                      >
                        remove
                      </button>
                    )}
                  </div>

                  {/* Question */}
                  <div className="px-4 pt-3 pb-2">
                    <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1.5">
                      What they asked
                    </p>
                    <textarea
                      value={pair.question}
                      onChange={(e) => updatePair(pair.id, "question", e.target.value)}
                      placeholder="Paste or type the question as best you remember it…"
                      rows={2}
                      className="w-full bg-transparent text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="border-t border-sc-line mx-4" />

                  {/* Answer */}
                  <div className="px-4 pt-3 pb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
                        What you said
                      </p>
                      {speechSupported && (
                        <button
                          type="button"
                          onClick={() => toggleSR(pair.id)}
                          className={`flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-xs transition-all ${
                            activeRecordingId === pair.id
                              ? "border-sc-red bg-sc-red/10 text-sc-red"
                              : "border-sc-gold-dim bg-sc-gold-bg text-sc-gold hover:bg-sc-gold/20"
                          }`}
                        >
                          {activeRecordingId === pair.id ? "⏹ Stop" : "🎙 Speak"}
                        </button>
                      )}
                    </div>
                    {activeRecordingId === pair.id && (
                      <div className="flex items-center gap-3 mb-1.5">
                        <p className="font-mono text-xs text-sc-gold animate-pulse">
                          Listening… speak what you said in the interview
                        </p>
                        <span className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${
                          (srSecondsMap[pair.id] ?? 0) >= 90
                            ? "text-sc-red"
                            : (srSecondsMap[pair.id] ?? 0) >= 60
                              ? "text-sc-gold"
                              : "text-sc-green"
                        }`}>
                          {String(Math.floor((srSecondsMap[pair.id] ?? 0) / 60)).padStart(1, "0")}:{String((srSecondsMap[pair.id] ?? 0) % 60).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                    {interimTexts[pair.id] && activeRecordingId === pair.id && (
                      <p className="font-mono text-xs text-sc-dim italic mb-1.5 leading-relaxed">
                        {interimTexts[pair.id]}
                      </p>
                    )}
                    <textarea
                      value={pair.answer}
                      onChange={(e) => updatePair(pair.id, "answer", e.target.value)}
                      placeholder="Write what you said — don't polish it, write it as you said it…"
                      rows={3}
                      className="w-full bg-transparent text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ))}

              {pairs.length < 10 && (
                <button
                  onClick={addPair}
                  className="w-full rounded-sm border border-dashed border-sc-border px-4 py-3 font-mono text-xs text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
                >
                  + Add another question
                </button>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                onClick={gradeAll}
                disabled={validPairs.length === 0}
                className="w-full rounded-sm bg-sc-gold px-6 py-3.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Grade {validPairs.length} answer{validPairs.length !== 1 ? "s" : ""} →
              </button>
              {validPairs.length < pairs.length && (
                <p className="mt-2 font-mono text-xs text-sc-dim text-center">
                  {pairs.length - validPairs.length} incomplete pair{pairs.length - validPairs.length !== 1 ? "s" : ""} will be skipped
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Grading stage ── */}
        {(stage === "grading" || stage === "done") && (
          <div className="space-y-4">
            {/* Progress header */}
            {stage === "grading" && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-sc-border relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-sc-gold transition-all duration-500"
                    style={{ width: `${((graded.length) / validPairs.length) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-sc-dim shrink-0">
                  {graded.length}/{validPairs.length}
                </span>
              </div>
            )}

            {/* Results label */}
            <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
              {stage === "done" ? `${graded.length} answer${graded.length !== 1 ? "s" : ""} graded` : "Grading…"}
            </p>

            {/* Graded cards */}
            {graded.map((g, i) => (
              <GradedCard key={g.id} pair={g} n={i + 1} />
            ))}

            {/* In-progress card */}
            {stage === "grading" && gradingIndex >= 0 && gradingIndex < validPairs.length && !graded.find(g => g.id === validPairs[gradingIndex]?.id) && (
              <GradingCard
                pair={validPairs[gradingIndex]}
                n={graded.length + 1}
                streaming
                partial={streamingText}
              />
            )}

            {/* Pending cards (greyed out) */}
            {stage === "grading" && validPairs.slice(gradingIndex + 1).map((pair, i) => (
              <div key={pair.id} className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 opacity-30">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs text-sc-dim shrink-0 mt-0.5 w-5 text-right">
                    {graded.length + i + 2}
                  </span>
                  <p className="text-sm text-sc-dim leading-snug">{pair.question}</p>
                </div>
              </div>
            ))}

            {/* Done actions */}
            {stage === "done" && (
              <div className="pt-2 space-y-3">
                {/* Score summary */}
                {graded.length > 0 && (() => {
                  const n = graded.length;
                  const avgC = +(graded.reduce((a, g) => a + g.content, 0) / n).toFixed(1);
                  const avgE = +(graded.reduce((a, g) => a + g.english, 0) / n).toFixed(1);
                  const avgD = +(graded.reduce((a, g) => a + g.delivery, 0) / n).toFixed(1);
                  return (
                    <div className="flex flex-wrap gap-2">
                      <ScoreChip label="Content avg" value={avgC} />
                      <ScoreChip label="English avg" value={avgE} />
                      <ScoreChip label="Delivery avg" value={avgD} />
                    </div>
                  );
                })()}

                {/* Save button */}
                <div className="flex gap-3 border-t border-sc-border pt-4">
                  {saveStatus === "saved" ? (
                    <span className="flex-1 rounded-sm border border-sc-green/40 bg-sc-green-bg px-4 py-2.5 font-mono text-xs text-sc-green text-center">
                      ✓ Saved to history
                    </span>
                  ) : (
                    <button
                      onClick={saveToHistory}
                      disabled={saveStatus === "saving"}
                      className="flex-1 rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-2.5 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors disabled:opacity-50"
                    >
                      {saveStatus === "saving" ? "Saving…" : "Save to history →"}
                    </button>
                  )}
                  {saveStatus === "saved" && (
                    <Link
                      href="/stagecraft/history"
                      className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
                    >
                      View in history →
                    </Link>
                  )}
                  {saveStatus === "error" && (
                    <p className="font-mono text-xs text-sc-red">Save failed — try again.</p>
                  )}
                </div>

                {/* Next steps */}
                <div className="flex gap-3">
                  <Link href="/stagecraft" className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors">
                    Practice session →
                  </Link>
                  <Link href="/stagecraft/drill" className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors">
                    Drill weak questions →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
