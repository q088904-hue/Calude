"use client";

// Quick Fire — zero-friction single-question practice.
// No setup. Random question from a high-priority pool.
// Grade it, get coaching, fire again. Perfect for 3-minute daily warmups.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { parseFeedbackSections } from "@/lib/stagecraft/feedbackParser";
import { renderSampleAnswer } from "@/lib/stagecraft/feedbackRenderers";
import type { Round } from "@/lib/stagecraft/types";
import { getSRClass, type SREvent, type SRInstance } from "@/lib/stagecraft/speechRecognition";

// ─── question bank ────────────────────────────────────────────────────────────

interface QBankItem {
  question: string;
  round: Round;
  category: string;
  hot?: boolean; // highest-risk — shown with warning colour
}

const QUESTION_BANK: QBankItem[] = [
  {
    question: "Tell me about yourself.",
    round: "hr",
    category: "Opening",
  },
  {
    question: "Why are you looking to move after 18 years at Datamatics?",
    round: "hiring-manager",
    category: "High Risk",
    hot: true,
  },
  {
    question: "Why Kohler? What draws you to this brand specifically?",
    round: "hiring-manager",
    category: "Brand Fit",
  },
  {
    question:
      "Tell me about your AI workflow — what did you actually build, and what changed because of it?",
    round: "hiring-manager",
    category: "AI Story",
  },
  {
    question: "Walk me through your biggest creative leadership challenge.",
    round: "hiring-manager",
    category: "Leadership",
  },
  {
    question:
      "How do you balance creative direction with business objectives when they conflict?",
    round: "leadership",
    category: "Executive",
  },
  {
    question:
      "What does a premium consumer brand like Kohler need from a Creative Director that a B2B brand doesn't?",
    round: "portfolio",
    category: "Hard",
    hot: true,
  },
  {
    question: "How would you describe your leadership style to your team?",
    round: "hr",
    category: "People",
  },
  {
    question:
      "What is your biggest professional weakness — and what are you doing about it?",
    round: "hr",
    category: "Vulnerability",
  },
  {
    question:
      "Describe a time you had to push back on a senior stakeholder's creative direction.",
    round: "hiring-manager",
    category: "Influence",
  },
  {
    question: "How do you keep a creative team motivated during a long, grinding project?",
    round: "hiring-manager",
    category: "People",
  },
  {
    question:
      "You're coming from 18 years at one company. How do we know you can adapt quickly?",
    round: "hiring-manager",
    category: "High Risk",
    hot: true,
  },
  {
    question: "How do you approach building a brand system from scratch?",
    round: "portfolio",
    category: "Craft",
  },
  {
    question: "What would your first 30 days look like in this role?",
    round: "leadership",
    category: "Strategic",
  },
  {
    question: "Tell me about a time a project failed. What happened?",
    round: "hiring-manager",
    category: "Resilience",
  },
  {
    question:
      "You've had 18 years of stability. Honestly — aren't you too comfortable to thrive in a high-pressure premium brand?",
    round: "stress",
    category: "Curveball",
    hot: true,
  },
  {
    question:
      "Convince me in 30 seconds that your B2B enterprise work translates to a design-led consumer brand. Go.",
    round: "stress",
    category: "Curveball",
    hot: true,
  },
  {
    question:
      "If we hired you and six months in the board asked 'what has the new Creative Director actually changed?' — what would the honest answer be?",
    round: "leadership",
    category: "Executive",
  },
  {
    question:
      "How do you measure the business impact of creative work to a CFO who thinks design is decoration?",
    round: "leadership",
    category: "Executive",
    hot: true,
  },
  {
    question:
      "Singapore — Marina Bay Sands runs gaming, hospitality, retail and events under one roof. How do you hold brand coherence across verticals that pull in different directions?",
    round: "portfolio",
    category: "Brand System",
  },
  {
    question:
      "Pidilite — Fevicol is a 60-year-old cultural icon. How do you modernise a brand like that without breaking the trust that built it?",
    round: "portfolio",
    category: "Brand Fit",
  },
  {
    question:
      "Your AI pipeline cut production from days to minutes. What did that do to the six people on your team — and how did you handle it?",
    round: "hiring-manager",
    category: "AI Story",
    hot: true,
  },
];


// ─── helpers ──────────────────────────────────────────────────────────────────

const TODAY_KEY = "sc_qf_date";
const COUNT_KEY = "sc_qf_count";

