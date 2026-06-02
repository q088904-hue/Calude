"use client";

// Stagecraft — Self-Intro Forge.
// Dedicated workshop for perfecting the 30-second self-introduction.
// Anchor-aware: checks 4 key proof points on every attempt.
// Mastery gate: 3 consecutive composite scores ≥ 9.
//
// State: idle → (recording|typing) → grading → result → [loop]

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { parseFeedbackSections } from "@/lib/stagecraft/feedbackParser";
import { renderSampleAnswer } from "@/lib/stagecraft/feedbackRenderers";
import { getSRClass, type SREvent, type SRInstance } from "@/lib/stagecraft/speechRecognition";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnchorState {
  years_scale: boolean;
  ai_pipeline: boolean;
  brand_systems: boolean;
  the_offer: boolean;
}

interface Attempt {
  n: number;
  answer: string;
  wordCount: number;
  composite: number;
  content: number;
  english: number;
  delivery: number;
  anchors: AnchorState;
  sampleAnswer: string;
  feedback: string; // raw
  timestamp: string;
}

type InputMode = "voice" | "type";

// ── Constants ─────────────────────────────────────────────────────────────────

const ANCHOR_LABELS: { key: keyof AnchorState; label: string; desc: string }[] = [
  {
    key: "years_scale",
    label: "Years + scale",
    desc: "20+ years · 100+ campaigns · 6-person team",
  },
  {
    key: "ai_pipeline",
    label: "AI pipeline",
    desc: "N8N / HeyGen / ElevenLabs · 40% faster",
  },
  {
    key: "brand_systems",
    label: "Brand systems",
    desc: "Built the system + DAM · not just used it",
  },
  {
    key: "the_offer",
    label: "The offer",
    desc: "Craft + systems + speed — what they get",
  },
];

const META_RE = /\[META\](\{[\s\S]*?\})\[\/META\]/;
const ANCHORS_RE = /\[ANCHORS\](\{[\s\S]*?\})\[\/ANCHORS\]/;

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

