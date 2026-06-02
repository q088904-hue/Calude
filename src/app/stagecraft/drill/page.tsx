"use client";

// Stagecraft — Drill Forge.
// A focused, iterative practice loop for John's five highest-risk questions.
// No session overhead — just the question, the mic, and a mastery gate:
// three consecutive answers scoring composite ≥ 8.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { parseFeedbackSections } from "@/lib/stagecraft/feedbackParser";
import {
  renderWithPatternTags,
  renderSampleAnswer,
} from "@/lib/stagecraft/feedbackRenderers";
import type { Round } from "@/lib/stagecraft/types";
import { getSRClass, type SREvent, type SRInstance } from "@/lib/stagecraft/speechRecognition";
import { getPackById } from "@/lib/stagecraft/companyPacks";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SuggestedAnswer } from "@/components/stagecraft/SuggestedAnswer";

// ── Drill bank ────────────────────────────────────────────────────────────────

const DRILLS = [
  {
    id: "intro",
    title: "30-sec intro",
    label: "Every interview — nail this first",
    question: "Tell me about yourself.",
    round: "hr" as Round,
    context: "Under 60 seconds. Three things: who you are, where you've been, what's different about you. No rambling.",
    risk: false,
  },
  {
    id: "tenure",
    title: "18-year move",
    label: "Your #1 risk question",
    question: "Why are you looking to move after 18 years at Datamatics?",
    round: "hiring-manager" as Round,
    context: "Anchored in what changed for you — not what's wrong with Datamatics. Forward-looking, not defensive.",
    risk: true,
  },
  {
    id: "kohler",
    title: "Why Kohler",
    label: "Brand fit & motivation",
    question: "Why Kohler? What draws you to this role specifically?",
    round: "hr" as Round,
    context: "Name something specific about their design philosophy. Generic flattery scores a 3. Specific insight scores an 8.",
    risk: false,
  },
  {
    id: "ai",
    title: "AI pipeline",
    label: "Your strongest differentiator",
    question:
      "Walk me through the AI pipeline you built — what problem did it solve, and what did it change?",
    round: "portfolio" as Round,
    context: "Lead with the business problem first, then the solution, then the measurable result. Don't lead with the tech.",
    risk: false,
  },
  {
    id: "leadership",
    title: "Direction change",
    label: "Leadership under pressure",
    question:
      "Tell me about a time you had to lead a team through a major creative direction change.",
    round: "leadership" as Round,
    context: "Full STAR format. Most candidates forget the Result — what actually changed because of your leadership?",
    risk: false,
  },
] as const;

type DrillId = (typeof DRILLS)[number]["id"];


// ── Types ─────────────────────────────────────────────────────────────────────

type RecorderState = "idle" | "recording" | "uploading" | "transcribed";

interface Attempt {
  n: number;
  transcript: string;
  rawFeedback: string;
  content: number;
  english: number;
  delivery: number;
  composite: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const META_RE = /\[META\](\{[\s\S]*?\})\[\/META\]/;

function parseMeta(text: string): {
  content: number;
  english: number;
  delivery: number;
} {
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
    } catch {
      /* fall through */
    }
  }
  const grab = (label: string) =>
    Number(
      text.match(new RegExp(`${label}\\s*:\\s*(\\d+)\\s*\\/\\s*10`, "i"))?.[1] ??
        0,
    );
  return {
    content: grab("Content"),
    english: grab("English"),
    delivery: grab("Delivery"),
  };
}

function composite(a: Pick<Attempt, "content" | "english" | "delivery">) {
  return +((a.content + a.english + a.delivery) / 3).toFixed(1);
}

// Consecutive ≥8 streak from the most recent attempt backwards.
function streak(attempts: Attempt[]): number {
  let count = 0;
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].composite >= 8) count++;
    else break;
  }
  return count;
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
      <span className="opacity-50 text-[10px] uppercase tracking-wider">
        {label}
      </span>
      <span className="font-bold tabular-nums">{value}/10</span>
    </span>
  );
}