function getTodayCount(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toDateString();
  const saved = localStorage.getItem(TODAY_KEY);
  if (saved !== today) return 0;
  return parseInt(localStorage.getItem(COUNT_KEY) ?? "0", 10);
}

function bumpTodayCount() {
  const today = new Date().toDateString();
  localStorage.setItem(TODAY_KEY, today);
  const c = getTodayCount() + 1;
  localStorage.setItem(COUNT_KEY, String(c));
  return c;
}

function pickQuestion(exclude?: number): { item: QBankItem; idx: number } {
  // Bias toward hot questions (2× weight) then shuffle
  const weighted: number[] = [];
  QUESTION_BANK.forEach((q, i) => {
    if (i === exclude) return;
    weighted.push(i);
    if (q.hot) weighted.push(i); // double weight for hot
  });
  const idx = weighted[Math.floor(Math.random() * weighted.length)];
  return { item: QUESTION_BANK[idx], idx };
}

function wpm(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "0 words";
  const secs = Math.round((words / 130) * 60);
  if (secs < 60) return `${words} words · ~${secs}s spoken`;
  return `${words} words · ~${Math.round(secs / 60)}m spoken`;
}

// ─── score parsing ────────────────────────────────────────────────────────────

function parseScores(scoreLines: string): {
  content: number;
  english: number;
  delivery: number;
} | null {
  const contentMatch = scoreLines.match(/Content[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  const englishMatch = scoreLines.match(/English[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  const deliveryMatch = scoreLines.match(/Delivery[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  if (!contentMatch || !englishMatch || !deliveryMatch) return null;
  return {
    content: parseFloat(contentMatch[1]),
    english: parseFloat(englishMatch[1]),
    delivery: parseFloat(deliveryMatch[1]),
  };
}

// ─── score bar ────────────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const pct = Math.round((value / 10) * 100);
  const color =
    value >= 8
      ? "bg-sc-green"
      : value >= 6
        ? "bg-sc-gold"
        : "bg-sc-red";
  const textColor =
    value >= 8
      ? "text-sc-green"
      : value >= 6
        ? "text-sc-gold"
        : "text-sc-red";
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-sc-dim w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-sc-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-mono text-sm font-semibold w-8 text-right ${textColor}`}>
        {value}
      </span>
    </div>
  );
}

// ─── meta block parser (for session persistence) ─────────────────────────────
// Extracts patterns from the machine-readable [META]{...}[/META] footer.
// Used instead of the bracket-token approach so Quick Fire pattern data is
// consistent with the main session loop and the history/patterns dashboard.

const QF_META_RE = /\[META\](\{[\s\S]*?\})\[\/META\]/;

function extractMetaPatterns(raw: string): string[] {
  const m = raw.match(QF_META_RE);
  if (!m) return [];
  try {
    const p = JSON.parse(m[1]) as { patterns?: unknown };
    return Array.isArray(p.patterns) ? (p.patterns as string[]) : [];
  } catch {
    return [];
  }
}

// ─── session persistence helpers ──────────────────────────────────────────────

function newSessionId(): string {
  // Compact ID: qf-<base36 timestamp>-<4 random chars>
  return `qf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Fire-and-forget: create the daily Quick Fire session bucket on first answer.
async function ensureSession(
  id: string,
  created: { current: boolean },
): Promise<void> {
  if (created.current) return;
  created.current = true;
  await fetch("/api/stagecraft/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      id,
      config: {
        targetRole: "Creative Director — Kohler India",
        round: "mixed",
        questionCount: 0, // open-ended quick fire
        difficulty: "realistic",
        focus: null,
      },
    }),
  }).catch(() => {}); // never block the UI
}

// Append a Q&A item to the session — best-effort.
async function persistItem(
  sessionId: string,
  item: {
    index: number;
    round: string;
    question: string;
    answer: string;
    feedback: string;
    content: number;
    english: number;
    delivery: number;
    patterns: string[];
  },
): Promise<void> {
  await fetch("/api/stagecraft/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "appendItem",
      id: sessionId,
      item: {
        index: item.index,
        round: item.round,
        question: item.question,
        answer: item.answer,
        feedback: item.feedback,
        scores: {
          content: item.content,
          english: item.english,
          delivery: item.delivery,
        },
        patterns: item.patterns,
        createdAt: new Date().toISOString(),
      },
    }),
  }).catch(() => {}); // never block the UI
}

// ─── page ─────────────────────────────────────────────────────────────────────