function parseAnchors(text: string): AnchorState {
  const m = text.match(ANCHORS_RE);
  if (m) {
    try {
      return JSON.parse(m[1]) as AnchorState;
    } catch { /* fall through */ }
  }
  return { years_scale: false, ai_pipeline: false, brand_systems: false, the_offer: false };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function timingLabel(words: number): { label: string; color: string } {
  if (words < 40) return { label: "Too short", color: "text-sc-red" };
  if (words < 75) return { label: "Under 30s", color: "text-sc-gold" };
  if (words <= 115) return { label: "✓ Sweet spot", color: "text-sc-green" };
  if (words <= 130) return { label: "Slightly long", color: "text-sc-gold" };
  return { label: "Too long", color: "text-sc-red" };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AnchorPip({
  label,
  desc,
  hit,
}: {
  label: string;
  desc: string;
  hit: boolean | null; // null = not yet evaluated
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-sm border px-3 py-2 transition-all ${
        hit === null
          ? "border-sc-border bg-sc-surface opacity-40"
          : hit
            ? "border-sc-green/40 bg-sc-green-bg"
            : "border-sc-red/30 bg-sc-red/5"
      }`}
    >
      <span
        className={`shrink-0 font-mono text-sm leading-none mt-0.5 ${
          hit === null ? "text-sc-dim" : hit ? "text-sc-green" : "text-sc-red"
        }`}
      >
        {hit === null ? "○" : hit ? "✓" : "✗"}
      </span>
      <div>
        <p
          className={`text-xs font-medium leading-snug ${
            hit === null ? "text-sc-dim" : hit ? "text-sc-green" : "text-sc-ink"
          }`}
        >
          {label}
        </p>
        <p className="font-mono text-[10px] text-sc-dim leading-relaxed mt-0.5">
          {desc}
        </p>
      </div>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
  const [open, setOpen] = useState(false);
  const composite = attempt.composite;
  const compositeColor =
    composite >= 9
      ? "text-sc-green"
      : composite >= 7
        ? "text-sc-gold"
        : "text-sc-red";
  const anchorsHit = Object.values(attempt.anchors).filter(Boolean).length;

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-sc-raised transition-colors"
      >
        <span className="font-mono text-xs text-sc-dim w-6 shrink-0">
          #{attempt.n}
        </span>
        <span
          className={`font-display text-base font-semibold tabular-nums ${compositeColor} shrink-0`}
        >
          {composite}
        </span>
        <span className="font-mono text-xs text-sc-dim shrink-0">
          {attempt.wordCount}w
        </span>
        <div className="flex gap-0.5 flex-1">
          {ANCHOR_LABELS.map((a) => (
            <span
              key={a.key}
              title={a.label}
              className={`w-1.5 h-1.5 rounded-full ${
                attempt.anchors[a.key] ? "bg-sc-green" : "bg-sc-red/40"
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] text-sc-dim">
          {anchorsHit}/4 anchors
        </span>
        <span className="font-mono text-xs text-sc-dim">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-sc-line px-4 py-4 space-y-4">
          {/* Anchor detail */}
          <div className="grid grid-cols-2 gap-1.5">
            {ANCHOR_LABELS.map((a) => (
              <AnchorPip
                key={a.key}
                label={a.label}
                desc={a.desc}
                hit={attempt.anchors[a.key]}
              />
            ))}
          </div>

          {/* What you said */}
          <div>
            <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1.5">
              What you said
            </p>
            <p className="text-sm text-sc-muted leading-relaxed">{attempt.answer}</p>
          </div>

          {/* Sample answer */}
          {attempt.sampleAnswer && (
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase mb-1.5">
                Nail this version
              </p>
              <p className="text-sm text-sc-ink leading-relaxed">
                {renderSampleAnswer(attempt.sampleAnswer)}
              </p>
            </div>
          )}

          {/* Scores */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { l: "Content", v: attempt.content },
              { l: "English", v: attempt.english },
              { l: "Delivery", v: attempt.delivery },
            ].map(({ l, v }) => {
              const cls =
                v >= 8
                  ? "text-sc-green border-sc-green/30 bg-sc-green-bg"
                  : v >= 6
                    ? "text-sc-gold border-sc-gold-dim bg-sc-gold-bg"
                    : "text-sc-red border-sc-red/30 bg-sc-red/5";
              return (
                <span
                  key={l}
                  className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-xs ${cls}`}
                >
                  <span className="opacity-50 text-[10px] uppercase tracking-wider">{l}</span>
                  <span className="font-bold tabular-nums">{v}/10</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mastery ring ──────────────────────────────────────────────────────────────

function MasteryRings({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
        Mastery
      </span>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full border-2 transition-all ${
              i < streak
                ? "bg-sc-green border-sc-green"
                : "bg-transparent border-sc-border"
            }`}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] text-sc-dim">
        {streak}/3 consecutive ≥ 9
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntroForgePage() {
  const [mode, setMode] = useState<InputMode>("voice");
  const [answer, setAnswer] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [mastered, setMastered] = useState(false);

  // Whisper voice
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recState, setRecState] = useState<"idle" | "recording" | "uploading" | "transcribed">(
    "idle",
  );
  const [recError, setRecError] = useState<string | null>(null);

  // Web Speech API (instant voice)
  const srRef = useRef<SRInstance | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [browserRecording, setBrowserRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [srSeconds, setSrSeconds] = useState(0);
  const srTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live word count
  const wordCount = countWords(answer);
  const timing = timingLabel(wordCount);

  // Consecutive-9 streak
  const streak = (() => {
    let s = 0;
    for (let i = attempts.length - 1; i >= 0; i--) {
      if (attempts[i].composite >= 9) s++;
      else break;
    }
    return Math.min(s, 3);
  })();

  useEffect(() => {
    if (streak >= 3 && !mastered) setMastered(true);
  }, [streak, mastered]);

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

  const toggleBrowserVoice = useCallback(() => {
    if (browserRecording) {
      srRef.current?.stop();
      setBrowserRecording(false);
      setInterimText("");
      return;
    }
    const SR = getSRClass();
    if (!SR) return;
    setAnswer("");
    setRecError(null);
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
      setAnswer(final);
      setInterimText(interim);
    };
    sr.onerror = () => { setBrowserRecording(false); setInterimText(""); };
    sr.onend = () => { setBrowserRecording(false); setInterimText(""); };
    sr.start();
    srRef.current = sr;
    setBrowserRecording(true);
  }, [browserRecording]);

  // Best attempt
  const bestAttempt =
    attempts.length > 0
      ? attempts.reduce((a, b) => (a.composite >= b.composite ? a : b))
      : null;

  // ── Voice ────────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setRecError(null);
    setAnswer("");
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
        fd.append("audio", blob, "intro.webm");
        try {
          const res = await fetch("/api/stagecraft/transcribe", {
            method: "POST",
            body: fd,
          });
          const j = (await res.json()) as { text?: string; error?: string };
          if (j.text) {
            setAnswer(j.text);
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

  // ── Submit ───────────────────────────────────────────────────────────────

  const submit = useCallback(async () => {
    if (!answer.trim() || isGrading) return;
    setIsGrading(true);
    setStreamText("");

    try {
      const res = await fetch("/api/stagecraft/intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer,
          wordCount,
          targetRole: "Creative Director — Kohler India",
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamText(acc);
      }

      const scores = parseMeta(acc);
      const anchors = parseAnchors(acc);
      const sections = parseFeedbackSections(acc);
      const composite = +((scores.content + scores.english + scores.delivery) / 3).toFixed(1);

      const attempt: Attempt = {
        n: attempts.length + 1,
        answer,
        wordCount,
        composite,
        ...scores,
        anchors,
        sampleAnswer: sections?.sampleAnswer ?? "",
        feedback: acc,
        timestamp: new Date().toISOString(),
      };

      setAttempts((prev) => [...prev, attempt]);
      setAnswer("");
      setRecState("idle");
      setStreamText("");
    } catch (err) {
      setStreamText(`[error: ${String(err)}]`);
    } finally {
      setIsGrading(false);
    }
  }, [answer, wordCount, isGrading, attempts.length]);

  // ── Render ────────────────────────────────────────────────────────────────

  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const latestAnchors = latestAttempt?.anchors ?? null;

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <StagecraftHeader label="Intro">
        <MasteryRings streak={streak} />
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Hero */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            30-second self-introduction
          </p>
          <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
            {mastered ? "Locked in. ✓" : "Forge your opening."}
          </h1>
          <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
            {mastered
              ? "You hit 9+ three times in a row. This answer is match-ready. Keep sharpening or move on."
              : "The first 30 seconds sets the tone for the whole interview. Hit all four proof points every time. Get three consecutive 9s."}
          </p>
        </div>

        {/* ── Anchor panel (always visible) ── */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
            4 proof points — all must land
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ANCHOR_LABELS.map((a) => (
              <AnchorPip
                key={a.key}
                label={a.label}
                desc={a.desc}
                hit={latestAnchors ? latestAnchors[a.key] : null}
              />
            ))}
          </div>
          {latestAnchors && (
            <p className="font-mono text-[10px] text-sc-dim">
              Last attempt:{" "}
              {Object.values(latestAnchors).filter(Boolean).length}/4 anchors
              hit
              {Object.values(latestAnchors).every(Boolean)
                ? " — all four ✓"
                : " — missing: " +
                  ANCHOR_LABELS.filter((a) => !latestAnchors[a.key])
                    .map((a) => a.label)
                    .join(", ")}
            </p>
          )}
        </div>

        {/* ── Input area ── */}
        <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden focus-within:border-sc-gold-dim transition-colors">
          {/* Mode tabs */}
          <div className="flex border-b border-sc-line">
            {(["voice", "type"] as InputMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 font-mono text-xs transition-colors ${
                  mode === m
                    ? "bg-sc-raised text-sc-gold"
                    : "text-sc-dim hover:text-sc-ink"
                }`}
              >
                {m === "voice" ? "⏺ Voice" : "⌨ Type"}
              </button>
            ))}
          </div>

          {/* Text area */}
          <div className="relative">
            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (recState === "transcribed") setRecState("idle");
              }}
              placeholder={
                mode === "voice"
                  ? "Press Record, speak your 30-second intro, then Stop…"
                  : "Type your intro here (75–115 words is the sweet spot)…"
              }
              rows={5}
              disabled={isGrading}
              className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none resize-none leading-relaxed disabled:opacity-50"
            />
            {/* Word count / timing */}
            <div className="px-4 pb-3 flex items-center gap-3 justify-end">
              <span className="font-mono text-[10px] text-sc-dim">
                {wordCount} words
              </span>
              {wordCount > 0 && (
                <span className={`font-mono text-[10px] ${timing.color}`}>
                  {timing.label}
                </span>
              )}
            </div>
          </div>

          {/* Voice controls */}
          {mode === "voice" && (
            <div className="border-t border-sc-line px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Browser voice — instant */}
                {speechSupported && recState === "idle" && (
                  <button
                    type="button"
                    onClick={toggleBrowserVoice}
                    disabled={isGrading}
                    className={`flex items-center gap-1.5 rounded-sm border px-3 py-2 font-mono text-xs transition-colors disabled:opacity-40 ${
                      browserRecording
                        ? "border-sc-red/40 bg-sc-red/10 text-sc-red animate-pulse"
                        : "border-sc-gold-dim bg-sc-gold-bg text-sc-gold hover:bg-sc-gold/20"
                    }`}
                  >
                    <span>{browserRecording ? "⏹" : "🎙"}</span>
                    <span>{browserRecording ? "Stop" : "Speak now"}</span>
                  </button>
                )}

                {/* Live timer while browser-recording */}
                {browserRecording && (
                  <div className="flex items-baseline gap-2">
                    <span className={`font-mono text-base font-semibold tabular-nums ${srSeconds >= 45 ? "text-sc-red" : srSeconds >= 30 ? "text-sc-gold" : "text-sc-green"}`}>
                      {String(Math.floor(srSeconds / 60)).padStart(1, "0")}:{String(srSeconds % 60).padStart(2, "0")}
                    </span>
                    {srSeconds >= 45 ? (
                      <span className="font-mono text-[10px] text-sc-red">— too long, wrap up</span>
                    ) : srSeconds >= 30 ? (
                      <span className="font-mono text-[10px] text-sc-gold">— start closing</span>
                    ) : (
                      <span className="font-mono text-[10px] text-sc-dim animate-pulse">listening…</span>
                    )}
                  </div>
                )}

                {/* Whisper record */}
                {recState === "idle" && !browserRecording && (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isGrading}
                    className="flex items-center gap-1.5 rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-3 py-2 font-mono text-xs text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors disabled:opacity-40"
                  >
                    <span className="text-sc-red">⏺</span>
                    <span>{speechSupported ? "Whisper" : "Record"}</span>
                  </button>
                )}
                {recState === "recording" && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 rounded-sm border border-sc-red/40 bg-sc-red/10 px-3 py-2 font-mono text-xs text-sc-red animate-pulse hover:bg-sc-red/20 transition-colors"
                  >
                    <span>⏹</span>
                    <span>Stop</span>
                  </button>
                )}
                {recState === "uploading" && (
                  <span className="font-mono text-xs text-sc-gold px-3 py-2 animate-pulse">
                    Transcribing…
                  </span>
                )}
                {recState === "transcribed" && (
                  <span className="font-mono text-[10px] text-sc-green px-1">
                    ✓ Transcribed
                  </span>
                )}
                {recError && (
                  <span className="font-mono text-[10px] text-sc-red">{recError}</span>
                )}
              </div>
              {/* Interim transcript while speaking */}
              {interimText && (
                <p className="font-mono text-[11px] text-sc-muted/60 italic leading-relaxed">
                  …{interimText}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="space-y-3">
          <button
            onClick={submit}
            disabled={!answer.trim() || isGrading}
            className="w-full rounded-sm bg-sc-gold px-6 py-3.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGrading
              ? "Coaching…"
              : attempts.length === 0
                ? "Score my intro →"
                : `Score attempt #${attempts.length + 1} →`}
          </button>

          {/* Streaming coaching preview */}
          {isGrading && streamText && (
            <div className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-4 py-3">
              <p className="font-mono text-xs text-sc-gold mb-1.5 animate-pulse">
                Coaching…
              </p>
              <p className="font-mono text-xs text-sc-muted leading-relaxed whitespace-pre-wrap line-clamp-6">
                {streamText}
              </p>
            </div>
          )}
        </div>

        {/* ── Best attempt highlight ── */}
        {bestAttempt && (
          <div
            className={`rounded-sm border px-4 py-3 space-y-2 ${
              bestAttempt.composite >= 9
                ? "border-sc-green/40 bg-sc-green-bg"
                : bestAttempt.composite >= 7
                  ? "border-sc-gold-dim bg-sc-gold-bg"
                  : "border-sc-border bg-sc-surface"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                Best attempt (#{ bestAttempt.n})
              </span>
              <span
                className={`font-display text-lg font-semibold tabular-nums ${
                  bestAttempt.composite >= 9
                    ? "text-sc-green"
                    : bestAttempt.composite >= 7
                      ? "text-sc-gold"
                      : "text-sc-red"
                }`}
              >
                {bestAttempt.composite}
              </span>
            </div>
            {bestAttempt.sampleAnswer && (
              <div>
                <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase mb-1.5">
                  Nail this version
                </p>
                <p className="text-sm text-sc-ink leading-relaxed">
                  {renderSampleAnswer(bestAttempt.sampleAnswer)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Attempt log ── */}
        {attempts.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
              All attempts ({attempts.length})
            </p>
            {[...attempts].reverse().map((a) => (
              <AttemptRow key={a.n} attempt={a} />
            ))}
          </div>
        )}

        {/* Done state — mastered */}
        {mastered && (
          <div className="border-t border-sc-green/30 pt-6 space-y-3">
            <p className="font-display text-xl font-semibold text-sc-green">
              This intro is Kohler-ready.
            </p>
            <p className="text-sm text-sc-muted leading-relaxed">
              Three consecutive 9s. Memorize the best version tonight and
              say it out loud 5 times before you sleep.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/stagecraft"
                className="rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
              >
                Full mock session →
              </Link>
              <Link
                href="/stagecraft/drill"
                className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
              >
                Next priority drill →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
