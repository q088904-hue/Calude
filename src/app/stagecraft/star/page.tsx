"use client";

// Stagecraft — STAR Story Drill.
// Drill each of John's 5 profile stories until the telling is tight,
// specific, and Result-driven. Scores each STAR component separately.
// Mastery gate: 3 consecutive composite scores ≥ 8.5
//
// State: story-select → drilling(storyIdx) → [loop per attempt]

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Profile, StarStory } from "@/lib/stagecraft/types";
import { parseFeedbackSections } from "@/lib/stagecraft/feedbackParser";
import { renderSampleAnswer, renderWithPatternTags } from "@/lib/stagecraft/feedbackRenderers";
import { getSRClass, type SREvent, type SRInstance } from "@/lib/stagecraft/speechRecognition";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StarScores {
  situation: number;
  task: number;
  action: number;
  result: number;
  timing: "short" | "good" | "long";
}

interface Attempt {
  n: number;
  answer: string;
  wordCount: number;
  composite: number;
  content: number;
  english: number;
  delivery: number;
  star: StarScores;
  sampleAnswer: string;
  feedback: string;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

const META_RE = /\[META\](\{[\s\S]*?\})\[\/META\]/;
const STAR_RE = /\[STAR\](\{[\s\S]*?\})\[\/STAR\]/;

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

function parseStarScores(text: string): StarScores {
  const m = text.match(STAR_RE);
  if (m) {
    try {
      const p = JSON.parse(m[1]) as Partial<StarScores>;
      return {
        situation: Number(p.situation) || 0,
        task: Number(p.task) || 0,
        action: Number(p.action) || 0,
        result: Number(p.result) || 0,
        timing: p.timing ?? "good",
      };
    } catch { /* fall through */ }
  }
  return { situation: 0, task: 0, action: 0, result: 0, timing: "good" };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StarComponentBar({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
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
    <div className="flex items-center gap-2">
      <span
        className={`font-mono text-[10px] uppercase tracking-wider w-16 shrink-0 ${
          highlight ? "text-sc-red" : "text-sc-dim"
        }`}
      >
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-sc-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-bold tabular-nums w-8 text-right ${textColor}`}>
        {value}/10
      </span>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
  const [open, setOpen] = useState(false);
  const composite = attempt.composite;
  const compositeColor =
    composite >= 8.5
      ? "text-sc-green"
      : composite >= 7
        ? "text-sc-gold"
        : "text-sc-red";
  const weakComponent = Object.entries({
    S: attempt.star.situation,
    T: attempt.star.task,
    A: attempt.star.action,
    R: attempt.star.result,
  }).sort(([, a], [, b]) => a - b)[0];

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-sc-raised transition-colors text-left"
      >
        <span className="font-mono text-xs text-sc-dim w-6 shrink-0">#{attempt.n}</span>
        <span className={`font-display text-base font-semibold tabular-nums ${compositeColor} shrink-0`}>
          {composite}
        </span>
        <span className="font-mono text-xs text-sc-dim shrink-0">{attempt.wordCount}w</span>
        {/* STAR pips */}
        <div className="flex gap-1 flex-1">
          {[
            { l: "S", v: attempt.star.situation },
            { l: "T", v: attempt.star.task },
            { l: "A", v: attempt.star.action },
            { l: "R", v: attempt.star.result },
          ].map(({ l, v }) => (
            <span
              key={l}
              title={`${l}: ${v}/10`}
              className={`w-5 h-5 rounded-sm flex items-center justify-center font-mono text-[9px] font-bold ${
                v >= 8
                  ? "bg-sc-green/20 text-sc-green"
                  : v >= 6
                    ? "bg-sc-gold/20 text-sc-gold"
                    : "bg-sc-red/10 text-sc-red"
              }`}
            >
              {l}
            </span>
          ))}
        </div>
        {weakComponent && weakComponent[1] < 7 && (
          <span className="font-mono text-[10px] text-sc-red shrink-0">
            weak {weakComponent[0]}
          </span>
        )}
        <span className="font-mono text-xs text-sc-dim shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-sc-line px-4 py-4 space-y-4">
          {/* STAR component breakdown */}
          <div className="space-y-2">
            {[
              { label: "Situation", value: attempt.star.situation },
              { label: "Task", value: attempt.star.task },
              { label: "Action", value: attempt.star.action },
              { label: "Result", value: attempt.star.result, highlight: attempt.star.result < 7 },
            ].map((c) => (
              <StarComponentBar
                key={c.label}
                label={c.label}
                value={c.value}
                highlight={c.highlight}
              />
            ))}
          </div>

          {/* Timing */}
          <p className={`font-mono text-[10px] ${
            attempt.star.timing === "good"
              ? "text-sc-green"
              : "text-sc-gold"
          }`}>
            {attempt.star.timing === "short"
              ? "⚠ Too short — expand the Action"
              : attempt.star.timing === "long"
                ? "⚠ Too long — cut the Situation"
                : "✓ Good timing (60–130 words)"}
          </p>

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
                Tighter version — memorize this
              </p>
              <p className="text-sm text-sc-ink leading-relaxed">
                {renderSampleAnswer(attempt.sampleAnswer)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Story card (select view) ──────────────────────────────────────────────────

function StoryCard({
  story,
  attempts,
  streak,
  mastered,
  onDrill,
}: {
  story: StarStory;
  attempts: Attempt[];
  streak: number;
  mastered: boolean;
  onDrill: () => void;
}) {
  const best = attempts.length > 0
    ? attempts.reduce((a, b) => (a.composite >= b.composite ? a : b))
    : null;

  return (
    <div
      className={`rounded-sm border overflow-hidden transition-all ${
        mastered
          ? "border-sc-green/40 bg-sc-green-bg"
          : "border-sc-border bg-sc-surface"
      }`}
    >
      <div className="px-4 py-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-sc-ink leading-snug">
              {story.title}
            </p>
            {mastered && (
              <span className="font-mono text-[10px] text-sc-green border border-sc-green/40 rounded-sm px-1.5 py-0.5">
                ✓ Mastered
              </span>
            )}
          </div>
          {story.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {story.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-1.5 py-0.5 font-mono text-[10px] text-sc-dim"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {best && (
            <p className="font-mono text-[10px] text-sc-dim mt-2">
              Best: {best.composite} · {attempts.length} attempt{attempts.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Mastery rings */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  i < streak
                    ? "bg-sc-gold border-sc-gold"
                    : "bg-transparent border-sc-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={onDrill}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition-all ${
              mastered
                ? "border border-sc-green/40 text-sc-green hover:bg-sc-green/10"
                : "bg-sc-gold text-sc-void hover:brightness-110"
            }`}
          >
            {mastered ? "Re-drill" : attempts.length === 0 ? "Drill →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StarDrillPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Per-story attempt history (keyed by story title)
  const [allAttempts, setAllAttempts] = useState<Record<string, Attempt[]>>({});

  // Drilling state
  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [showReference, setShowReference] = useState(false);

  // Voice (Whisper MediaRecorder)
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recState, setRecState] = useState<"idle" | "recording" | "uploading" | "transcribed">(
    "idle",
  );
  const [recError, setRecError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"voice" | "type">("voice");

  // Web Speech API (instant, browser-native)
  const srRef = useRef<SRInstance | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [browserRecording, setBrowserRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [srSeconds, setSrSeconds] = useState(0);
  const srTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/stagecraft/profile", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<Profile>;
      })
      .then(setProfile)
      .catch((e) => setProfileError(String(e)))
      .finally(() => setLoading(false));
  }, []);

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