type Stage = "ready" | "streaming" | "done";

export default function QuickFirePage() {
  const [stage, setStage] = useState<Stage>("ready");
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [todayCount, setTodayCount] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [openBlock, setOpenBlock] = useState<string | null>("sample");

  // Memorize state
  const [memorized, setMemorized] = useState(false);
  const [memorizing, setMemorizing] = useState(false);

  // Voice mode state
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SRInstance | null>(null);
  // Live recording timer — resets on each new recording
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (recording) {
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } else {
      if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    }
    return () => { if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; } };
  }, [recording]);

  // Session persistence — one session per page load, items appended per answer
  const sessionIdRef = useRef<string>(newSessionId());
  const sessionCreatedRef = useRef(false);
  const itemCountRef = useRef(0);

  // Running session score log — drives the in-session summary strip
  const [sessionItems, setSessionItems] = useState<{
    content: number;
    english: number;
    delivery: number;
    patterns: string[];
  }[]>([]);

  // Revision cycle state
  const [revising, setRevising] = useState(false);
  const [revisedAnswer, setRevisedAnswer] = useState("");
  const [revisedFeedback, setRevisedFeedback] = useState("");
  const [revisedStreaming, setRevisedStreaming] = useState(false);
  const [revisionDone, setRevisionDone] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const revisionRef = useRef<HTMLDivElement>(null);

  const current = QUESTION_BANK[currentIdx];

  // Restore today count from localStorage + randomise first question on mount
  useEffect(() => {
    setTodayCount(getTodayCount());
    setCurrentIdx(pickQuestion().idx);
    setSpeechSupported(getSRClass() !== null);
  }, []);

  // Auto-focus textarea when ready
  useEffect(() => {
    if (stage === "ready") {
      setTimeout(() => textareaRef.current?.focus(), 60);
    }
  }, [stage, currentIdx]);

  // Scroll to feedback when it arrives
  useEffect(() => {
    if (stage === "done" && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [stage]);

  // Scroll to revision section when it opens
  useEffect(() => {
    if (revising && revisionRef.current) {
      setTimeout(() => revisionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [revising]);

  // Stop recording when component unmounts or question changes
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleRecording = useCallback(() => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      setInterimTranscript("");
      return;
    }

    const SR = getSRClass();
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // optimised for Indian-English accent

    let finalText = answer; // capture current textarea value

    recognition.onresult = (event: SREvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Add space between segments unless finalText ends with one
          const seg = result[0].transcript;
          finalText = finalText
            ? finalText.trimEnd() + " " + seg.trimStart()
            : seg;
        } else {
          interim = result[0].transcript;
        }
      }
      setAnswer(finalText);
      setInterimTranscript(interim);
    };

    recognition.onerror = () => {
      setRecording(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setRecording(false);
      setInterimTranscript("");
    };

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }, [recording, answer]);

  const submit = useCallback(async () => {
    if (!answer.trim()) return;
    setStage("streaming");
    setFeedback("");
    const newCount = bumpTodayCount();
    setTodayCount(newCount);

    try {
      // Record practice day for streak tracking (streak logic lives in main page,
      // but we bump the same localStorage keys so the home page picks it up)
      (() => {
        const today = new Date().toDateString();
        const raw = localStorage.getItem("sc_streak_dates");
        const dates: string[] = raw ? (JSON.parse(raw) as string[]) : [];
        if (!dates.includes(today)) {
          dates.push(today);
          localStorage.setItem("sc_streak_dates", JSON.stringify(dates.slice(-60)));
        }
      })();

      const res = await fetch("/api/stagecraft/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: current.question,
          answer: answer.trim(),
          round: current.round,
          questionIndex: 1,
          totalQuestions: 1,
          difficulty: "realistic",
        }),
      });

      if (!res.ok || !res.body) {
        setFeedback("[Grade error — please try again.]");
        setStage("done");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setFeedback(accumulated);
      }

      setStage("done");
      setOpenBlock("sample");

      // Persist to session history (fire-and-forget — never blocks the UI)
      const parsedSections = parseFeedbackSections(accumulated);
      const parsedScores = parsedSections
        ? parseScores(parsedSections.scoreLines)
        : null;
      if (parsedScores) {
        const idx = ++itemCountRef.current;
        // Use META block patterns (concise tags) to match main session loop,
        // ensuring the patterns dashboard aggregates consistently.
        const metaPatterns = extractMetaPatterns(accumulated);
        void ensureSession(sessionIdRef.current, sessionCreatedRef).then(() =>
          persistItem(sessionIdRef.current, {
            index: idx,
            round: current.round,
            question: current.question,
            answer: answer.trim(),
            feedback: accumulated,
            content: parsedScores.content,
            english: parsedScores.english,
            delivery: parsedScores.delivery,
            patterns: metaPatterns,
          }),
        );
        // Update running session log for the in-session score strip
        setSessionItems((prev) => [
          ...prev,
          {
            content: parsedScores.content,
            english: parsedScores.english,
            delivery: parsedScores.delivery,
            patterns: metaPatterns,
          },
        ]);
      }
    } catch (err) {
      setFeedback(`[Error: ${String(err)}]`);
      setStage("done");
    }
  }, [answer, current]);

  const submitRevision = useCallback(async () => {
    if (!revisedAnswer.trim()) return;
    setRevisedStreaming(true);
    setRevisedFeedback("");
    try {
      const res = await fetch("/api/stagecraft/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: current.question,
          answer: revisedAnswer.trim(),
          round: current.round,
          questionIndex: 1,
          totalQuestions: 1,
          difficulty: "realistic",
        }),
      });
      if (!res.ok || !res.body) {
        setRevisedFeedback("[Grade error — please try again.]");
        setRevisedStreaming(false);
        setRevisionDone(true);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setRevisedFeedback(accumulated);
      }
      setRevisedStreaming(false);
      setRevisionDone(true);
    } catch (err) {
      setRevisedFeedback(`[Error: ${String(err)}]`);
      setRevisedStreaming(false);
      setRevisionDone(true);
    }
  }, [revisedAnswer, current]);

  const memorize = useCallback(async (sampleAnswer: string) => {
    if (memorized || memorizing) return;
    setMemorizing(true);
    try {
      await fetch("/api/stagecraft/memorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          question: current.question,
          answer: sampleAnswer,
          sourceSessionId: "quickfire",
          sourceQuestionIndex: currentIdx,
        }),
      });
      setMemorized(true);
    } catch {
      // silent — memorize is best-effort
    } finally {
      setMemorizing(false);
    }
  }, [memorized, memorizing, current.question, currentIdx]);

  const fireAnother = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
    setInterimTranscript("");
    const { idx } = pickQuestion(currentIdx);
    setCurrentIdx(idx);
    setAnswer("");
    setFeedback("");
    setStage("ready");
    setOpenBlock("sample");
    setRevising(false);
    setRevisedAnswer("");
    setRevisedFeedback("");
    setRevisedStreaming(false);
    setRevisionDone(false);
    setMemorized(false);
    setMemorizing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIdx]);

  const sections = parseFeedbackSections(feedback);
  const scores = sections ? parseScores(sections.scoreLines) : null;

  const revisedSections = parseFeedbackSections(revisedFeedback);
  const revisedScores = revisedSections ? parseScores(revisedSections.scoreLines) : null;

  const streamingComplete = stage === "done" || stage === "streaming";

  // Composite score for action-row logic
  const composite = scores
    ? +(scores.content * 0.4 + scores.english * 0.3 + scores.delivery * 0.3).toFixed(1)
    : null;
  const isHighScore = composite !== null && composite >= 7.5;

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      <StagecraftHeader label="Quick Fire">
        {todayCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-sc-dim">Today:</span>
            <span className="font-mono text-xs font-semibold text-sc-gold">
              {todayCount} fired
            </span>
          </div>
        )}
      </StagecraftHeader>

      {/* Session score strip — appears after 2+ answered questions */}
      {sessionItems.length >= 2 && (
        <QuickFireSessionStrip items={sessionItems} />
      )}

      <main className="mx-auto max-w-xl px-6 py-10 space-y-8">

        {/* Question card */}
        <div className="sc-entry sc-e1">
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${
                current.hot
                  ? "border border-sc-red/40 bg-sc-red/10 text-sc-red"
                  : "border border-sc-border bg-sc-surface text-sc-dim"
              }`}
            >
              {current.category}
            </span>
          </div>

          <p className="font-display text-2xl font-semibold text-sc-ink leading-snug tracking-tight">
            &ldquo;{current.question}&rdquo;
          </p>
        </div>

        {/* Answer area */}
        <div className="sc-entry sc-e2 space-y-3">
          {/* Label row + voice toggle */}
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs tracking-widest text-sc-muted uppercase">
              Your answer
            </label>
            {speechSupported && stage === "ready" && (
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[10px] tracking-wide transition-all ${
                  recording
                    ? "border-sc-red/40 bg-sc-red/10 text-sc-red"
                    : "border-sc-border bg-sc-surface text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold"
                }`}
              >
                {recording ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sc-red animate-pulse" />
                    Stop
                  </>
                ) : (
                  <>
                    <span className="text-[11px]">🎙</span>
                    Speak
                  </>
                )}
              </button>
            )}
          </div>

          {/* Textarea — border turns red while recording */}
          <textarea
            ref={textareaRef}
            rows={6}
            disabled={streamingComplete}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && answer.trim()) {
                submit();
              }
            }}
            placeholder={
              stage === "ready"
                ? recording
                  ? "Listening — speak naturally, tap Stop when done…"
                  : "Type your answer — or tap Speak above — aim for 60–90 words…"
                : ""
            }
            className={`w-full rounded-sm border px-4 py-3 text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none transition-colors resize-none disabled:opacity-50 bg-sc-surface ${
              recording
                ? "border-sc-red/50 focus:border-sc-red/70"
                : "border-sc-border focus:border-sc-gold-dim"
            }`}
          />

          {/* Interim transcript — shown below textarea while speaking */}
          {interimTranscript && (
            <p className="font-mono text-[11px] text-sc-muted/60 italic leading-relaxed px-1">
              …{interimTranscript}
            </p>
          )}

          {/* Word count + speaking timer */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-sc-dim">
              {answer.trim() ? wpm(answer) : recording ? "Listening…" : "0 words"}
            </span>
            {recording ? (
              <span className={`font-mono text-xs tabular-nums ${
                recSeconds >= 90 ? "text-sc-red" : recSeconds >= 60 ? "text-sc-gold" : "text-sc-green"
              }`}>
                {`${Math.floor(recSeconds / 60)}:${String(recSeconds % 60).padStart(2, "0")}`}
                {recSeconds >= 90 && " — too long"}
                {recSeconds >= 60 && recSeconds < 90 && " — closing"}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-sc-dim/60">⌘↵ to submit</span>
            )}
          </div>

          {/* Quality signals */}
          {answer.trim().split(/\s+/).filter(Boolean).length >= 10 && stage === "ready" && (
            <div className="flex flex-wrap gap-2">
              {[
                {
                  ok: /\bI\b|\bmy\b/i.test(answer),
                  label: "Ownership",
                  tip: "Uses 'I' / 'my'",
                },
                {
                  ok: /\d+/.test(answer),
                  label: "Number",
                  tip: "Includes a number",
                },
                {
                  ok: !/^\s*(So|Well|Um|Uh|Actually|Basically)\b/i.test(answer),
                  label: "Strong open",
                  tip: "Doesn't start with filler",
                },
                {
                  ok:
                    answer.trim().split(/\s+/).filter(Boolean).length >= 40 &&
                    answer.trim().split(/\s+/).filter(Boolean).length <= 110,
                  label: "Length",
                  tip: "40–110 words",
                },
              ].map(({ ok, label }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[10px] ${
                    ok
                      ? "border border-sc-green/30 bg-sc-green-bg text-sc-green"
                      : "border border-sc-border bg-sc-surface text-sc-dim"
                  }`}
                >
                  {ok ? "✓" : "·"} {label}
                </span>
              ))}
            </div>
          )}

          {stage === "ready" && (
            <button
              type="button"
              disabled={!answer.trim()}
              onClick={submit}
              className="w-full rounded-sm bg-sc-gold py-3 text-sm font-semibold text-sc-void transition-all hover:brightness-110 disabled:opacity-30"
            >
              Grade my answer →
            </button>
          )}

          {stage === "streaming" && (
            <div className="flex items-center gap-2 py-3">
              <span className="inline-block w-2 h-2 rounded-full bg-sc-gold animate-pulse" />
              <span className="font-mono text-xs text-sc-dim">
                Grading…
              </span>
            </div>
          )}
        </div>

        {/* Streaming / feedback */}
        {feedback && (
          <div ref={feedbackRef} className="sc-entry sc-e3 space-y-3">
            {/* Scores */}
            {scores && (
              <div className="rounded-sm border border-sc-border bg-sc-surface px-5 py-4 space-y-3">
                <ScoreBar label="Content" value={scores.content} />
                <ScoreBar label="English" value={scores.english} />
                <ScoreBar label="Delivery" value={scores.delivery} />
                <div className="pt-1 border-t border-sc-border">
                  <ScoreBar
                    label="Overall"
                    value={parseFloat(
                      (
                        scores.content * 0.4 +
                        scores.english * 0.3 +
                        scores.delivery * 0.3
                      ).toFixed(1)
                    )}
                  />
                </div>
              </div>
            )}

            {/* Collapsible coaching blocks */}
            {sections ? (
              <div className="space-y-2">
                {(
                  [
                    { key: "sample", label: "Sample answer", content: sections.sampleAnswer },
                    { key: "grammar", label: "Grammar fix", content: sections.grammarFix },
                    { key: "delivery", label: "Delivery tip", content: sections.deliveryTip },
                  ] as { key: string; label: string; content: string }[]
                ).map(({ key, label, content }) => (
                  <div
                    key={key}
                    className="rounded-sm border border-sc-border bg-sc-surface overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenBlock(openBlock === key ? null : key)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
                        {label}
                      </span>
                      <span className="font-mono text-xs text-sc-dim">
                        {openBlock === key ? "−" : "+"}
                      </span>
                    </button>
                    {openBlock === key && (
                      <div className="px-4 pb-4 text-sm text-sc-ink leading-relaxed border-t border-sc-border pt-3">
                        {content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Raw streaming text while sections not yet parseable */
              <div className="rounded-sm border border-sc-border bg-sc-surface px-4 py-4 text-sm text-sc-muted leading-relaxed whitespace-pre-wrap font-mono">
                {feedback}
              </div>
            )}

            {/* Pattern tags — grammar flags found this answer */}
            {sections && sections.patternTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sections.patternTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-sm border border-sc-red/25 bg-sc-red/[0.04] px-2 py-0.5 font-mono text-[10px] text-sc-red"
                  >
                    <span>●</span>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            {stage === "done" && !revisionDone && (
              <div className="space-y-2 pt-2">
                {/* High score (≥7.5): primary action is "Fire another" */}
                {isHighScore && !revising && (
                  <button
                    type="button"
                    onClick={fireAnother}
                    className="w-full rounded-sm bg-sc-gold py-3 text-sm font-semibold text-sc-void transition-all hover:brightness-110"
                  >
                    {composite !== null && composite >= 9
                      ? "Excellent — fire another →"
                      : "Good answer — fire another →"}
                  </button>
                )}

                {/* Low score (<7.5): primary action is "Improve" */}
                {!isHighScore && !revising && (
                  <button
                    type="button"
                    onClick={() => {
                      setRevisedAnswer(answer);
                      setRevising(true);
                    }}
                    className="w-full rounded-sm border border-sc-gold-dim bg-sc-gold-bg py-3 text-sm font-semibold text-sc-gold transition-all hover:bg-sc-gold/20"
                  >
                    Improve this answer →
                  </button>
                )}

                {/* Secondary row */}
                <div className="flex items-center gap-2">
                  {sections?.sampleAnswer && (
                    <button
                      type="button"
                      onClick={() => memorize(sections.sampleAnswer)}
                      disabled={memorized || memorizing}
                      className={`flex items-center gap-1.5 rounded-sm border px-3 py-2.5 text-xs font-mono transition-all ${
                        memorized
                          ? "border-sc-green/30 bg-sc-green-bg text-sc-green"
                          : "border-sc-border bg-sc-surface text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold"
                      } disabled:cursor-default`}
                    >
                      <span>{memorized ? "✓" : "♥"}</span>
                      <span>{memorized ? "Memorized" : "Memorize"}</span>
                    </button>
                  )}
                  {/* Show "Fire another" as secondary when score is low (primary is "Improve") */}
                  {!isHighScore && !revising && (
                    <button
                      type="button"
                      onClick={fireAnother}
                      className="flex-1 rounded-sm border border-sc-border bg-sc-surface px-3 py-2.5 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
                    >
                      Skip →
                    </button>
                  )}
                  {/* Show "Improve" as secondary when score is high (primary is "Fire another") */}
                  {isHighScore && !revising && (
                    <button
                      type="button"
                      onClick={() => {
                        setRevisedAnswer(answer);
                        setRevising(true);
                      }}
                      className="flex-1 rounded-sm border border-sc-border bg-sc-surface px-3 py-2.5 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
                    >
                      Improve anyway
                    </button>
                  )}
                  <Link
                    href="/stagecraft"
                    className="rounded-sm border border-sc-border bg-sc-surface px-3 py-2.5 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
                  >
                    Done
                  </Link>
                </div>
              </div>
            )}

            {/* Post-revision actions */}
            {revisionDone && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={fireAnother}
                  className="flex-1 rounded-sm bg-sc-gold py-3 text-sm font-semibold text-sc-void transition-all hover:brightness-110"
                >
                  Fire another →
                </button>
                <Link
                  href="/stagecraft"
                  className="rounded-sm border border-sc-border bg-sc-surface px-4 py-3 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
                >
                  Done
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Revision section */}
        {revising && (
          <div ref={revisionRef} className="sc-entry sc-e4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-sc-border" />
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase px-3">
                Revise your answer
              </span>
              <div className="flex-1 h-px bg-sc-border" />
            </div>

            <p className="text-xs text-sc-muted leading-relaxed">
              You&apos;ve seen the grammar fix and sample. Now rewrite your answer
              incorporating what you learned. Aim to fix the biggest issue first.
            </p>

            <textarea
              rows={7}
              disabled={revisedStreaming || revisionDone}
              value={revisedAnswer}
              onChange={(e) => setRevisedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && revisedAnswer.trim()) {
                  submitRevision();
                }
              }}
              className="w-full rounded-sm border border-sc-gold-dim bg-sc-surface px-4 py-3 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold focus:outline-none transition-colors resize-none disabled:opacity-50"
            />

            {/* Word count */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-sc-dim">
                {revisedAnswer.trim()
                  ? wpm(revisedAnswer)
                  : "0 words"}
              </span>
              <span className="font-mono text-[10px] text-sc-dim/60">⌘↵ to re-grade</span>
            </div>

            {!revisedStreaming && !revisionDone && (
              <button
                type="button"
                disabled={!revisedAnswer.trim()}
                onClick={submitRevision}
                className="w-full rounded-sm border border-sc-gold-dim bg-sc-gold-bg py-3 text-sm font-semibold text-sc-gold transition-all hover:bg-sc-gold/20 disabled:opacity-30"
              >
                Re-grade →
              </button>
            )}

            {revisedStreaming && (
              <div className="flex items-center gap-2 py-2">
                <span className="inline-block w-2 h-2 rounded-full bg-sc-gold animate-pulse" />
                <span className="font-mono text-xs text-sc-dim">Re-grading…</span>
              </div>
            )}

            {/* Score comparison */}
            {revisionDone && scores && revisedScores && (
              <div className="rounded-sm border border-sc-border bg-sc-surface px-5 py-4 space-y-3">
                <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1">
                  Score comparison
                </p>
                {(
                  [
                    { label: "Content", orig: scores.content, rev: revisedScores.content },
                    { label: "English", orig: scores.english, rev: revisedScores.english },
                    { label: "Delivery", orig: scores.delivery, rev: revisedScores.delivery },
                  ] as const
                ).map(({ label, orig, rev }) => {
                  const delta = +(rev - orig).toFixed(1);
                  const deltaColor =
                    delta > 0 ? "text-sc-green" : delta < 0 ? "text-sc-red" : "text-sc-dim";
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-sc-dim w-16 shrink-0">{label}</span>
                      <span className="font-mono text-sm text-sc-dim tabular-nums">{orig}</span>
                      <span className="font-mono text-xs text-sc-dim">→</span>
                      <span className="font-mono text-sm font-semibold text-sc-ink tabular-nums">{rev}</span>
                      {delta !== 0 && (
                        <span className={`font-mono text-xs font-semibold ${deltaColor}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* Overall delta */}
                {(() => {
                  const origOverall = +(scores.content * 0.4 + scores.english * 0.3 + scores.delivery * 0.3).toFixed(1);
                  const revOverall = +(revisedScores.content * 0.4 + revisedScores.english * 0.3 + revisedScores.delivery * 0.3).toFixed(1);
                  const delta = +(revOverall - origOverall).toFixed(1);
                  const deltaColor = delta > 0 ? "text-sc-green" : delta < 0 ? "text-sc-red" : "text-sc-dim";
                  const message =
                    delta >= 1.5
                      ? "Strong improvement."
                      : delta >= 0.5
                        ? "Getting there."
                        : delta > 0
                          ? "Slight gain."
                          : delta === 0
                            ? "Same score — study the grammar fix more carefully."
                            : "Score dropped — compare your answers carefully.";
                  return (
                    <div className="pt-2 border-t border-sc-border space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-sc-dim w-16 shrink-0">Overall</span>
                        <span className="font-mono text-sm text-sc-dim tabular-nums">{origOverall}</span>
                        <span className="font-mono text-xs text-sc-dim">→</span>
                        <span className={`font-mono text-sm font-semibold tabular-nums ${delta > 0 ? "text-sc-green" : delta < 0 ? "text-sc-red" : "text-sc-ink"}`}>{revOverall}</span>
                        {delta !== 0 && (
                          <span className={`font-mono text-xs font-semibold ${deltaColor}`}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-sc-muted pl-[4.75rem]">{message}</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Revised coaching — sample answer only */}
            {revisionDone && revisedSections && (
              <div className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-4">
                <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase mb-2">
                  Revised sample answer
                </p>
                <p className="text-sm text-sc-ink leading-relaxed">
                  {renderSampleAnswer(revisedSections.sampleAnswer)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty submit state CTA */}
        {stage === "ready" && !feedback && (
          <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase text-center sc-entry sc-e4">
            {QUESTION_BANK.length} questions in the pool · weighted toward high-risk
          </p>
        )}
      </main>
    </div>
  );
}

// ─── Quick Fire session score strip ──────────────────────────────────────────
// Shown below the header once 2+ questions have been answered in this page load.
// Gives a live running average + recurring grammar flags so John sees his
// trajectory without leaving the page.

function QuickFireSessionStrip(props: {
  items: { content: number; english: number; delivery: number; patterns: string[] }[];
}) {
  const { items } = props;
  const n = items.length;

  // Running averages
  const avg = items.reduce(
    (acc, it) => {
      acc.content += it.content;
      acc.english += it.english;
      acc.delivery += it.delivery;
      return acc;
    },
    { content: 0, english: 0, delivery: 0 },
  );
  const avgContent = +(avg.content / n).toFixed(1);
  const avgEnglish = +(avg.english / n).toFixed(1);
  const avgDelivery = +(avg.delivery / n).toFixed(1);
  const composite = +(avgContent * 0.4 + avgEnglish * 0.3 + avgDelivery * 0.3).toFixed(1);

  // Recurring patterns (appearing ≥2 times across answered questions)
  const patternMap = new Map<string, number>();
  for (const it of items) {
    for (const p of it.patterns) {
      patternMap.set(p, (patternMap.get(p) ?? 0) + 1);
    }
  }
  const recurringPatterns = Array.from(patternMap.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  function colorForScore(v: number) {
    if (v >= 8) return "text-sc-green";
    if (v >= 5) return "text-sc-gold";
    return "text-sc-red";
  }

  return (
    <div className="border-b border-sc-border bg-sc-raised px-6 py-3">
      <div className="max-w-xl mx-auto flex items-center gap-6 flex-wrap">
        {/* Session label */}
        <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase shrink-0">
          This session · {n}Q
        </span>

        {/* Score pills */}
        <div className="flex items-center gap-4">
          {(
            [
              { label: "C", value: avgContent, title: "Content" },
              { label: "E", value: avgEnglish, title: "English" },
              { label: "D", value: avgDelivery, title: "Delivery" },
            ] as const
          ).map(({ label, value, title }) => (
            <span key={label} className="flex items-baseline gap-1" title={title}>
              <span className="font-mono text-[10px] text-sc-dim">{label}</span>
              <span className={`font-mono text-sm font-semibold tabular-nums ${colorForScore(value)}`}>
                {value}
              </span>
            </span>
          ))}
          {/* Composite */}
          <span className="flex items-baseline gap-1 border-l border-sc-border pl-4" title="Composite">
            <span className="font-mono text-[10px] text-sc-dim">avg</span>
            <span className={`font-mono text-sm font-semibold tabular-nums ${colorForScore(composite)}`}>
              {composite}
            </span>
          </span>
        </div>

        {/* Recurring patterns */}
        {recurringPatterns.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="font-mono text-[10px] text-sc-dim uppercase tracking-wider shrink-0">Recurring:</span>
            <div className="flex flex-wrap gap-1.5">
              {recurringPatterns.map(([tag, count]) => (
                <span
                  key={tag}
                  className="rounded-sm border border-sc-red/30 bg-sc-red/10 px-2 py-0.5 font-mono text-[10px] text-sc-red"
                  title={`Flagged ${count}× this session`}
                >
                  [{tag}] ×{count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
