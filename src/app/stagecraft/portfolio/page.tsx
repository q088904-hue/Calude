"use client";

// Stagecraft — Portfolio Defence Mode.
// Brief a real portfolio piece → AI generates 3 escalating critique questions
// specific to that work → defend each one → get scored on creative rationale,
// business framing, and composure under critique.
//
// State machine: brief → generating → defending(0/1/2) → done

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  parseFeedbackSections,
  type FeedbackSections,
} from "@/lib/stagecraft/feedbackParser";
import { renderSampleAnswer } from "@/lib/stagecraft/feedbackRenderers";
import { getSRClass, type SREvent, type SRInstance } from "@/lib/stagecraft/speechRecognition";

// ── Types ─────────────────────────────────────────────────────────────────────

type CriticPersona = "kohler-cd" | "cmo" | "cfos";

type PageStage =
  | "brief"
  | "generating"
  | { type: "defending"; challengeIndex: number }
  | "done";

interface ChallengeResult {
  challenge: string;
  answer: string;
  feedback: string;
  content: number;
  english: number;
  delivery: number;
  sections: FeedbackSections | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CRITIC_OPTIONS: { value: CriticPersona; label: string; sublabel: string }[] = [
  {
    value: "kohler-cd",
    label: "Kohler Design Lead",
    sublabel: "Probes craft, restraint & taste-level thinking",
  },
  {
    value: "cmo",
    label: "CMO / VP Marketing",
    sublabel: "Presses on brand impact, audience insight, metrics",
  },
  {
    value: "cfos",
    label: "Skeptical CFO",
    sublabel: "Forensic on cost-to-impact, ROI, timeline",
  },
];

const PORTFOLIO_PROMPT_IDEAS = [
  "e.g. A brand identity system I designed for a global logistics firm — 200+ touchpoints unified under a single visual language. The brief called for authority without aggression. I moved the brand from a generic blue-and-grey palette to a bold amber system anchored by a custom logotype.",
  "e.g. A motion campaign for a healthcare product launch across India and the UAE. Six hero films produced in 11 days. I replaced a traditional shoot with an AI-driven pipeline (HeyGen + ElevenLabs + After Effects) and cut production cost by 40%.",
  "e.g. A digital experience design for a luxury hospitality brand's app rebrand — restructured the IA, redesigned 40 screens, and aligned the visual language to a resort aesthetic. Delivered in 8 weeks with a team of two.",
];

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
      };
      return {
        content: Number(p.content) || 0,
        english: Number(p.english) || 0,
        delivery: Number(p.delivery) || 0,
      };
    } catch { /* fall through */ }
  }
  const grab = (label: string) =>
    Number(text.match(new RegExp(`${label}\\s*:\\s*(\\d+)\\s*\\/\\s*10`, "i"))?.[1] ?? 0);
  return {
    content: grab("Content"),
    english: grab("English"),
    delivery: grab("Delivery"),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreChip({ label, value }: { label: string; value: number }) {
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
      <span className="opacity-50 text-[10px] uppercase tracking-wider">{label}</span>
      <span className="font-bold tabular-nums">{value}/10</span>
    </span>
  );
}