  const activeStory =
    activeStoryIdx !== null ? profile?.starStories[activeStoryIdx] ?? null : null;

  const storyAttempts = activeStory
    ? (allAttempts[activeStory.title] ?? [])
    : [];

  // Streak for the active story
  const activeStreak = (() => {
    let s = 0;
    for (let i = storyAttempts.length - 1; i >= 0; i--) {
      if (storyAttempts[i].composite >= 8.5) s++;
      else break;
    }
    return Math.min(s, 3);
  })();

  const activeMastered = activeStreak >= 3;

  // Per-story streak + mastery
  function storyStreak(story: StarStory): number {
    const attempts = allAttempts[story.title] ?? [];
    let s = 0;
    for (let i = attempts.length - 1; i >= 0; i--) {
      if (attempts[i].composite >= 8.5) s++;
      else break;
    }
    return Math.min(s, 3);
  }

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
        fd.append("audio", blob, "story.webm");
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

  const toggleBrowserVoice = useCallback(() => {
    const SR = getSRClass();
    if (!SR) return;
    if (browserRecording) {
      srRef.current?.stop();
      return;
    }
    setAnswer("");
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
          setAnswer(final);
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

  // ── Submit ───────────────────────────────────────────────────────────────

  const submit = useCallback(async () => {
    if (!answer.trim() || isGrading || !activeStory) return;
    setIsGrading(true);
    setStreamText("");

    const wordCount = countWords(answer);

    try {
      const res = await fetch("/api/stagecraft/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer,
          wordCount,
          storyTitle: activeStory.title,
          storyReference: {
            situation: activeStory.situation,
            task: activeStory.task,
            action: activeStory.action,
            result: activeStory.result,
          },
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
      const star = parseStarScores(acc);
      const sections = parseFeedbackSections(acc);
      const composite = +((scores.content + scores.english + scores.delivery) / 3).toFixed(1);
      const prevAttempts = allAttempts[activeStory.title] ?? [];

      const attempt: Attempt = {
        n: prevAttempts.length + 1,
        answer,
        wordCount,
        composite,
        ...scores,
        star,
        sampleAnswer: sections?.sampleAnswer ?? "",
        feedback: acc,
      };

      setAllAttempts((prev) => ({
        ...prev,
        [activeStory.title]: [...(prev[activeStory.title] ?? []), attempt],
      }));

      setAnswer("");
      setRecState("idle");
      setBrowserRecording(false);
      setInterimText("");
      setStreamText("");
    } catch (err) {
      setStreamText(`[error: ${String(err)}]`);
    } finally {
      setIsGrading(false);
    }
  }, [answer, isGrading, activeStory, allAttempts]);

  // ── Render ────────────────────────────────────────────────────────────────

  const wordCount = countWords(answer);

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <header className="border-b border-sc-border px-6 py-4 flex items-center justify-between sticky top-0 bg-sc-bg z-10">
        <div className="flex items-center gap-3">
          {activeStoryIdx !== null ? (
            <>
              <button
                type="button"
                onClick={() => {
                  srRef.current?.stop();
                  setBrowserRecording(false);
                  setInterimText("");
                  setActiveStoryIdx(null);
                  setAnswer("");
                  setStreamText("");
                  setRecState("idle");
                  setRecError(null);
                  setShowReference(false);
                }}
                className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
              >
                ← Stories
              </button>
              <span className="text-sc-border text-xs">·</span>
              <span className="font-display text-base font-semibold text-sc-ink truncate max-w-48">
                {activeStory?.title}
              </span>
            </>
          ) : (
            <>
              <Link
                href="/stagecraft"
                className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
              >
                ← Stagecraft
              </Link>
              <span className="text-sc-border text-xs">·</span>
              <span className="font-display text-base font-semibold text-sc-ink">
                STAR Stories
              </span>
            </>
          )}
        </div>

        {/* Mastery progress or streak */}
        {activeStoryIdx !== null && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-sc-dim uppercase tracking-wider">
              Mastery
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-all ${
                    i < activeStreak
                      ? "bg-sc-gold border-sc-gold"
                      : "bg-transparent border-sc-border"
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] text-sc-dim">8.5+</span>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* ── Story Select View ── */}
        {activeStoryIdx === null && (
          <>
            <div>
              <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
                Behavioral stories
              </p>
              <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
                Drill your STAR stories.
              </h1>
              <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
                Tell each story out loud without reading your notes. The coach
                scores all four components — and is especially strict on the
                Result. Three consecutive 8.5+ = mastered.
              </p>
            </div>

            {/* Result reminder */}
            <div className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-3.5">
              <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase mb-1.5">
                The Result rule
              </p>
              <p className="text-sm text-sc-ink leading-relaxed">
                Every story Result must name a <strong>specific number</strong>,
                percentage, timeline delta, or named outcome — not "it went well"
                or "the client was happy." A Result without a specific outcome
                scores 3/10.
              </p>
            </div>

            {loading ? (
              <p className="font-mono text-xs text-sc-dim animate-pulse">
                Loading stories…
              </p>
            ) : profileError ? (
              <div className="rounded-sm border border-sc-red/40 bg-sc-red/10 px-4 py-3 text-sm text-sc-red font-mono">
                {profileError}
                <Link
                  href="/stagecraft/profile"
                  className="block mt-2 text-sc-dim hover:text-sc-gold"
                >
                  → Add stories in Profile
                </Link>
              </div>
            ) : !profile?.starStories?.length ? (
              <div className="rounded-sm border border-dashed border-sc-border p-8 text-center space-y-3">
                <p className="font-mono text-xs text-sc-dim">No stories yet</p>
                <p className="text-sm text-sc-muted">
                  Add your STAR stories in the Profile editor.
                </p>
                <Link
                  href="/stagecraft/profile"
                  className="inline-block rounded-sm bg-sc-gold px-4 py-2 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
                >
                  Edit profile →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.starStories.map((story, i) => {
                  const streak = storyStreak(story);
                  const mastered = streak >= 3;
                  return (
                    <StoryCard
                      key={i}
                      story={story}
                      attempts={allAttempts[story.title] ?? []}
                      streak={streak}
                      mastered={mastered}
                      onDrill={() => {
                        srRef.current?.stop();
                        setBrowserRecording(false);
                        setInterimText("");
                        setActiveStoryIdx(i);
                        setAnswer("");
                        setStreamText("");
                        setRecState("idle");
                        setRecError(null);
                        setShowReference(false);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Drilling View ── */}
        {activeStoryIdx !== null && activeStory && (
          <>
            {/* Story context toggle */}
            <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReference((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-sc-raised transition-colors"
              >
                <span className="font-mono text-xs text-sc-dim">
                  {showReference ? "Hide" : "Show"} story reference
                </span>
                <span className="font-mono text-xs text-sc-dim">
                  {showReference ? "▲" : "▼"}
                </span>
              </button>
              {showReference && (
                <div className="border-t border-sc-line px-4 py-4 space-y-3 bg-sc-raised">
                  {[
                    { label: "Situation", value: activeStory.situation },
                    { label: "Task", value: activeStory.task },
                    { label: "Action", value: activeStory.action },
                    { label: "Result ⚡", value: activeStory.result },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1">
                        {label}
                      </p>
                      <p className="text-sm text-sc-muted leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mastered banner */}
            {activeMastered && (
              <div className="rounded-sm border border-sc-green/40 bg-sc-green-bg px-4 py-3.5">
                <p className="font-display text-base font-semibold text-sc-green">
                  Mastered. ✓
                </p>
                <p className="text-sm text-sc-muted mt-1">
                  Three consecutive 8.5+. This story is ready for the Kohler room.
                  Keep drilling to stay sharp, or pick another story.
                </p>
              </div>
            )}

            {/* Input area */}
            <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden focus-within:border-sc-gold-dim transition-colors">
              {/* Mode tabs */}
              <div className="flex border-b border-sc-line">
                {(["voice", "type"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setInputMode(m)}
                    className={`flex-1 py-2.5 font-mono text-xs transition-colors ${
                      inputMode === m
                        ? "bg-sc-raised text-sc-gold"
                        : "text-sc-dim hover:text-sc-ink"
                    }`}
                  >
                    {m === "voice" ? "⏺ Voice" : "⌨ Type"}
                  </button>
                ))}
              </div>

              <textarea
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  if (recState === "transcribed") setRecState("idle");
                }}
                placeholder={
                  inputMode === "voice"
                    ? "Press Record and tell the story without reading your notes…"
                    : "Tell the story as you would say it in an interview…"
                }
                rows={5}
                disabled={isGrading}
                className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none resize-none leading-relaxed disabled:opacity-50"
              />
              <div className="px-4 pb-3 flex items-center justify-end gap-3">
                <span className="font-mono text-[10px] text-sc-dim">
                  {wordCount} words
                </span>
                <span
                  className={`font-mono text-[10px] ${
                    wordCount === 0
                      ? "text-sc-dim"
                      : wordCount < 60
                        ? "text-sc-red"
                        : wordCount <= 130
                          ? "text-sc-green"
                          : "text-sc-gold"
                  }`}
                >
                  {wordCount === 0
                    ? "60–130 words ideal"
                    : wordCount < 60
                      ? "Too short"
                      : wordCount <= 130
                        ? "✓ Good length"
                        : "Too long — trim the Situation"}
                </span>
              </div>

              {/* Voice controls */}
              {inputMode === "voice" && (
                <div className="border-t border-sc-line px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Browser voice — instant, no upload */}
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
                    {/* Live timer while recording */}
                    {browserRecording && (
                      <div className="flex items-baseline gap-2">
                        <span className={`font-mono text-base font-semibold tabular-nums ${srSeconds >= 90 ? "text-sc-red" : srSeconds >= 60 ? "text-sc-gold" : "text-sc-green"}`}>
                          {String(Math.floor(srSeconds / 60)).padStart(1, "0")}:{String(srSeconds % 60).padStart(2, "0")}
                        </span>
                        {srSeconds >= 90 ? (
                          <span className="font-mono text-[10px] text-sc-red">— too long</span>
                        ) : srSeconds >= 60 ? (
                          <span className="font-mono text-[10px] text-sc-gold">— start closing</span>
                        ) : (
                          <span className="font-mono text-[10px] text-sc-dim animate-pulse">listening…</span>
                        )}
                      </div>
                    )}

                    {/* Divider */}
                    {speechSupported && recState !== "uploading" && !browserRecording && (
                      <span className="font-mono text-[10px] text-sc-border">or</span>
                    )}

                    {/* Whisper fallback */}
                    {!browserRecording && (
                      recState === "idle" || recState === "transcribed" ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={isGrading}
                          className="flex items-center gap-1.5 rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-3 py-2 font-mono text-xs text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors disabled:opacity-40"
                        >
                          <span className="text-sc-red">⏺</span>
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

                  {/* Interim transcript preview */}
                  {interimText && (
                    <p className="font-mono text-[10px] text-sc-muted italic leading-relaxed">
                      {interimText}…
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
                  ? "Scoring…"
                  : storyAttempts.length === 0
                    ? "Score my story →"
                    : `Score attempt #${storyAttempts.length + 1} →`}
              </button>

              {/* Stream preview */}
              {isGrading && streamText && (
                <div className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-4 py-3">
                  <p className="font-mono text-xs text-sc-gold mb-1.5 animate-pulse">
                    Coaching…
                  </p>
                  <p className="font-mono text-xs text-sc-muted leading-relaxed whitespace-pre-wrap line-clamp-5">
                    {streamText}
                  </p>
                </div>
              )}
            </div>

            {/* Best sample answer */}
            {storyAttempts.length > 0 && (() => {
              const best = storyAttempts.reduce((a, b) =>
                a.composite >= b.composite ? a : b,
              );
              if (!best.sampleAnswer) return null;
              return (
                <div
                  className={`rounded-sm border px-4 py-4 space-y-2 ${
                    best.composite >= 8.5
                      ? "border-sc-gold-dim bg-sc-gold-bg"
                      : "border-sc-border bg-sc-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
                      Best version (#{best.n} · {best.composite})
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        best.star.result >= 8 ? "text-sc-green" : "text-sc-red"
                      }`}
                    >
                      R: {best.star.result}/10
                    </span>
                  </div>
                  <p className="text-sm text-sc-ink leading-relaxed">
                    {renderSampleAnswer(best.sampleAnswer)}
                  </p>
                </div>
              );
            })()}

            {/* Attempt log */}
            {storyAttempts.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                  Attempts ({storyAttempts.length})
                </p>
                {[...storyAttempts].reverse().map((a) => (
                  <AttemptRow key={a.n} attempt={a} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