function MasteryRing({
  filled,
  value,
  pulse,
}: {
  filled: boolean;
  value?: number;
  pulse?: boolean;
}) {
  return (
    <div
      title={value !== undefined ? `${value}/10` : undefined}
      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
        filled
          ? "border-sc-green bg-sc-green-bg text-sc-green"
          : "border-sc-border bg-sc-surface text-sc-dim"
      } ${pulse ? "animate-pulse" : ""}`}
    >
      {filled && value !== undefined ? (
        <span className="font-mono text-xs font-bold tabular-nums">{value}</span>
      ) : (
        <span className="text-sc-border text-lg leading-none">·</span>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DrillPageWrapper() {
  return (
    <Suspense fallback={
      <div className="stagecraft-root min-h-screen bg-sc-bg flex items-center justify-center">
        <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">Loading…</p>
      </div>
    }>
      <DrillPage />
    </Suspense>
  );
}

function DrillPage() {
  const searchParams = useSearchParams();
  const initialId = (searchParams.get("id") as DrillId | null) ?? "intro";
  const [activeDrillId, setActiveDrillId] = useState<DrillId>(
    DRILLS.some((d) => d.id === initialId) ? initialId : "intro"
  );
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptN, setAttemptN] = useState(0);

  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [answerMode, setAnswerMode] = useState<"voice" | "type">("voice");
  const [transcript, setTranscript] = useState("");

  const [rawFeedback, setRawFeedback] = useState("");
  const [feedbackStreaming, setFeedbackStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Web Speech API state (instant voice — no Whisper upload needed)
  const [speechSupported, setSpeechSupported] = useState(false);
  const [browserRecording, setBrowserRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const srRef = useRef<SRInstance | null>(null);
  const [srSeconds, setSrSeconds] = useState(0);
  const srTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const drill = DRILLS.find((d) => d.id === activeDrillId)!;

  // Derived state
  const hasFeedback = rawFeedback.length > 0 && !feedbackStreaming;
  const sections = hasFeedback ? parseFeedbackSections(rawFeedback) : null;
  const currentStreak = streak(attempts);
  const mastered = currentStreak >= 3;
  const lastAttempt = attempts[attempts.length - 1];

  // The three "mastery rings" show the last ≤3 meaningful attempts.
  // Fill from right-to-left so rings animate in as you earn them.
  const ringAttempts = attempts.slice(-3);
  const rings: (Attempt | null)[] = [
    ringAttempts[0] ?? null,
    ringAttempts[1] ?? null,
    ringAttempts[2] ?? null,
  ];

  // Detect Web Speech API support on mount
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

  // ── Drill switching ────────────────────────────────────────────────────────

  const switchDrill = (id: DrillId) => {
    if (id === activeDrillId) return;
    // Stop any active browser recording
    srRef.current?.stop();
    setBrowserRecording(false);
    setInterimTranscript("");
    setActiveDrillId(id);
    setAttempts([]);
    setAttemptN(0);
    setTranscript("");
    setRawFeedback("");
    setRecorderState("idle");
    setError(null);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // ── Browser voice (Web Speech API) ────────────────────────────────────────

  const toggleBrowserVoice = useCallback(() => {
    if (browserRecording) {
      srRef.current?.stop();
      setBrowserRecording(false);
      setInterimTranscript("");
      return;
    }

    const SR = getSRClass();
    if (!SR) return;

    setTranscript("");
    setError(null);

    const sr = new SR();
    sr.continuous = true;
    sr.interimResults = true;
    sr.lang = "en-IN";

    let final = "";

    sr.onresult = (event: SREvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const seg = res[0].transcript;
          final = final ? final.trimEnd() + " " + seg.trimStart() : seg;
        } else {
          interim = res[0].transcript;
        }
      }
      setTranscript(final);
      setInterimTranscript(interim);
    };

    sr.onerror = () => { setBrowserRecording(false); setInterimTranscript(""); };
    sr.onend = () => { setBrowserRecording(false); setInterimTranscript(""); };
    sr.start();
    srRef.current = sr;
    setBrowserRecording(true);
  }, [browserRecording]);

  // ── Recording ─────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mr.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecorderState("recording");
    } catch {
      setError(
        "Microphone blocked. Check your browser settings and try again.",
      );
      setRecorderState("idle");
    }
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    setRecorderState("uploading");
    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const fd = new FormData();
    fd.set("audio", blob, "answer.webm");
    try {
      const res = await fetch("/api/stagecraft/transcribe", {
        method: "POST",
        body: fd,
      });
      if (!res.ok)
        throw new Error("Transcription failed — re-record or type your answer.");
      const json = (await res.json()) as { text: string };
      setTranscript(json.text ?? "");
      setRecorderState("transcribed");
    } catch (err) {
      setError(String(err));
      setRecorderState("idle");
    }
  }, []);

  // ── Grading ───────────────────────────────────────────────────────────────

  const submitAnswer = useCallback(async () => {
    if (!transcript.trim()) return;
    setRawFeedback("");
    setFeedbackStreaming(true);
    setError(null);
    const n = attemptN + 1;
    setAttemptN(n);
    try {
      const res = await fetch("/api/stagecraft/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: drill.question,
          answer: transcript,
          round: drill.round,
          questionIndex: 1,
          totalQuestions: 1,
          difficulty: "realistic",
          // Default to Kohler pack — drills are always for the primary target
          targetContext: getPackById("kohler-india")?.brandBrief,
        }),
      });
      if (!res.ok || !res.body)
        throw new Error("Couldn't get coaching — tap Submit to retry.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setRawFeedback(acc);
      }
      setFeedbackStreaming(false);

      const scores = parseMeta(acc);
      const comp = composite(scores);
      setAttempts((prev) => [
        ...prev,
        { n, transcript, rawFeedback: acc, ...scores, composite: comp },
      ]);
    } catch (err) {
      setError(String(err));
      setFeedbackStreaming(false);
    }
  }, [attemptN, drill, transcript]);

  const retry = useCallback(() => {
    srRef.current?.stop();
    setBrowserRecording(false);
    setInterimTranscript("");
    setTranscript("");
    setRawFeedback("");
    setRecorderState("idle");
    setError(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* ── Header ── */}
      <StagecraftHeader label="Drill">
        <span className="font-mono text-xs text-sc-dim tabular-nums">
          {attempts.length === 0
            ? "no attempts yet"
            : `${attempts.length} attempt${attempts.length !== 1 ? "s" : ""}`}
        </span>
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* ── Hero ── */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            Drill forge
          </p>
          <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
            Nail it three times.
          </h1>
          <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
            Pick a question. Answer it. Score ≥8 on three consecutive attempts
            to mark it mastered.
          </p>
        </div>

        {/* ── Drill selector ── */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
            Question
          </p>
          <div className="flex flex-wrap gap-2">
            {DRILLS.map((d) => (
              <button
                key={d.id}
                onClick={() => switchDrill(d.id)}
                className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-all ${
                  d.id === activeDrillId
                    ? d.risk
                      ? "border-sc-red/50 bg-sc-red/10 text-sc-red"
                      : "border-sc-gold-dim bg-sc-gold-bg text-sc-gold"
                    : "border-sc-border bg-sc-surface text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold"
                }`}
              >
                {d.risk && <span className="mr-1 opacity-70">⚠</span>}
                {d.title}
              </button>
            ))}
          </div>
        </div>

        {/* ── Question card ── */}
        <div
          className={`rounded-sm border p-5 ${
            drill.risk
              ? "border-sc-red/30 bg-sc-red/5"
              : "border-sc-border bg-sc-surface"
          }`}
        >
          <p
            className={`font-mono text-[10px] tracking-widest uppercase mb-2 ${
              drill.risk ? "text-sc-red" : "text-sc-dim"
            }`}
          >
            {drill.label}
          </p>
          <p className="text-lg font-medium leading-snug text-sc-ink mb-3">
            &ldquo;{drill.question}&rdquo;
          </p>
          <p className="font-mono text-xs text-sc-muted leading-relaxed">
            {drill.context}
          </p>
          <SuggestedAnswer question={drill.question} />
        </div>

        {/* ── Mastery tracker ── */}
        <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-4">
          <div className="flex items-center gap-5">
            {/* Three rings */}
            <div className="flex gap-2.5">
              {rings.map((a, i) => (
                <MasteryRing
                  key={i}
                  filled={a !== null && a.composite >= 8}
                  value={a?.composite}
                  pulse={
                    !mastered &&
                    feedbackStreaming &&
                    i === ringAttempts.length
                  }
                />
              ))}
            </div>

            {/* Status */}
            <div className="flex-1 min-w-0">
              {mastered ? (
                <div>
                  <p className="font-mono text-sm font-bold text-sc-green">
                    ✓ Mastered
                  </p>
                  <p className="font-mono text-xs text-sc-dim mt-0.5">
                    3 consecutive ≥8 — this question is ready for the real
                    interview.
                  </p>
                </div>
              ) : currentStreak > 0 ? (
                <div>
                  <p className="font-mono text-sm font-semibold text-sc-gold">
                    {currentStreak}/3 in a row
                  </p>
                  <p className="font-mono text-xs text-sc-dim mt-0.5">
                    Keep scoring ≥8 —{" "}
                    {3 - currentStreak} more to master this question.
                  </p>
                </div>
              ) : attempts.length === 0 ? (
                <div>
                  <p className="font-mono text-sm text-sc-dim">
                    Goal: 3 × ≥8 in a row
                  </p>
                  <p className="font-mono text-xs text-sc-dim mt-0.5 opacity-60">
                    Answer below to start.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-mono text-sm text-sc-red">
                    Streak broken — reset to 0
                  </p>
                  <p className="font-mono text-xs text-sc-dim mt-0.5">
                    Score ≥8 three times in a row to master this question.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Answer area — hidden while feedback is visible ── */}
        {!hasFeedback && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {(["voice", "type"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    if (answerMode !== m) {
                      setAnswerMode(m);
                      setTranscript("");
                      setRecorderState("idle");
                    }
                  }}
                  className={`font-mono text-xs px-3 py-1.5 rounded-sm border transition-colors ${
                    answerMode === m
                      ? "border-sc-gold-dim bg-sc-gold-bg text-sc-gold"
                      : "border-sc-border text-sc-dim hover:text-sc-ink hover:border-sc-gold-dim"
                  }`}
                >
                  {m === "voice" ? "🎙 Voice" : "⌨ Type"}
                </button>
              ))}
            </div>

            {/* Voice flow */}
            {answerMode === "voice" && (
              <div className="space-y-3">
                {/* Browser voice — instant, no upload (shown when Web Speech API is available) */}
                {speechSupported && recorderState === "idle" && (
                  <div className="space-y-2">
                    {/* Show Speak button only when no transcript yet */}
                    {!transcript && (
                      <button
                        onClick={toggleBrowserVoice}
                        className={`w-full rounded-sm border px-4 py-3.5 font-mono text-sm transition-colors ${
                          browserRecording
                            ? "border-sc-red/50 bg-sc-red/10 text-sc-red animate-pulse"
                            : "border-sc-gold-dim bg-sc-gold-bg text-sc-gold hover:bg-sc-gold/20"
                        }`}
                      >
                        {browserRecording ? "● Speaking — tap to stop" : "🎙 Speak now (instant)"}
                      </button>
                    )}
                    {/* Live timer while speaking */}
                    {browserRecording && (
                      <div className="flex items-baseline gap-2">
                        <span className={`font-mono text-lg font-semibold tabular-nums ${srSeconds >= 90 ? "text-sc-red" : srSeconds >= 60 ? "text-sc-gold" : "text-sc-green"}`}>
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
                    {/* Live transcript while speaking */}
                    {(transcript || interimTranscript) && (
                      <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 text-sm text-sc-ink leading-relaxed min-h-[3rem]">
                        {transcript}
                        {interimTranscript && (
                          <span className="text-sc-muted/60 italic"> …{interimTranscript}</span>
                        )}
                      </div>
                    )}
                    {/* Grade button appears once speech has been captured and recording stopped */}
                    {transcript && !browserRecording && (
                      <div className="flex gap-2">
                        <button
                          onClick={submitAnswer}
                          className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-2 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors"
                        >
                          Submit for coaching
                        </button>
                        <button
                          onClick={() => { setTranscript(""); setInterimTranscript(""); }}
                          className="rounded-sm border border-sc-border px-4 py-2 font-mono text-xs text-sc-dim hover:text-sc-ink transition-colors"
                        >
                          Re-speak
                        </button>
                      </div>
                    )}
                    {/* Divider + Whisper fallback — only shown when no transcript */}
                    {!transcript && !browserRecording && (
                      <>
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1 h-px bg-sc-border" />
                          <span className="font-mono text-[10px] text-sc-dim uppercase">or use Whisper</span>
                          <div className="flex-1 h-px bg-sc-border" />
                        </div>
                        <button
                          onClick={startRecording}
                          className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-2.5 font-mono text-xs text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
                        >
                          Record with Whisper (higher accuracy)
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Whisper-only fallback (shown when Web Speech not supported) */}
                {!speechSupported && recorderState === "idle" && (
                  <button
                    onClick={startRecording}
                    className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-4 font-mono text-sm text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
                  >
                    Tap to record your answer
                  </button>
                )}
                {recorderState === "recording" && (
                  <button
                    onClick={stopAndTranscribe}
                    className="w-full rounded-sm border border-sc-red/50 bg-sc-red/10 px-4 py-4 font-mono text-sm text-sc-red animate-pulse"
                  >
                    ● Recording — tap to stop
                  </button>
                )}
                {recorderState === "uploading" && (
                  <div className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-4 font-mono text-sm text-sc-dim animate-pulse">
                    Transcribing…
                  </div>
                )}
                {recorderState === "transcribed" && transcript && (
                  <div className="space-y-3">
                    <div>
                      <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1.5">
                        Your answer
                      </p>
                      <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 text-sm text-sc-ink leading-relaxed">
                        {transcript}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={submitAnswer}
                        className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-2 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors"
                      >
                        Submit for coaching
                      </button>
                      <button
                        onClick={() => {
                          setTranscript("");
                          setRecorderState("idle");
                        }}
                        className="rounded-sm border border-sc-border px-4 py-2 font-mono text-xs text-sc-dim hover:text-sc-ink transition-colors"
                      >
                        Re-record
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Type flow */}
            {answerMode === "type" && (
              <div className="space-y-3">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Type your answer here…"
                  rows={5}
                  className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors resize-none leading-relaxed"
                />
                <button
                  disabled={!transcript.trim()}
                  onClick={submitAnswer}
                  className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-2 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit for coaching
                </button>
              </div>
            )}

            {error && (
              <p className="font-mono text-xs text-sc-red border border-sc-red/20 bg-sc-red/5 rounded-sm px-3 py-2">
                {error}
              </p>
            )}
          </div>
        )}

        {/* ── Streaming indicator ── */}
        {feedbackStreaming && (
          <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 font-mono text-xs text-sc-dim animate-pulse">
            Coaching…
          </div>
        )}

        {/* ── Feedback ── */}
        {hasFeedback && sections && lastAttempt && (
          <div className="space-y-5">
            {/* Score row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <ScoreChip label="Content" value={lastAttempt.content} />
              <ScoreChip label="English" value={lastAttempt.english} />
              <ScoreChip label="Delivery" value={lastAttempt.delivery} />
              <span className="font-mono text-xs text-sc-dim">
                composite&nbsp;
                <span
                  className={`font-bold ${
                    lastAttempt.composite >= 8
                      ? "text-sc-green"
                      : lastAttempt.composite >= 6
                        ? "text-sc-gold"
                        : "text-sc-red"
                  }`}
                >
                  {lastAttempt.composite}
                </span>
                /10
              </span>
            </div>

            {/* Grammar fix */}
            <FeedbackBlock
              label="Grammar fix"
              labelColor="text-sc-dim"
              borderColor="border-sc-border"
            >
              <p className="font-mono text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">
                {renderWithPatternTags(sections.grammarFix)}
              </p>
              {sections.patternTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {[...new Set(sections.patternTags)].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm border border-sc-red/30 bg-sc-red/10 px-2 py-0.5 font-mono text-xs text-sc-red"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </FeedbackBlock>

            {/* Sample answer */}
            <FeedbackBlock
              label="Sample answer — memorize this"
              labelColor="text-sc-gold"
              borderColor="border-sc-gold-dim"
              bg="bg-sc-gold-bg"
            >
              <p className="text-sm text-sc-ink leading-relaxed">
                {renderSampleAnswer(sections.sampleAnswer)}
              </p>
            </FeedbackBlock>

            {/* Delivery tip */}
            <FeedbackBlock
              label="Delivery tip"
              labelColor="text-sc-dim"
              borderColor="border-sc-border"
            >
              <p className="text-sm text-sc-muted leading-relaxed">
                {sections.deliveryTip}
              </p>
            </FeedbackBlock>

            {/* Try again / mastered CTA */}
            {mastered ? (
              <div className="rounded-sm border border-sc-green/30 bg-sc-green-bg px-5 py-4 text-center space-y-3">
                <p className="font-display text-xl font-semibold text-sc-green">
                  Question mastered.
                </p>
                <p className="font-mono text-xs text-sc-dim">
                  Three consecutive answers scored ≥8. This one is ready for the
                  real interview. Pick another drill or head back to a full
                  session.
                </p>
                <div className="flex justify-center gap-3 pt-1">
                  <button
                    onClick={retry}
                    className="rounded-sm border border-sc-border px-4 py-2 font-mono text-xs text-sc-dim hover:text-sc-ink transition-colors"
                  >
                    Keep drilling
                  </button>
                  <Link
                    href="/stagecraft"
                    className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-2 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors"
                  >
                    Full session →
                  </Link>
                </div>
              </div>
            ) : (
              <button
                onClick={retry}
                className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 font-mono text-sm text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
              >
                Try again ↩
              </button>
            )}
          </div>
        )}

        {/* ── Attempt history ── */}
        {attempts.length > 1 && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
              This session
            </p>
            <div className="space-y-1.5">
              {[...attempts].reverse().map((a) => (
                <div
                  key={a.n}
                  className="flex items-center gap-3 rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-3 py-2"
                >
                  <span className="font-mono text-[10px] text-sc-dim w-5 text-right shrink-0">
                    #{a.n}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                      a.composite >= 8
                        ? "text-sc-green"
                        : a.composite >= 6
                          ? "text-sc-gold"
                          : "text-sc-red"
                    }`}
                  >
                    {a.composite}/10
                  </span>
                  <span className="font-mono text-[10px] text-sc-dim shrink-0 hidden sm:inline">
                    C:{a.content} E:{a.english} D:{a.delivery}
                  </span>
                  <p className="flex-1 text-xs text-sc-muted truncate min-w-0">
                    {a.transcript}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── FeedbackBlock helper ──────────────────────────────────────────────────────

function FeedbackBlock({
  label,
  labelColor,
  borderColor,
  bg = "bg-sc-surface",
  children,
}: {
  label: string;
  labelColor: string;
  borderColor: string;
  bg?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p
        className={`font-mono text-[10px] tracking-widest uppercase ${labelColor}`}
      >
        {label}
      </p>
      <div
        className={`rounded-sm border ${borderColor} ${bg} px-4 py-3`}
      >
        {children}
      </div>
    </div>
  );
}