function ChallengeResultCard({
  result,
  n,
}: {
  result: ChallengeResult;
  n: number;
}) {
  const [open, setOpen] = useState(false);
  const composite = +((result.content + result.english + result.delivery) / 3).toFixed(1);
  const compositeColor =
    composite >= 8 ? "text-sc-green" : composite >= 6 ? "text-sc-gold" : "text-sc-red";
  const difficultyLabel = n === 1 ? "Opening probe" : n === 2 ? "Pressure test" : "Hardest challenge";

  return (
    <div className="rounded-sm border border-sc-border bg-sc-surface overflow-hidden">
      <div className="px-4 py-4 space-y-3">
        {/* Challenge header */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <span className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
              {difficultyLabel}
            </span>
          </div>
          <span className={`font-display text-lg font-semibold ${compositeColor} shrink-0 tabular-nums ml-auto`}>
            {composite}
          </span>
        </div>

        <p className="text-sm font-medium text-sc-ink leading-snug border-l-2 border-sc-gold-dim pl-3">
          {result.challenge}
        </p>

        {/* Scores */}
        <div className="flex flex-wrap gap-1.5">
          <ScoreChip label="Rationale" value={result.content} />
          <ScoreChip label="Clarity" value={result.english} />
          <ScoreChip label="Confidence" value={result.delivery} />
        </div>

        {/* What you said */}
        <div>
          <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1.5">
            Your defence
          </p>
          <p className="text-sm text-sc-muted leading-relaxed">{result.answer}</p>
        </div>

        {/* Better answer — always visible */}
        {result.sections?.sampleAnswer && (
          <div>
            <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase mb-1.5">
              Stronger defence
            </p>
            <p className="text-sm text-sc-ink leading-relaxed">
              {renderSampleAnswer(result.sections.sampleAnswer)}
            </p>
          </div>
        )}
      </div>

      {/* Expandable coaching detail */}
      {result.sections && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full border-t border-sc-line px-4 py-2.5 flex items-center justify-between font-mono text-xs text-sc-dim hover:text-sc-ink hover:bg-sc-raised transition-colors"
          >
            <span>{open ? "Hide" : "Show"} coaching detail</span>
            <span>{open ? "▲" : "▼"}</span>
          </button>
          {open && (
            <div className="border-t border-sc-line px-4 py-4 space-y-4 bg-sc-raised">
              {result.sections.grammarFix && (
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-2">
                    Language fix
                  </p>
                  <p className="text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">
                    {result.sections.grammarFix}
                  </p>
                </div>
              )}
              {result.sections.deliveryTip && (
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1.5">
                    Delivery tip
                  </p>
                  <p className="text-sm text-sc-muted leading-relaxed">
                    {result.sections.deliveryTip}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PortfolioDefencePage() {
  const [stage, setStage] = useState<PageStage>("brief");
  const [description, setDescription] = useState("");
  const [criticPersona, setCriticPersona] = useState<CriticPersona>("kohler-cd");
  const [challenges, setChallenges] = useState<string[]>([]);
  const [generatingError, setGeneratingError] = useState<string | null>(null);
  const [promptIdx, setPromptIdx] = useState(0);

  // Per-challenge state
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [results, setResults] = useState<ChallengeResult[]>([]);
  const [gradingFeedback, setGradingFeedback] = useState("");
  const [isGrading, setIsGrading] = useState(false);

  // Voice recording (Whisper)
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recState, setRecState] = useState<"idle" | "recording" | "uploading" | "transcribed">("idle");
  const [recError, setRecError] = useState<string | null>(null);

  // Web Speech API (instant)
  const srRef = useRef<SRInstance | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [browserRecording, setBrowserRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [srSeconds, setSrSeconds] = useState(0);
  const srTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSpeechSupported(getSRClass() !== null);
    return () => { srRef.current?.stop(); };
  }, []);

  // Live timer during browser voice recording
  useEffect(() => {
    if (browserRecording) {
      setSrSeconds(0);
      srTimerRef.current = setInterval(() => setSrSeconds((s) => s + 1), 1000);
    } else {
      if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; }
    }
    return () => { if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; } };
  }, [browserRecording]);

  // ── Voice helpers ────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setRecError(null);
    setCurrentAnswer("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecState("uploading");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, "answer.webm");
        try {
          const res = await fetch("/api/stagecraft/transcribe", {
            method: "POST",
            body: fd,
          });
          const j = (await res.json()) as { text?: string; error?: string };
          if (j.text) {
            setCurrentAnswer(j.text);
            setRecState("transcribed");
          } else {
            setRecError(j.error ?? "Transcription failed.");
            setRecState("idle");
          }
        } catch (err) {
          setRecError(String(err));
          setRecState("idle");
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecState("recording");
    } catch (err) {
      setRecError(String(err));
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
  }, []);

  const toggleBrowserVoice = useCallback(() => {
    const SR = getSRClass();
    if (!SR) return;
    if (browserRecording) {
      srRef.current?.stop();
      return;
    }
    setCurrentAnswer("");
    setInterimText("");
    setRecError(null);
    const sr = new SR();
    sr.continuous = true;
    sr.interimResults = true;
    sr.lang = "en-IN";
    let final = "";
    sr.onresult = (e: SREvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final = final ? final.trimEnd() + " " + seg.trimStart() : seg;
          setCurrentAnswer(final);
          setInterimText("");
        } else {
          setInterimText(seg);
        }
      }
    };
    sr.onerror = () => { setBrowserRecording(false); setInterimText(""); };
    sr.onend = () => { setBrowserRecording(false); setInterimText(""); };
    sr.start();
    srRef.current = sr;
    setBrowserRecording(true);
  }, [browserRecording]);

  // ── Challenge generation ─────────────────────────────────────────────────

  const generateChallenges = useCallback(async () => {
    if (!description.trim()) return;
    setGeneratingError(null);
    setStage("generating");

    try {
      const res = await fetch("/api/stagecraft/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioDescription: description, criticPersona }),
      });

      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }

      const j = (await res.json()) as { challenges: string[] };
      if (!Array.isArray(j.challenges) || j.challenges.length < 3) {
        throw new Error("Invalid challenge response.");
      }

      setChallenges(j.challenges);
      setResults([]);
      setCurrentAnswer("");
      setStage({ type: "defending", challengeIndex: 0 });
    } catch (err) {
      setGeneratingError(String(err));
      setStage("brief");
    }
  }, [description, criticPersona]);

  // ── Answer submission ────────────────────────────────────────────────────

  const submitAnswer = useCallback(async () => {
    const idx = typeof stage === "object" && stage.type === "defending"
      ? stage.challengeIndex
      : -1;
    if (idx < 0 || idx >= challenges.length) return;
    if (!currentAnswer.trim()) return;

    setIsGrading(true);
    setGradingFeedback("");

    const challenge = challenges[idx];
    const targetContext = `PORTFOLIO DEFENCE CONTEXT:
The candidate is defending a specific portfolio piece.

PIECE DESCRIPTION:
${description.trim()}

CRITIC PERSONA: ${CRITIC_OPTIONS.find((c) => c.value === criticPersona)?.label ?? criticPersona}

CHALLENGE BEING ANSWERED:
"${challenge}"

In your evaluation:
- "Content" means: quality of creative rationale, specificity of thinking, business framing.
- "English" means: clarity, grammar, sentence structure — same rules as always.
- "Delivery" means: confidence, ownership language, structure, not over-hedging.
- "Better response" (sample answer) must defend THIS specific piece, using only the details the candidate described.
- Be tough: a candidate who can't defend their own work clearly is not ready for a Kohler creative interview.`;

    try {
      const res = await fetch("/api/stagecraft/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: challenge,
          answer: currentAnswer,
          round: "portfolio",
          questionIndex: idx + 1,
          totalQuestions: challenges.length,
          difficulty: "realistic",
          targetContext,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setGradingFeedback(acc);
      }

      const scores = parseMeta(acc);
      const sections = parseFeedbackSections(acc);

      const result: ChallengeResult = {
        challenge,
        answer: currentAnswer,
        feedback: acc,
        ...scores,
        sections,
      };

      const newResults = [...results, result];
      setResults(newResults);

      if (idx + 1 < challenges.length) {
        setStage({ type: "defending", challengeIndex: idx + 1 });
        setCurrentAnswer("");
        setGradingFeedback("");
        setRecState("idle");
        srRef.current?.stop();
        setBrowserRecording(false);
        setInterimText("");
      } else {
        setStage("done");
        setGradingFeedback("");
      }
    } catch (err) {
      setGradingFeedback(`[error: ${String(err)}]`);
    } finally {
      setIsGrading(false);
    }
  }, [stage, challenges, currentAnswer, description, criticPersona, results]);

  // ── Derived state ────────────────────────────────────────────────────────

  const currentIndex =
    typeof stage === "object" && stage.type === "defending"
      ? stage.challengeIndex
      : -1;

  const activeCritic = CRITIC_OPTIONS.find((c) => c.value === criticPersona)!;

  const avgComposite =
    results.length > 0
      ? +(
          results.reduce(
            (a, r) => a + (r.content + r.english + r.delivery) / 3,
            0,
          ) / results.length
        ).toFixed(1)
      : null;

  // ── Render ────────────────────────────────────────────────────────────────

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
            Portfolio Defence
          </span>
        </div>

        {/* Progress dots / avg score */}
        <div className="flex items-center gap-2">
          {(typeof stage === "object" || stage === "done") &&
            challenges.length === 3 && (
              <div className="flex items-center gap-1.5">
                {challenges.map((_, i) => {
                  const done = results[i];
                  const isActive = currentIndex === i;
                  const composite = done
                    ? +((done.content + done.english + done.delivery) / 3).toFixed(1)
                    : null;
                  return (
                    <span
                      key={i}
                      title={done ? `Challenge ${i + 1}: ${composite}` : undefined}
                      className={`w-2 h-2 rounded-full transition-all ${
                        done
                          ? composite! >= 8
                            ? "bg-sc-green"
                            : composite! >= 6
                              ? "bg-sc-gold"
                              : "bg-sc-red"
                          : isActive
                            ? "bg-sc-gold animate-pulse"
                            : "bg-sc-border"
                      }`}
                    />
                  );
                })}
              </div>
            )}
          {avgComposite !== null && (
            <span
              className={`font-display text-xl font-semibold tabular-nums ${
                avgComposite >= 8
                  ? "text-sc-green"
                  : avgComposite >= 6
                    ? "text-sc-gold"
                    : "text-sc-red"
              }`}
            >
              {avgComposite}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* ── Brief stage ── */}
        {stage === "brief" && (
          <>
            <div>
              <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
                Portfolio defence
              </p>
              <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
                Brief your piece.
              </h1>
              <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
                Describe a real piece of work — brand system, campaign, product
                launch, motion project. The coach will generate three specific
                critique questions from the perspective of the critic you choose.
                Defend each one.
              </p>
            </div>

            {/* Portfolio description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                  Describe the piece
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setPromptIdx((i) => (i + 1) % PORTFOLIO_PROMPT_IDEAS.length)
                  }
                  className="font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
                >
                  example prompt ↻
                </button>
              </div>
              <div className="rounded-sm border border-sc-border bg-sc-surface overflow-hidden focus-within:border-sc-gold-dim transition-colors">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={PORTFOLIO_PROMPT_IDEAS[promptIdx]}
                  rows={6}
                  className="w-full bg-transparent px-4 pt-4 pb-3 text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none resize-none leading-relaxed"
                />
                <div className="px-4 pb-2 flex justify-end">
                  <span
                    className={`font-mono text-[10px] ${
                      description.length < 40
                        ? "text-sc-dim"
                        : description.length > 400
                          ? "text-sc-gold"
                          : "text-sc-muted"
                    }`}
                  >
                    {description.length} chars
                    {description.length < 40 && " — add more detail"}
                  </span>
                </div>
              </div>
              <p className="font-mono text-[10px] text-sc-dim leading-relaxed">
                Include: what you made, the creative decisions, what it achieved.
                40–300 words is ideal. Be specific — vague briefs get generic challenges.
              </p>
            </div>

            {/* Critic selector */}
            <div className="space-y-2">
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                Choose your critic
              </p>
              <div className="space-y-2">
                {CRITIC_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCriticPersona(c.value)}
                    className={`w-full rounded-sm border px-4 py-3 text-left transition-all flex items-center justify-between gap-4 ${
                      criticPersona === c.value
                        ? "border-sc-gold-dim bg-sc-gold-bg"
                        : "border-sc-border bg-sc-surface hover:border-sc-gold-dim/60"
                    }`}
                  >
                    <div>
                      <p
                        className={`text-sm font-medium leading-snug ${
                          criticPersona === c.value ? "text-sc-gold" : "text-sc-ink"
                        }`}
                      >
                        {c.label}
                      </p>
                      <p className="font-mono text-xs text-sc-dim mt-0.5">
                        {c.sublabel}
                      </p>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        criticPersona === c.value ? "bg-sc-gold" : "bg-sc-border"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {generatingError && (
              <p className="font-mono text-xs text-sc-red">{generatingError}</p>
            )}

            <button
              onClick={generateChallenges}
              disabled={description.trim().length < 40}
              className="w-full rounded-sm bg-sc-gold px-6 py-3.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate my 3 challenges →
            </button>
          </>
        )}

        {/* ── Generating stage ── */}
        {stage === "generating" && (
          <div className="py-16 text-center space-y-4">
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-sc-gold animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="font-mono text-xs text-sc-dim">
              {activeCritic.label} is reviewing your piece…
            </p>
          </div>
        )}

        {/* ── Defending stage ── */}
        {typeof stage === "object" && stage.type === "defending" && (
          <>
            {/* Already answered challenges */}
            {results.map((r, i) => (
              <ChallengeResultCard key={i} result={r} n={i + 1} />
            ))}

            {/* Current challenge */}
            <div className="rounded-sm border border-sc-gold-dim bg-sc-surface overflow-hidden">
              {/* Challenge header */}
              <div className="px-4 py-3 border-b border-sc-line bg-sc-gold-bg flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
                  {currentIndex === 0
                    ? "Opening probe"
                    : currentIndex === 1
                      ? "Pressure test"
                      : "Hardest challenge"}
                </span>
                <span className="font-mono text-xs text-sc-dim">
                  {activeCritic.label}
                </span>
              </div>

              {/* Challenge text */}
              <div className="px-4 py-4">
                <p className="text-sm font-medium text-sc-ink leading-relaxed border-l-2 border-sc-gold pl-3">
                  {challenges[currentIndex]}
                </p>
              </div>

              {/* Answer area */}
              <div className="px-4 pb-4 space-y-3">
                <div className="border border-sc-border rounded-sm bg-sc-raised overflow-hidden focus-within:border-sc-gold-dim transition-colors">
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => {
                      setCurrentAnswer(e.target.value);
                      if (recState === "transcribed") setRecState("idle");
                    }}
                    placeholder="Type your defence, or use the mic below…"
                    rows={4}
                    disabled={isGrading}
                    className="w-full bg-transparent px-3 pt-3 pb-2 text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none resize-none leading-relaxed disabled:opacity-50"
                  />
                </div>

                {/* Mic row */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Browser voice — instant */}
                    {speechSupported && (
                      browserRecording ? (
                        <button
                          type="button"
                          onClick={toggleBrowserVoice}
                          className="flex items-center gap-1.5 rounded-sm border border-sc-red/50 bg-sc-red/10 px-3 py-2 font-mono text-xs text-sc-red animate-pulse hover:bg-sc-red/20 transition-colors"
                        >
                          <span>🎙</span>
                          <span>Listening — tap to stop</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={toggleBrowserVoice}
                          disabled={isGrading || recState === "recording" || recState === "uploading"}
                          className="flex items-center gap-1.5 rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-3 py-2 font-mono text-xs text-sc-gold hover:brightness-105 transition-colors disabled:opacity-40"
                        >
                          <span>🎙</span>
                          <span>Speak now</span>
                        </button>
                      )
                    )}

                    {/* Live timer while browser-recording */}
                    {browserRecording && (
                      <div className="flex items-baseline gap-2">
                        <span className={`font-mono text-base font-semibold tabular-nums ${srSeconds >= 90 ? "text-sc-red" : srSeconds >= 60 ? "text-sc-gold" : "text-sc-green"}`}>
                          {String(Math.floor(srSeconds / 60)).padStart(1, "0")}:{String(srSeconds % 60).padStart(2, "0")}
                        </span>
                        {srSeconds >= 90 ? (
                          <span className="font-mono text-[10px] text-sc-red">— wrap up</span>
                        ) : srSeconds >= 60 ? (
                          <span className="font-mono text-[10px] text-sc-gold">— start closing</span>
                        ) : (
                          <span className="font-mono text-[10px] text-sc-dim animate-pulse">listening…</span>
                        )}
                      </div>
                    )}

                    {speechSupported && !browserRecording && recState !== "uploading" && (
                      <span className="font-mono text-[10px] text-sc-border">or</span>
                    )}

                    {/* Whisper */}
                    {!browserRecording && (
                      recState === "idle" || recState === "transcribed" ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={isGrading}
                          className="flex items-center gap-1.5 rounded-sm border border-sc-border bg-sc-surface px-3 py-2 font-mono text-xs text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors disabled:opacity-40"
                        >
                          <span>⏺</span>
                          <span>{speechSupported ? "Record with Whisper" : "Record"}</span>
                        </button>
                      ) : recState === "recording" ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center gap-1.5 rounded-sm border border-sc-red/40 bg-sc-red/10 px-3 py-2 font-mono text-xs text-sc-red animate-pulse hover:bg-sc-red/20 transition-colors"
                        >
                          <span>⏹</span>
                          <span>Stop</span>
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-sc-gold px-3 py-2 animate-pulse">
                          Transcribing…
                        </span>
                      )
                    )}

                    {recState === "transcribed" && !browserRecording && (
                      <span className="font-mono text-[10px] text-sc-green">✓ Transcribed</span>
                    )}
                    {recError && (
                      <span className="font-mono text-[10px] text-sc-red">{recError}</span>
                    )}
                  </div>

                  {interimText && (
                    <p className="font-mono text-[10px] text-sc-muted italic">{interimText}…</p>
                  )}
                </div>

                {/* Streaming feedback while grading */}
                {isGrading && gradingFeedback && (
                  <div className="rounded-sm border border-sc-border bg-sc-raised px-3 py-3">
                    <p className="font-mono text-xs text-sc-gold mb-1.5 animate-pulse">
                      Coaching…
                    </p>
                    <p className="font-mono text-xs text-sc-muted leading-relaxed whitespace-pre-wrap line-clamp-5">
                      {gradingFeedback}
                    </p>
                  </div>
                )}

                <button
                  onClick={submitAnswer}
                  disabled={!currentAnswer.trim() || isGrading}
                  className="w-full rounded-sm bg-sc-gold px-5 py-3 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGrading
                    ? "Scoring…"
                    : currentIndex < 2
                      ? "Submit → next challenge"
                      : "Submit → final results"}
                </button>
              </div>
            </div>

            {/* Upcoming challenges (greyed) */}
            {challenges.slice(currentIndex + 1).map((c, i) => (
              <div
                key={i}
                className="rounded-sm border border-sc-border bg-sc-surface px-4 py-4 opacity-30"
              >
                <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-2">
                  {currentIndex + i + 1 === 1
                    ? "Pressure test"
                    : "Hardest challenge"}
                </p>
                <p className="text-sm text-sc-dim leading-snug">{c}</p>
              </div>
            ))}
          </>
        )}

        {/* ── Done stage ── */}
        {stage === "done" && (
          <>
            {/* Summary */}
            <div className="rounded-sm border border-sc-border bg-sc-surface px-5 py-5 space-y-3">
              <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
                Defence complete
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-sc-muted">
                  {activeCritic.label} — 3 challenges
                </p>
                {avgComposite !== null && (
                  <span
                    className={`font-display text-2xl font-semibold tabular-nums ${
                      avgComposite >= 8
                        ? "text-sc-green"
                        : avgComposite >= 6
                          ? "text-sc-gold"
                          : "text-sc-red"
                    }`}
                  >
                    {avgComposite}
                  </span>
                )}
              </div>

              {results.length === 3 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {results.map((r, i) => {
                    const c = +((r.content + r.english + r.delivery) / 3).toFixed(1);
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-xs ${
                          c >= 8
                            ? "text-sc-green border-sc-green/30 bg-sc-green-bg"
                            : c >= 6
                              ? "text-sc-gold border-sc-gold-dim bg-sc-gold-bg"
                              : "text-sc-red border-sc-red/30 bg-sc-red/5"
                        }`}
                      >
                        <span className="opacity-50 text-[10px]">
                          {i === 0 ? "Open" : i === 1 ? "Press" : "Hard"}
                        </span>
                        <span className="font-bold tabular-nums">{c}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* All results */}
            {results.map((r, i) => (
              <ChallengeResultCard key={i} result={r} n={i + 1} />
            ))}

            {/* Actions */}
            <div className="border-t border-sc-border pt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  srRef.current?.stop();
                  setBrowserRecording(false);
                  setInterimText("");
                  setStage("brief");
                  setDescription("");
                  setChallenges([]);
                  setResults([]);
                  setCurrentAnswer("");
                  setGradingFeedback("");
                  setRecState("idle");
                  setRecError(null);
                }}
                className="rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
              >
                Defend another piece →
              </button>
              <Link
                href="/stagecraft"
                className="rounded-sm border border-sc-border bg-sc-surface px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
              >
                Back to practice
              </Link>
              <Link
                href="/stagecraft/drill"
                className="rounded-sm border border-sc-border bg-sc-surface px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
              >
                Drill weak answers
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
