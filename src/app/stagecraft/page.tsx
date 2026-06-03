"use client";

// Stagecraft v0 — voice-first interview practice loop.
// One client component drives the whole flow: setup -> warm-up -> question
// loop -> simple report. Mic input via MediaRecorder, transcribed by
// /api/stagecraft/transcribe, graded + coached by /api/stagecraft/grade
// (streamed).

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { HistoryPayload } from "@/app/api/stagecraft/history/route";
import {
  parseFeedbackSections,
  parseFeedbackSectionsStreaming,
  type FeedbackSections,
} from "@/lib/stagecraft/feedbackParser";
import {
  renderWithPatternTags,
  renderSampleAnswer,
} from "@/lib/stagecraft/feedbackRenderers";
import { SessionReportView } from "@/lib/stagecraft/SessionReportView";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { pickQuestion } from "@/lib/stagecraft/questionBank";
import { extractSampleAnswer } from "@/lib/stagecraft/extract";
import type {
  Difficulty,
  FocusMode,
  QAItem,
  Round,
  SessionConfig,
} from "@/lib/stagecraft/types";
import {
  COMPANY_PACKS,
  getPackById,
  type CompanyPack,
} from "@/lib/stagecraft/companyPacks";

import {
  getSRClass,
  type SREvent,
  type SRInstance,
} from "@/lib/stagecraft/speechRecognition";
import { GooeyText } from "@/components/stagecraft/GooeyText";
import { NavDropdown } from "@/components/stagecraft/NavDropdown";
import { OnboardingProgress } from "@/components/stagecraft/OnboardingProgress";
import { ScrollReveal } from "@/components/stagecraft/ScrollReveal";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

type Stage = "setup" | "warmup" | "question" | "report";

type RecorderState = "idle" | "recording" | "uploading" | "transcribed";

interface CurrentQuestion {
  index: number;
  round: Round;
  question: string;
}

const ROUND_OPTIONS: { value: Round; label: string }[] = [
  { value: "hr", label: "HR / Screening" },
  { value: "hiring-manager", label: "Hiring Manager" },
  { value: "portfolio", label: "Portfolio / Creative Director" },
  { value: "leadership", label: "Leadership / CXO" },
  { value: "stress", label: "Curveball / Stress" },
  { value: "mixed", label: "Mixed mock" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "warm-up", label: "Warm-up" },
  { value: "realistic", label: "Realistic" },
  { value: "tough", label: "Tough" },
];

// ── Priority drills — the five must-nail questions ────────────────────────────
// These are the questions John will face in a Kohler-tier senior interview.
// Curated so he can drill any of them in one tap without typing.

const PRIORITY_DRILLS: {
  question: string;
  tag: string;
  risk?: true; // marks the #1 risk question
}[] = [
  {
    question: "Tell me about yourself.",
    tag: "Every interview — nail this first",
  },
  {
    question:
      "Why are you looking to move after 18 years at Datamatics?",
    tag: "Your #1 risk question",
    risk: true,
  },
  {
    question: "Why Kohler? What draws you to this role specifically?",
    tag: "Brand fit + motivation",
  },
  {
    question:
      "Walk me through the AI pipeline you built — what problem did it solve, and what did it change?",
    tag: "Your strongest differentiator",
  },
  {
    question:
      "Tell me about a time you had to lead a team through a major creative direction change.",
    tag: "STAR — leadership under pressure",
  },
];

function roundLabel(r: Round) {
  return ROUND_OPTIONS.find((o) => o.value === r)?.label ?? r;
}

function newSessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Parser: pull strict META JSON from feedback, fall back to regex if absent.
const META_RE = /\[META\](\{[\s\S]*?\})\[\/META\]/;

function parseFeedback(text: string): {
  content: number;
  english: number;
  delivery: number;
  patterns: string[];
} {
  const m = text.match(META_RE);
  if (m) {
    try {
      const parsed = JSON.parse(m[1]) as {
        content?: number;
        english?: number;
        delivery?: number;
        patterns?: string[];
      };
      return {
        content: Number(parsed.content) || 0,
        english: Number(parsed.english) || 0,
        delivery: Number(parsed.delivery) || 0,
        patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      };
    } catch {
      /* fall through to regex */
    }
  }
  const grab = (label: string) => {
    const re = new RegExp(`${label}\\s*:\\s*(\\d+)\\s*\\/\\s*10`, "i");
    const hit = text.match(re);
    return hit ? Number(hit[1]) : 0;
  };
  return {
    content: grab("Content"),
    english: grab("English"),
    delivery: grab("Delivery"),
    patterns: [],
  };
}

// Strip the META footer from text shown to the user.
function stripMeta(text: string): string {
  return text.replace(META_RE, "").trimEnd();
}

export default function StagecraftPage() {
  return (
    <Suspense fallback={<StagecraftFallback />}>
      <StagecraftInner />
    </Suspense>
  );
}

function StagecraftFallback() {
  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg flex items-center justify-center">
      <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
        Loading…
      </p>
    </div>
  );
}

function StagecraftInner() {
  const searchParams = useSearchParams();

  // ----- Session config (setup) ------------------------------------------
  const [stage, setStage] = useState<Stage>("setup");
  const [companyPackId, setCompanyPackId] = useState<string>("kohler-india");
  const [targetRole, setTargetRole] = useState(
    () => getPackById("kohler-india")?.label ?? "Creative Director — Kohler India",
  );
  const [round, setRound] = useState<Round>("mixed");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("realistic");
  const [focus, setFocus] = useState<FocusMode>(null);
  const [sessionId, setSessionId] = useState<string>("");
  // Drill mode: when set, every question in this session uses this exact text
  // and the loop ends early when the last 3 attempts all score >= 8 average.
  const [drillQuestion, setDrillQuestion] = useState<string>("");

  // ----- Mic / transcription state --------------------------------------
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // ----- Browser Web Speech (instant STT) -----------------------------------
  const srRef = useRef<SRInstance | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [browserRecording, setBrowserRecording] = useState(false);
  const [interimText, setInterimText] = useState("");

  // ----- Question loop state --------------------------------------------
  const [current, setCurrent] = useState<CurrentQuestion | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackStreaming, setFeedbackStreaming] = useState(false);
  const [items, setItems] = useState<QAItem[]>([]);
  // Question-index -> blob URL for replay. In-memory only (does not survive reload).
  const [audioByIndex, setAudioByIndex] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  // LLM session report state
  const [aiReport, setAiReport] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  // Question indices that have been added to the memorize queue this session.
  const [memorizedIndices, setMemorizedIndices] = useState<Set<number>>(
    () => new Set(),
  );

  // Memorize queue count — fetched once on mount for nav badge

  // Detect Web Speech support on mount
  useEffect(() => {
    setSpeechSupported(getSRClass() !== null);
    return () => {
      srRef.current?.stop();
      srRef.current = null;
    };
  }, []);

  // Answer input mode — voice (mic + Whisper) or type (textarea, no transcription)
  const [answerMode, setAnswerMode] = useState<"voice" | "type">("voice");

  // Interviewer voice — when on, each new question is auto-read aloud via TTS
  // before John can answer. Trains listening under real interview conditions.
  const [interviewerVoice, setInterviewerVoice] = useState(false);
  const { speaking: ivSpeaking, speak: ivSpeak, stop: ivStop } = useSpeech();

  // Auto-speak the question whenever it changes and interviewer voice is on.
  // Deps: only `current?.question` — we intentionally skip `interviewerVoice`
  // so toggling mid-session doesn't re-fire.
  useEffect(() => {
    if (interviewerVoice && current?.question && stage === "question") {
      ivSpeak(current.question);
    }
    return () => {
      ivStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.question, stage]);

  // Switch mode and clear any in-progress answer so state is clean.
  const switchAnswerMode = useCallback(
    (mode: "voice" | "type") => {
      srRef.current?.stop();
      setBrowserRecording(false);
      setInterimText("");
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setAnswerMode(mode);
      setTranscript("");
      setAudioUrl("");
      setRecorderState("idle");
    },
    [],
  );

  const toggleBrowserVoice = useCallback(() => {
    if (browserRecording) {
      srRef.current?.stop();
      setBrowserRecording(false);
      setInterimText("");
      return;
    }
    const SR = getSRClass();
    if (!SR) return;
    const sr = new SR();
    sr.lang = "en-IN";
    sr.continuous = true;
    sr.interimResults = true;
    let final = "";
    sr.onresult = (e: SREvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final = final ? final.trimEnd() + " " + seg.trimStart() : seg;
        } else {
          interim += seg;
        }
      }
      setInterimText(interim);
      if (final) setTranscript(final);
    };
    sr.onend = () => {
      setBrowserRecording(false);
      setInterimText("");
    };
    sr.onerror = () => {
      setBrowserRecording(false);
      setInterimText("");
    };
    srRef.current = sr;
    sr.start();
    setBrowserRecording(true);
    setTranscript("");
    setInterimText("");
  }, [browserRecording]);

  // Persona / round labels for the current question
  const currentRoundLabel = current ? roundLabel(current.round) : "";

  // ----- Helpers --------------------------------------------------------
  const askedQuestions = useMemo(() => items.map((i) => i.question), [items]);

  const config: SessionConfig = useMemo(
    () => ({ targetRole, round, questionCount, difficulty, focus }),
    [targetRole, round, questionCount, difficulty, focus],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecorderState("recording");
    } catch {
      setError(
        "Microphone blocked. Your browser denied access — check your site settings and try again.",
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
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    const fd = new FormData();
    fd.set("audio", blob, "answer.webm");

    try {
      const res = await fetch("/api/stagecraft/transcribe", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        await res.text();
        throw new Error(
          "Transcription failed. The audio didn't come through — re-record or type your answer.",
        );
      }
      const json = (await res.json()) as { text: string };
      setTranscript(json.text || "");
      setRecorderState("transcribed");
    } catch (err) {
      setError(String(err));
      setRecorderState("idle");
    }
  }, []);

  // ----- Stage transitions ---------------------------------------------
  const startSession = useCallback(async () => {
    const id = newSessionId();
    setSessionId(id);
    await fetch("/api/stagecraft/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", id, config }),
    });
    setStage("warmup");
    setRecorderState("idle");
    setTranscript("");
  }, [config]);

  const finishWarmup = useCallback(async () => {
    srRef.current?.stop();
    setBrowserRecording(false);
    setInterimText("");
    // Persist warm-up transcript on session, but no scoring.
    if (transcript) {
      await fetch("/api/stagecraft/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          id: sessionId,
          config,
          warmUp: { transcript },
        }),
      });
    }
    // Pick first question. Drill mode forces the same question every iteration.
    if (drillQuestion) {
      setCurrent({ index: 1, round: "mixed", question: drillQuestion });
    } else {
      const first = pickQuestion({
        round,
        index: 1,
        total: questionCount,
        alreadyAsked: [],
        difficulty,
      });
      setCurrent({ index: 1, round: first.round, question: first.question });
    }
    setStage("question");
    setRecorderState("idle");
    setTranscript("");
    setFeedback("");
  }, [
    config,
    difficulty,
    drillQuestion,
    questionCount,
    round,
    sessionId,
    transcript,
  ]);

  const submitAnswer = useCallback(async () => {
    if (!current) return;
    setFeedback("");
    setFeedbackStreaming(true);
    setError(null);
    try {
      // Build targetContext: prefer full pack brief, fall back to targetRole string.
      const activePack = companyPackId ? getPackById(companyPackId) : null;
      const targetContext = activePack
        ? activePack.brandBrief
        : targetRole !== "Creative Director — generic"
          ? `SESSION CONTEXT: The candidate is interviewing for the role: ${targetRole}. Tailor sample answers and coaching to this specific context.`
          : undefined;

      const res = await fetch("/api/stagecraft/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: current.question,
          answer: transcript,
          round: current.round,
          questionIndex: current.index,
          totalQuestions: questionCount,
          focus,
          difficulty,
          targetContext,
        }),
      });
      if (!res.ok || !res.body) {
        await res.text();
        throw new Error(
          "Couldn't get coaching. The server returned an error — tap Submit to try again.",
        );
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setFeedback(acc);
      }
      setFeedbackStreaming(false);

      const parsed = parseFeedback(acc);
      const item: QAItem = {
        index: current.index,
        round: current.round,
        question: current.question,
        answer: transcript,
        feedback: acc,
        scores: {
          content: parsed.content,
          english: parsed.english,
          delivery: parsed.delivery,
        },
        patterns: parsed.patterns,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => [...prev, item]);
      if (audioUrl) {
        setAudioByIndex((prev) => ({ ...prev, [current.index]: audioUrl }));
      }
      await fetch("/api/stagecraft/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "appendItem", id: sessionId, item }),
      });
    } catch (err) {
      setError(String(err));
      setFeedbackStreaming(false);
    }
  }, [companyPackId, current, difficulty, focus, questionCount, sessionId, targetRole, transcript]);

  const memorizeCurrent = useCallback(async () => {
    if (!current) return;
    const sample = extractSampleAnswer(feedback);
    if (!sample) {
      setError(
        "No sample answer found. The coaching response was in an unexpected format — retry the question.",
      );
      return;
    }
    try {
      const res = await fetch("/api/stagecraft/memorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          question: current.question,
          answer: sample,
          sourceSessionId: sessionId,
          sourceQuestionIndex: current.index,
        }),
      });
      if (!res.ok) {
        await res.text();
        throw new Error(
          "Couldn't save to queue. Check your connection and tap Memorize again.",
        );
      }
      setMemorizedIndices((prev) => {
        const next = new Set(prev);
        next.add(current.index);
        return next;
      });
    } catch (err) {
      setError(String(err));
    }
  }, [current, feedback, sessionId]);

  const retryQuestion = useCallback(() => {
    srRef.current?.stop();
    setBrowserRecording(false);
    setInterimText("");
    // Keep the same current question and answer mode. Clear answer + feedback
    // so the user can re-attempt after seeing the sample answer.
    setRecorderState("idle");
    setTranscript("");
    setAudioUrl("");
    setFeedback("");
  }, []);

  const generateAiReport = useCallback(async () => {
    if (!sessionId) return;
    setReportLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stagecraft/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          targetRole,
          round,
        }),
      });
      if (!res.ok || !res.body) {
        await res.text();
        throw new Error(
          "Report generation failed. Something went wrong — click Generate to try again.",
        );
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAiReport(acc);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setReportLoading(false);
    }
  }, [round, sessionId, targetRole]);

  const nextQuestion = useCallback(() => {
    if (!current) return;

    // Drill mode: stop early once the last 3 attempts all average >= 8.
    if (drillQuestion && items.length >= 3) {
      const lastThree = items.slice(-3);
      const allStrong = lastThree.every((it) => {
        const avg =
          (it.scores.content + it.scores.english + it.scores.delivery) / 3;
        return avg >= 8;
      });
      if (allStrong) {
        // Record practice day + bump today's session count
        recordPracticeDay();
        const today = new Date().toDateString();
        if (typeof window !== "undefined") {
          localStorage.setItem(SESSION_DATE_KEY, today);
          localStorage.setItem(SESSION_TODAY_KEY, String(getTodaySessionCount() + 1));
        }
        setStage("report");
        return;
      }
    }

    if (current.index >= questionCount) {
      // Record practice day + bump today's session count
      recordPracticeDay();
      const today = new Date().toDateString();
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_DATE_KEY, today);
        localStorage.setItem(SESSION_TODAY_KEY, String(getTodaySessionCount() + 1));
      }
      setStage("report");
      return;
    }

    if (drillQuestion) {
      setCurrent({
        index: current.index + 1,
        round: "mixed",
        question: drillQuestion,
      });
    } else {
      const next = pickQuestion({
        round,
        index: current.index + 1,
        total: questionCount,
        alreadyAsked: askedQuestions,
        difficulty,
      });
      setCurrent({
        index: current.index + 1,
        round: next.round,
        question: next.question,
      });
    }
    srRef.current?.stop();
    setBrowserRecording(false);
    setInterimText("");
    setRecorderState("idle");
    setTranscript("");
    setFeedback("");
    setAudioUrl("");
  }, [
    askedQuestions,
    current,
    difficulty,
    drillQuestion,
    items,
    questionCount,
    round,
  ]);

  // ----- Cleanup mic on unmount ----------------------------------------
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ----- Auto-generate report when session ends ------------------------
  // Fires once when stage flips to "report" and there are graded items.
  useEffect(() => {
    if (stage === "report" && sessionId && items.length > 0 && !aiReport && !reportLoading) {
      void generateAiReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ----- Pick up ?drill=<question> from URL on mount -------------------
  useEffect(() => {
    const q = searchParams.get("drill");
    if (q && !drillQuestion) {
      setDrillQuestion(q);
      setQuestionCount(5);
      setRound("mixed");
      setDifficulty("realistic");
    }
  }, [searchParams, drillQuestion]);

  // ----- Pick up ?round=<round> from URL on mount (history "weakest" link) ---
  useEffect(() => {
    const r = searchParams.get("round");
    const validRounds: Round[] = ["hr", "hiring-manager", "portfolio", "leadership", "stress", "mixed"];
    if (r && (validRounds as string[]).includes(r)) {
      setRound(r as Round);
    }
    const f = searchParams.get("focus");
    const validFocus: Exclude<FocusMode, null>[] = ["grammar", "confidence", "brevity"];
    if (f && (validFocus as string[]).includes(f)) {
      setFocus(f as FocusMode);
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Pick up ?company=<id> from URL on mount (deep-dive CTA) -------
  useEffect(() => {
    const company = searchParams.get("company");
    if (company) {
      const pack = getPackById(company);
      if (pack) {
        setCompanyPackId(pack.id);
        setTargetRole(pack.label);
      }
    }
    // Only on mount — don't re-run when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Derived report values -----------------------------------------
  const averages = useMemo(() => {
    if (items.length === 0)
      return { content: 0, english: 0, delivery: 0, n: 0 };
    const sum = items.reduce(
      (acc, it) => {
        acc.content += it.scores.content;
        acc.english += it.scores.english;
        acc.delivery += it.scores.delivery;
        return acc;
      },
      { content: 0, english: 0, delivery: 0 },
    );
    return {
      content: +(sum.content / items.length).toFixed(1),
      english: +(sum.english / items.length).toFixed(1),
      delivery: +(sum.delivery / items.length).toFixed(1),
      n: items.length,
    };
  }, [items]);

  const patternCounts = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const it of items) {
      for (const p of it.patterns) {
        const arr = map.get(p) ?? [];
        arr.push(it.index);
        map.set(p, arr);
      }
    }
    return Array.from(map.entries())
      .filter(([, idx]) => idx.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  // ----- UI -------------------------------------------------------------
  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Top chrome */}
      <header className="border-b border-sc-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors min-h-[36px] inline-flex items-center"
          >
            ← Home
          </Link>
          <span className="text-sc-border">·</span>
          {/* Wordmark */}
          <span className="font-display text-base font-semibold tracking-tight text-sc-ink">
            Stagecraft
          </span>
          {stage !== "setup" && (
            <span className="font-mono text-xs text-sc-dim uppercase tracking-widest">
              {stage === "warmup"
                ? "warm-up"
                : stage === "question" && current
                  ? `${current.index} / ${questionCount}`
                  : "report"}
            </span>
          )}
          {/* Interviewer voice toggle — only visible during question loop */}
          {stage === "question" && (
            <button
              type="button"
              onClick={() => {
                if (interviewerVoice) ivStop();
                setInterviewerVoice((v) => !v);
              }}
              title={interviewerVoice ? "Interviewer voice on — click to mute" : "Click to hear questions read aloud"}
              className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-xs transition-all ${
                interviewerVoice
                  ? "border-sc-gold bg-sc-gold-bg text-sc-gold"
                  : "border-sc-border bg-sc-surface text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold"
              }`}
            >
              {/* Speaker icon */}
              <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                {interviewerVoice ? (
                  <path d="M9 1L4 5H1a1 1 0 00-1 1v4a1 1 0 001 1h3l5 4V1zM11.5 4.5a5 5 0 010 7M13.5 2.5a8 8 0 010 11" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                ) : (
                  <path d="M9 1L4 5H1a1 1 0 00-1 1v4a1 1 0 001 1h3l5 4V1z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                )}
              </svg>
              <span>{interviewerVoice ? "Voice on" : "Voice off"}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <NavDropdown />
          <AnimatedThemeToggler className="ml-2 shrink-0" />
        </div>
      </header>

      {/* Progress bar (question stage only) */}
      {stage === "question" && current && (
        <div className="h-px bg-sc-border w-full">
          <div
            className="h-full bg-sc-gold transition-all duration-500"
            style={{
              width: `${((current.index - 1) / questionCount) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Running score strip — visible after 1+ answered questions */}
      {stage === "question" && items.length > 0 && (
        <SessionScoreStrip items={items} />
      )}

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-6 py-10">
        {error ? (
          <div className="mb-6 rounded border border-sc-red/40 bg-sc-red/10 px-4 py-3 text-sm text-sc-red font-mono">
            {error}
          </div>
        ) : null}

        {stage === "setup" ? (
          <SetupView
            targetRole={targetRole}
            setTargetRole={setTargetRole}
            companyPackId={companyPackId}
            setCompanyPackId={(id) => {
              setCompanyPackId(id);
              // Auto-fill targetRole from pack label
              const pack = getPackById(id);
              if (pack) setTargetRole(pack.label);
            }}
            round={round}
            setRound={setRound}
            questionCount={questionCount}
            setQuestionCount={setQuestionCount}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            focus={focus}
            setFocus={setFocus}
            drillQuestion={drillQuestion}
            setDrillQuestion={setDrillQuestion}
            onStart={startSession}
          />
        ) : null}

        {stage === "warmup" ? (
          <WarmupView
            recorderState={recorderState}
            transcript={transcript}
            answerMode={answerMode}
            onStart={startRecording}
            onStop={stopAndTranscribe}
            onContinue={finishWarmup}
            onModeChange={switchAnswerMode}
            onTypeAnswer={setTranscript}
            speechSupported={speechSupported}
            browserRecording={browserRecording}
            interimText={interimText}
            onBrowserVoice={toggleBrowserVoice}
          />
        ) : null}

        {stage === "question" && current ? (
          <QuestionView
            index={current.index}
            total={questionCount}
            roundLabel={currentRoundLabel}
            question={current.question}
            recorderState={recorderState}
            transcript={transcript}
            audioUrl={audioUrl}
            feedback={feedback}
            feedbackStreaming={feedbackStreaming}
            memorized={memorizedIndices.has(current.index)}
            answerMode={answerMode}
            interviewerSpeaking={ivSpeaking}
            onStartRec={startRecording}
            onStopRec={stopAndTranscribe}
            onSubmit={submitAnswer}
            onNext={nextQuestion}
            onRetry={retryQuestion}
            onMemorize={memorizeCurrent}
            onModeChange={switchAnswerMode}
            onTypeAnswer={setTranscript}
            isLast={current.index >= questionCount}
            speechSupported={speechSupported}
            browserRecording={browserRecording}
            interimText={interimText}
            onBrowserVoice={toggleBrowserVoice}
          />
        ) : null}

        {stage === "report" ? (
          <ReportView
            targetRole={targetRole}
            round={roundLabel(round)}
            averages={averages}
            patternCounts={patternCounts}
            items={items}
            audioByIndex={audioByIndex}
            aiReport={aiReport}
            reportLoading={reportLoading}
            onGenerateReport={generateAiReport}
            onRestart={() => {
              setStage("setup");
              setItems([]);
              setAudioByIndex({});
              setCurrent(null);
              setFeedback("");
              setTranscript("");
              setAudioUrl("");
              setAiReport("");
              setSessionId("");
              setMemorizedIndices(new Set());
              setDrillQuestion("");
              // Keep companyPackId — user likely practices the same target
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

// =====================================================================
// Time-based nav — "how much time do you have?"
// =====================================================================

function TimeNav() {
  return (
    <div className="mb-6 sc-entry sc-e2">
      <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-2">
        How much time?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            {
              time: "5 min",
              label: "Quick Fire",
              desc: "One question",
              href: "/stagecraft/quickfire",
              accent: false,
            },
            {
              time: "15 min",
              label: "Drill",
              desc: "Nail one answer",
              href: "/stagecraft/drill",
              accent: false,
            },
            {
              time: "30 min",
              label: "Full mock",
              desc: "6 questions",
              href: "#start-session",
              accent: true,
            },
          ] as const
        ).map(({ time, label, desc, href, accent }) => (
          <Link
            key={time}
            href={href}
            className={`rounded-sm border px-3 py-3 flex flex-col gap-1 transition-all ${
              accent
                ? "border-sc-gold-dim bg-sc-gold-bg hover:bg-sc-gold/20"
                : "border-sc-border bg-sc-surface hover:border-sc-gold-dim"
            }`}
          >
            <span className={`font-mono text-xs font-semibold ${accent ? "text-sc-gold" : "text-sc-muted"}`}>
              {time}
            </span>
            <span className="text-xs font-medium text-sc-ink">{label}</span>
            <span className="font-mono text-xs text-sc-dim">{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// Daily practice tracker — streak + today's activity
// =====================================================================

const STREAK_DATES_KEY = "sc_streak_dates";
const SESSION_DATE_KEY = "sc_session_last_date";
const SESSION_TODAY_KEY = "sc_session_today_count";

/** Persist a practice day and return the current streak (consecutive days). */
function recordPracticeDay(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toDateString();
  const raw = localStorage.getItem(STREAK_DATES_KEY);
  const dates: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  if (!dates.includes(today)) dates.push(today);
  // Keep last 60 days only
  const trimmed = dates.slice(-60);
  localStorage.setItem(STREAK_DATES_KEY, JSON.stringify(trimmed));
  return computeStreak(trimmed);
}

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  let streak = 0;
  const now = new Date();
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = new Date(sorted[i]);
    const diffDays = Math.round(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getStreakFromStorage(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(STREAK_DATES_KEY);
  const dates: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  return computeStreak(dates);
}

function getTodaySessionCount(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toDateString();
  if (localStorage.getItem(SESSION_DATE_KEY) !== today) return 0;
  return parseInt(localStorage.getItem(SESSION_TODAY_KEY) ?? "0", 10);
}

function getTodayQuickFireCount(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toDateString();
  const saved = localStorage.getItem("sc_qf_date");
  if (saved !== today) return 0;
  return parseInt(localStorage.getItem("sc_qf_count") ?? "0", 10);
}

function DailyPracticeTracker({ sessionCount }: { sessionCount: number }) {
  const [streak, setStreak] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [todayFires, setTodayFires] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStreak(getStreakFromStorage());
    setTodaySessions(getTodaySessionCount());
    setTodayFires(getTodayQuickFireCount());
    setMounted(true);
  }, []);

  // If nothing has happened yet (no sessions ever, no quick fires today, no streak), hide
  if (!mounted || (sessionCount === 0 && streak === 0 && todayFires === 0)) return null;

  const totalToday = todaySessions + todayFires;

  return (
    <div className="mb-6 sc-entry sc-e2">
      <div className="flex items-center gap-4">
        {/* Streak pill */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-3 py-1.5">
            <span className="text-sc-gold text-xs">🔥</span>
            <span className="font-mono text-xs font-semibold text-sc-gold">
              {streak} day{streak !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {/* Today's activity pills */}
        {todaySessions > 0 && (
          <span className="font-mono text-xs text-sc-muted">
            <span className="text-sc-green">✓</span>{" "}
            {todaySessions} session{todaySessions !== 1 ? "s" : ""} today
          </span>
        )}
        {todayFires > 0 && (
          <span className="font-mono text-xs text-sc-muted">
            <span className="text-sc-gold">⚡</span>{" "}
            {todayFires} quick fire{todayFires !== 1 ? "s" : ""} today
          </span>
        )}
        {totalToday === 0 && streak > 0 && (
          <span className="font-mono text-xs text-sc-dim">
            nothing yet today
          </span>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Quick Fire entry card
// =====================================================================

const QF_PREVIEW_QUESTIONS = [
  "Why are you leaving after 18 years at Datamatics?",
  "Tell me about yourself.",
  "What makes you right for Kohler?",
  "Walk me through your AI pipeline.",
  "Describe a time a project failed.",
];

function QuickFireCard() {
  const [preview, setPreview] = useState(QF_PREVIEW_QUESTIONS[0]);
  useEffect(() => {
    setPreview(QF_PREVIEW_QUESTIONS[Math.floor(Math.random() * QF_PREVIEW_QUESTIONS.length)]);
  }, []);

  return (
    <div className="mb-8 sc-entry sc-e3">
      <Link
        href="/stagecraft/quickfire"
        className="group block rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm hover:border-sc-gold-dim transition-all"
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Lightning bolt */}
              <svg viewBox="0 0 12 16" className="w-3 h-4 fill-sc-gold shrink-0">
                <path d="M7 0L0 9h5l-2 7 9-10H7L7 0z" />
              </svg>
              <span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
                Quick Fire
              </span>
            </div>
            <span className="font-mono text-xs text-sc-dim group-hover:text-sc-gold transition-colors">
              →
            </span>
          </div>
          <p className="text-sm text-sc-muted leading-relaxed mb-3">
            One question. No setup. Grade it in under two minutes.
          </p>
          <p className="font-mono text-xs text-sc-dim border-l-2 border-sc-border pl-3 leading-relaxed italic">
            &ldquo;{preview}&rdquo;
          </p>
        </div>
      </Link>
    </div>
  );
}

// =====================================================================
// Priority drills panel
// =====================================================================

function PriorityDrillsPanel({
  activeDrill,
  onSelect,
}: {
  activeDrill: string;
  onSelect: (q: string) => void;
}) {
  return (
    <div className="mb-8 sc-entry sc-e4">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-mono text-xs tracking-widest text-sc-muted uppercase">
          Priority drills
        </h2>
        <div className="flex-1 h-px bg-sc-border" />
      </div>

      <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden divide-y divide-sc-line">
        {PRIORITY_DRILLS.map((d, i) => {
          const isActive = activeDrill.trim() === d.question.trim();
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(isActive ? "" : d.question)}
              className={`w-full text-left px-0 py-0 flex items-stretch transition-all group ${
                isActive ? "bg-sc-gold-bg" : "hover:bg-sc-raised"
              }`}
            >
              {/* Risk / active left border */}
              <span
                className={`w-0.5 shrink-0 transition-colors ${
                  isActive
                    ? "bg-sc-gold"
                    : d.risk
                      ? "bg-sc-red/40 group-hover:bg-sc-red/60"
                      : "bg-transparent"
                }`}
              />

              {/* Content */}
              <div className="flex items-center gap-4 px-4 py-3 flex-1 min-w-0">
                {/* Index */}
                <span
                  className={`font-mono text-xs w-5 shrink-0 ${
                    isActive ? "text-sc-gold" : "text-sc-dim"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-snug truncate ${
                      isActive ? "text-sc-ink font-medium" : "text-sc-ink"
                    }`}
                  >
                    {d.question}
                  </p>
                  <p
                    className={`font-mono text-xs mt-0.5 ${
                      d.risk && !isActive ? "text-sc-red/60" : "text-sc-dim"
                    }`}
                  >
                    {d.tag}
                  </p>
                </div>

                {/* CTA badge */}
                <span
                  className={`font-mono text-xs shrink-0 transition-colors ${
                    isActive
                      ? "text-sc-gold"
                      : "text-sc-dim group-hover:text-sc-gold"
                  }`}
                >
                  {isActive ? "◆ armed" : "→"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================
// Subviews
// =====================================================================

// =====================================================================
// Session recommendation engine
// =====================================================================

interface SessionRecommendation {
  round: Round;
  difficulty: Difficulty;
  focus: FocusMode;
  questionCount: number;
  reasoning: string[];
}

const GRAMMAR_KEYWORDS = [
  "article",
  "preposition",
  "tense",
  "plural",
  "run-on",
  "grammar",
  "verb",
  "word order",
];

function computeRecommendation(
  history: HistoryPayload,
): SessionRecommendation | null {
  const { sessions, allPatterns } = history;
  if (sessions.length < 2) return null;

  const recent = sessions.slice(0, 5);

  // ── Weakest non-mixed round ────────────────────────────────────
  const roundAcc = new Map<string, { sum: number; count: number }>();
  for (const s of recent) {
    if (s.round === "mixed") continue;
    const r = roundAcc.get(s.round) ?? { sum: 0, count: 0 };
    r.sum += s.composite;
    r.count += 1;
    roundAcc.set(s.round, r);
  }

  let weakestRound: Round = "hiring-manager"; // sensible default
  let lowestAvg = Infinity;
  for (const [rnd, { sum, count }] of roundAcc) {
    const avg = sum / count;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      weakestRound = rnd as Round;
    }
  }
  // If no non-mixed sessions yet, recommend based on what's least seen
  if (roundAcc.size === 0) weakestRound = "hiring-manager";

  // ── Difficulty based on recent composite ──────────────────────
  const avgComposite =
    recent.reduce((a, s) => a + s.composite, 0) / recent.length;
  const difficulty: Difficulty =
    avgComposite >= 7.5 ? "tough" : avgComposite < 4.5 ? "warm-up" : "realistic";

  // ── Focus: grammar if dominant pattern is grammar-related ─────
  let focus: FocusMode = null;
  const topPattern = allPatterns[0];
  if (topPattern && topPattern.count >= 3) {
    const tag = topPattern.tag.toLowerCase();
    if (GRAMMAR_KEYWORDS.some((k) => tag.includes(k))) {
      focus = "grammar";
    }
  }
  // Fallback: if delivery trails content significantly, suggest confidence
  const last = sessions[0];
  if (!focus && last && last.avgDelivery < last.avgContent - 1.2) {
    focus = "confidence";
  }

  // ── Build reasoning ───────────────────────────────────────────
  const reasoning: string[] = [];
  const roundLabelStr =
    ROUND_OPTIONS.find((o) => o.value === weakestRound)?.label ?? weakestRound;

  if (lowestAvg < Infinity && lowestAvg < 7.5) {
    reasoning.push(
      `${roundLabelStr} averaged ${lowestAvg.toFixed(1)} — your weakest round`,
    );
  } else {
    reasoning.push(`${roundLabelStr} — least practiced round`);
  }

  if (focus === "grammar" && topPattern) {
    reasoning.push(
      `"${topPattern.tag}" flagged ${topPattern.count}× across all sessions`,
    );
  } else if (focus === "confidence") {
    reasoning.push(`delivery is trailing your content score`);
  }

  if (difficulty === "tough") {
    reasoning.push(`composite ${avgComposite.toFixed(1)} — time to raise the bar`);
  }

  return {
    round: weakestRound,
    difficulty,
    focus,
    questionCount: 8,
    reasoning: reasoning.slice(0, 2),
  };
}

// ── Recommendation card ───────────────────────────────────────────────────────

function RecommendedSessionCard({
  rec,
  onApply,
}: {
  rec: SessionRecommendation;
  onApply: (r: SessionRecommendation) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const roundLabelStr =
    ROUND_OPTIONS.find((o) => o.value === rec.round)?.label ?? rec.round;

  return (
    <div className="mb-8 rounded-sm border border-sc-gold-dim bg-sc-gold-bg overflow-hidden sc-entry sc-e3">
      {/* Card header */}
      <div className="px-4 py-2.5 border-b border-sc-gold-dim/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sc-gold" />
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase">
            Recommended next session
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
        >
          dismiss
        </button>
      </div>

      {/* Config pills + Apply button */}
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <RecPill label="Round" value={roundLabelStr} />
          <RecPill label="Difficulty" value={rec.difficulty} />
          {rec.focus && <RecPill label="Focus" value={rec.focus} accent />}
          <RecPill label="Questions" value={String(rec.questionCount)} />
        </div>
        <button
          type="button"
          onClick={() => onApply(rec)}
          className="rounded-sm bg-sc-gold px-4 py-2 text-xs font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99] shrink-0"
        >
          Apply →
        </button>
      </div>

      {/* Reasoning */}
      {rec.reasoning.length > 0 && (
        <div className="px-4 pb-3 -mt-1">
          <p className="font-mono text-xs text-sc-dim leading-relaxed">
            {rec.reasoning.join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}

function RecPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-mono text-xs text-sc-dim">{label}:</span>
      <span
        className={`font-mono text-xs font-medium ${
          accent ? "text-sc-gold" : "text-sc-muted"
        }`}
      >
        {value}
      </span>
    </span>
  );
}

// ── Daily Brief ───────────────────────────────────────────────────────────────
// Generates a personalized 100-word morning coaching brief once per day.
// Cached in localStorage keyed by date so the API is only called once.

const BRIEF_CACHE_KEY = "sc_daily_brief";

interface BriefCache {
  date: string; // YYYY-MM-DD
  text: string;
}

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function DailyBriefPanel({
  history,
  interviewConfig,
}: {
  history: HistoryPayload | null;
  interviewConfig: { interviewDate?: string; interviewCompany?: string } | null;
}) {
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check cache first
    try {
      const raw = localStorage.getItem(BRIEF_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as BriefCache;
        if (cached.date === todayDateStr() && cached.text) {
          setBrief(cached.text);
          return;
        }
      }
    } catch { /* ignore */ }

    // Need history data before generating
    if (!history) return;

    setLoading(true);

    // Compute inputs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let daysUntil: number | null = null;
    if (interviewConfig?.interviewDate) {
      const [y, m, d] = interviewConfig.interviewDate.split("-").map(Number);
      const target = new Date(y, m - 1, d);
      daysUntil = Math.round((target.getTime() - today.getTime()) / 86400000);
      if (daysUntil < 0) daysUntil = null;
    }

    const sessions = history.sessions;
    const last = sessions[0] ?? null;
    const prev = sessions[1] ?? null;

    // Weakest round (non-mixed)
    const roundMap = new Map<string, { sum: number; count: number }>();
    for (const s of sessions.slice(0, 8)) {
      if (s.round === "mixed") continue;
      const r = roundMap.get(s.round) ?? { sum: 0, count: 0 };
      r.sum += s.composite; r.count++;
      roundMap.set(s.round, r);
    }
    let weakestRound: string | null = null;
    let lowestAvg = Infinity;
    for (const [rnd, { sum, count }] of roundMap) {
      const avg = sum / count;
      if (avg < lowestAvg) { lowestAvg = avg; weakestRound = rnd; }
    }

    const englishTrend =
      last && prev
        ? last.avgEnglish > prev.avgEnglish
          ? ("improving" as const)
          : last.avgEnglish < prev.avgEnglish
            ? ("worsening" as const)
            : ("stable" as const)
        : null;

    const body = {
      daysUntilInterview: daysUntil,
      targetCompany: interviewConfig?.interviewCompany ?? null,
      totalSessions: sessions.length,
      totalQuestions: history.totalQuestions,
      kohlerReadiness: history.kohlerReadiness,
      lastSessionComposite: last?.composite ?? null,
      lastSessionRole: last?.role ?? null,
      weakestRound,
      worstPatterns: history.allPatterns.slice(0, 3).map((p) => p.tag),
      englishTrend,
      dayOfWeek: today.toLocaleDateString("en-US", { weekday: "long" }),
    };

    let acc = "";
    fetch("/api/stagecraft/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setBrief(acc);
        }
        // Cache
        try {
          localStorage.setItem(
            BRIEF_CACHE_KEY,
            JSON.stringify({ date: todayDateStr(), text: acc }),
          );
        } catch { /* ignore */ }
      })
      .catch(() => { /* silently fail — brief is non-essential */ })
      .finally(() => setLoading(false));
  // Run once when history loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  if (dismissed || (!loading && !brief)) return null;

  return (
    <div className="mt-5 rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden sc-entry sc-e1b">
      <div className="px-4 py-2.5 border-b border-sc-line flex items-center justify-between">
        <p className="font-mono text-xs tracking-widest text-sc-gold uppercase">
          Today&apos;s brief
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
        >
          dismiss
        </button>
      </div>
      <div className="px-4 py-3">
        {loading && !brief ? (
          <p className="font-mono text-xs text-sc-dim animate-pulse">Briefing…</p>
        ) : (
          <p className="text-sm text-sc-ink leading-relaxed">
            {brief.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
              /^\*\*[^*]+\*\*$/.test(part) ? (
                <strong key={i} className="font-semibold text-sc-gold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// Lightweight hook: fetch just enough from the history API to show a
// "last session" strip on the setup screen without importing the whole
// HistoryPage component.
function useLastSession() {
  const [data, setData] = useState<HistoryPayload | null>(null);
  useEffect(() => {
    fetch("/api/stagecraft/history", { cache: "no-store" })
      .then(async (r) => (r.ok ? (r.json() as Promise<HistoryPayload>) : null))
      .then((d) => setData(d))
      .catch(() => null);
  }, []);
  return data;
}

// Hook: fetch the interview target config (date + company).
function useInterviewConfig() {
  const [config, setConfig] = useState<{
    interviewDate?: string;
    interviewCompany?: string;
  } | null>(null);
  useEffect(() => {
    fetch("/api/stagecraft/config", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => setConfig(d ?? {}))
      .catch(() => setConfig({}));
  }, []);
  return config;
}

// ── Countdown strip ───────────────────────────────────────────────────────────

function CountdownStrip({
  date,
  company,
}: {
  date: string;
  company?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse the ISO date without timezone shift
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const days = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0) return null; // past — don't linger

  const daysLabel =
    days === 0 ? "Today" : days === 1 ? "1 day left" : `${days} days left`;

  const urgencyColor =
    days === 0
      ? "text-sc-green"
      : days <= 3
        ? "text-sc-red"
        : days <= 7
          ? "text-sc-gold"
          : "text-sc-dim";

  const paceHint =
    days === 0
      ? "— interview day. You're ready."
      : days <= 3
        ? "— final prep. One drill session now."
        : days <= 7
          ? "— daily sessions from here."
          : days <= 14
            ? `— ${Math.ceil(days / 2)} sessions recommended.`
            : "";

  const targetText = company ? `→ ${company}` : "→ interview";

  // Sprint actions — only shown when days <= 3
  const sprintActions: { emoji: string; label: string; desc: string; href: string }[] =
    days === 0
      ? [
          { emoji: "⏱", label: "5-min warm-up", desc: "Light Quick Fire — don't over-think now", href: "/stagecraft/quickfire" },
          { emoji: "📋", label: "Night-before checklist", desc: "Confirm every item is green", href: "/stagecraft/checklist" },
          { emoji: "💭", label: "Review memorized answers", desc: "Read through what you've locked in", href: "/stagecraft/memorize" },
        ]
      : days <= 2
        ? [
            { emoji: "🎯", label: "Drill: 18-year move", desc: "Highest-risk question — needs to be effortless", href: "/stagecraft/drill?id=tenure" },
            { emoji: "🎯", label: "Self-intro forge", desc: "Under 60 seconds, all 4 proof points locked", href: "/stagecraft/intro" },
            { emoji: "📋", label: "Pre-interview checklist", desc: "See what's still yellow or red", href: "/stagecraft/checklist" },
            { emoji: "💭", label: "Memorize queue", desc: "Review and lock in your sample answers", href: "/stagecraft/memorize" },
          ]
        : [
            { emoji: "⚡", label: "Quick Fire warm-up", desc: "One random question to sharpen today", href: "/stagecraft/quickfire" },
            { emoji: "🎯", label: "Drill: 18-year move", desc: "Your #1 risk question", href: "/stagecraft/drill?id=tenure" },
            { emoji: "🎯", label: "Drill: self-intro", desc: "30-second self-introduction", href: "/stagecraft/intro" },
          ];

  return (
    <div className="mt-3">
      {/* Countdown badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-mono text-xs font-medium ${urgencyColor}`}>
          ◆ {daysLabel} {targetText}
        </span>
        {paceHint && (
          <span className="font-mono text-xs text-sc-dim">{paceHint}</span>
        )}
      </div>

      {/* Sprint panel — final 3 days */}
      {days <= 3 && (
        <div className="mt-3 rounded-sm border border-sc-red/25 bg-sc-red/[0.04] px-4 py-3 space-y-2">
          <p className="font-mono text-xs tracking-widest text-sc-red uppercase mb-2">
            {days === 0 ? "Interview day — stay sharp" : `${days}-day sprint`}
          </p>
          {sprintActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 group rounded-sm py-0.5"
            >
              <span className="text-sm shrink-0 w-5 text-center">{a.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sc-ink group-hover:text-sc-gold transition-colors leading-snug">
                  {a.label}
                </p>
                <p className="font-mono text-xs text-sc-dim leading-snug">
                  {a.desc}
                </p>
              </div>
              <span className="font-mono text-xs text-sc-dim group-hover:text-sc-gold transition-colors shrink-0">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Fetches first-run state once. null = unknown (still loading). */
function useFirstRun(): boolean | null {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/stagecraft/state", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ isFirstRun: boolean }>)
      .then((s) => setIsFirstRun(Boolean(s.isFirstRun)))
      .catch(() => setIsFirstRun(false));
  }, []);
  return isFirstRun;
}

/** Focused first-run hero — one job: get the user into a graded answer fast. */
function FirstRunHero() {
  return (
    <section className="sc-entry sc-e1">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-4 h-px bg-sc-gold" />
        <p className="font-mono text-xs tracking-widest text-sc-gold uppercase">
          Welcome
        </p>
      </div>
      <h1 className="font-fraunces text-4xl font-semibold text-sc-ink leading-tight tracking-tight">
        Prepare for the room.
      </h1>
      <p className="mt-3 text-sm text-sc-muted leading-relaxed max-w-prose">
        Practice a real interview question and get scored in 60 seconds. No
        setup required.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/stagecraft/quickfire"
          className="rounded-sc bg-sc-gold px-5 py-3 text-sm font-semibold text-sc-void hover:brightness-110 transition-all min-h-[44px] inline-flex items-center gap-2"
        >
          <span aria-hidden>▶</span> Try a 60-second Quick Fire
        </Link>
        <Link
          href="/stagecraft/profile/setup"
          className="rounded-sc border border-sc-border bg-sc-surface px-5 py-3 text-sm font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors min-h-[44px] inline-flex items-center"
        >
          Set up your profile
        </Link>
      </div>
      <p className="mt-6 font-mono text-xs text-sc-dim leading-relaxed max-w-prose">
        What you&apos;ll get: a model answer in your voice, an honest score, and
        the patterns to fix.
      </p>
    </section>
  );
}

function SetupView(props: {
  targetRole: string;
  setTargetRole: (v: string) => void;
  companyPackId: string;
  setCompanyPackId: (v: string) => void;
  round: Round;
  setRound: (v: Round) => void;
  questionCount: number;
  setQuestionCount: (v: number) => void;
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
  focus: FocusMode;
  setFocus: (v: FocusMode) => void;
  drillQuestion: string;
  setDrillQuestion: (v: string) => void;
  onStart: () => void;
}) {
  const drillActive = props.drillQuestion.trim().length > 0;
  const firstRun = useFirstRun();
  const history = useLastSession();
  const interviewConfig = useInterviewConfig();
  const last = history?.sessions[0] ?? null;
  const prev = history?.sessions[1] ?? null;

  // English trend vs previous session
  const englishDelta =
    last && prev ? +(last.avgEnglish - prev.avgEnglish).toFixed(1) : null;

  // Smart recommendation from history
  const recommendation = history ? computeRecommendation(history) : null;

  const applyRecommendation = (rec: SessionRecommendation) => {
    props.setRound(rec.round);
    props.setDifficulty(rec.difficulty);
    props.setFocus(rec.focus);
    props.setQuestionCount(rec.questionCount);
    props.setDrillQuestion(""); // clear any active drill
  };

  // First-run users get a focused activation hero instead of the dense hub.
  if (firstRun === true) {
    return <FirstRunHero />;
  }

  return (
    <section>
      {/* ── Editorial hero ──────────────────────────────────────── */}
      <div className="mb-8 sc-entry sc-e1">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-4 h-px bg-sc-gold" />
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase">
            The briefing room
          </p>
        </div>
        <h1 className="font-fraunces text-4xl font-semibold text-sc-ink leading-tight tracking-tight">
          Prepare for the room.
        </h1>
        <GooeyText
          className="font-fraunces text-sc-gold text-2xl mt-1"
          texts={["Creative Director", "Brand Leader", "AI-native Operator"]}
        />
        <div className="sc-rule mt-4" />

        {/* Interview countdown or set-target prompt */}
        {interviewConfig !== null && (
          interviewConfig.interviewDate ? (
            <CountdownStrip
              date={interviewConfig.interviewDate}
              company={interviewConfig.interviewCompany}
            />
          ) : (
            <Link
              href="/stagecraft/profile"
              className="mt-3 inline-block font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors"
            >
              + Set interview target
            </Link>
          )
        )}

        {/* AI daily brief — generates once per day, cached in localStorage */}
        <DailyBriefPanel history={history} interviewConfig={interviewConfig} />
      </div>

      {/* ── Onboarding progress — self-hides once all milestones met ─ */}
      <ScrollReveal delay={0}>
        <OnboardingProgress />
      </ScrollReveal>

      {/* ── Time-based nav ───────────────────────────────────────── */}
      <ScrollReveal delay={0}>
        <TimeNav />
      </ScrollReveal>

      {/* ── Daily practice tracker ───────────────────────────────── */}
      <ScrollReveal delay={80}>
        <DailyPracticeTracker sessionCount={history?.sessions.length ?? 0} />
      </ScrollReveal>

      {/* ── Status grid — only when history exists ──────────────── */}
      {last && history && (
        <ScrollReveal delay={160}>
        <div className="grid grid-cols-2 gap-3 mb-8 sc-entry sc-e2">
          {/* Left: Readiness panel */}
          <div
            className={`rounded-sm border p-4 flex flex-col justify-between ${
              (history.kohlerReadiness ?? 0) >= 8
                ? "border-sc-green/40 bg-sc-green-bg"
                : (history.kohlerReadiness ?? 0) >= 6
                  ? "border-sc-gold-dim bg-sc-gold-bg"
                  : "border-sc-border bg-sc-surface"
            }`}
          >
            <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1">
              Readiness
            </p>
            <div className="flex items-baseline gap-1 my-1">
              <span
                className={`font-display text-5xl font-semibold leading-none ${
                  (history.kohlerReadiness ?? 0) >= 8
                    ? "text-sc-green"
                    : (history.kohlerReadiness ?? 0) >= 6
                      ? "text-sc-gold"
                      : "text-sc-muted"
                }`}
              >
                {history.kohlerReadiness ?? "—"}
              </span>
              <span className="font-mono text-xs text-sc-dim self-end mb-1">
                / 10
              </span>
            </div>
            <p className="font-mono text-xs text-sc-dim mt-auto">
              {history.sessions.length} sessions
              <br />
              {history.totalQuestions} questions
            </p>
          </div>

          {/* Right: Last session score rows */}
          <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm p-4">
            <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-3">
              Last session
            </p>
            <div className="space-y-2.5">
              {(
                [
                  {
                    label: "Content",
                    value: last.avgContent,
                    delta: null as number | null,
                  },
                  {
                    label: "English",
                    value: last.avgEnglish,
                    delta: englishDelta,
                  },
                  {
                    label: "Delivery",
                    value: last.avgDelivery,
                    delta: null as number | null,
                  },
                ] as const
              ).map(({ label, value, delta }) => (
                <div
                  key={label}
                  className="flex items-center justify-between"
                >
                  <span className="font-mono text-xs text-sc-dim">
                    {label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-display text-lg font-semibold ${scoreColor(value)}`}
                    >
                      {value}
                    </span>
                    {delta !== null && (
                      <span
                        className={`font-mono text-xs leading-none ${
                          delta > 0
                            ? "text-sc-green"
                            : delta < 0
                              ? "text-sc-red"
                              : "text-sc-dim"
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </ScrollReveal>
      )}

      {/* ── Recommendation card — shown after 2+ sessions ─────── */}
      {recommendation && (
        <RecommendedSessionCard
          rec={recommendation}
          onApply={applyRecommendation}
        />
      )}

      {/* ── Quick Fire entry ────────────────────────────────────── */}
      <ScrollReveal delay={240}>
        <QuickFireCard />
      </ScrollReveal>

      {/* ── Priority drills ─────────────────────────────────────── */}
      <PriorityDrillsPanel
        activeDrill={props.drillQuestion}
        onSelect={props.setDrillQuestion}
      />

      <div id="start-session" className="space-y-5 sc-entry sc-e5">
        {/* Company prep pack selector */}
        <div>
          <label className="block font-mono text-xs tracking-widest text-sc-muted uppercase mb-2">
            Target company
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMPANY_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => props.setCompanyPackId(pack.id)}
                className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-all ${
                  props.companyPackId === pack.id
                    ? "border-sc-gold bg-sc-gold-bg text-sc-gold"
                    : "border-sc-border bg-sc-surface text-sc-muted hover:border-sc-gold-dim hover:text-sc-ink"
                }`}
              >
                {pack.shortName}
              </button>
            ))}
            <button
              type="button"
              onClick={() => props.setCompanyPackId("")}
              className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-all ${
                props.companyPackId === ""
                  ? "border-sc-gold bg-sc-gold-bg text-sc-gold"
                  : "border-sc-border bg-sc-surface text-sc-muted hover:border-sc-gold-dim hover:text-sc-ink"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Pack watch-outs — shown when a pack is active */}
          {props.companyPackId && (() => {
            const pack = getPackById(props.companyPackId);
            if (!pack) return null;
            return (
              <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 space-y-2 mb-3">
                <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
                  Prep context · {pack.rounds}
                </p>
                <ul className="space-y-1">
                  {pack.watchOuts.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-sc-muted">
                      <span className="text-sc-gold shrink-0 mt-0.5">·</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Role text — editable, auto-filled from pack */}
          <label className="block font-mono text-xs tracking-widest text-sc-dim uppercase mb-1.5">
            Role label
          </label>
          <input
            type="text"
            className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors"
            value={props.targetRole}
            onChange={(e) => {
              props.setTargetRole(e.target.value);
              // Switching to custom if user edits the role label manually
              if (props.companyPackId) {
                const pack = getPackById(props.companyPackId);
                if (pack && e.target.value !== pack.label) props.setCompanyPackId("");
              }
            }}
            placeholder="e.g. Creative Director — Kohler India"
          />
        </div>

        {/* Round */}
        <div>
          <label className="block font-mono text-xs tracking-widest text-sc-muted uppercase mb-2">
            Round
          </label>
          <select
            className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 text-sm text-sc-ink focus:border-sc-gold-dim focus:outline-none transition-colors disabled:opacity-40"
            value={props.round}
            onChange={(e) => props.setRound(e.target.value as Round)}
            disabled={drillActive}
          >
            {ROUND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Questions + Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs tracking-widest text-sc-muted uppercase mb-2">
              Questions
            </label>
            <input
              type="number"
              min={1}
              max={30}
              className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 text-sm text-sc-ink focus:border-sc-gold-dim focus:outline-none transition-colors"
              value={props.questionCount}
              onChange={(e) => props.setQuestionCount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block font-mono text-xs tracking-widest text-sc-muted uppercase mb-2">
              Difficulty
            </label>
            <select
              className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 text-sm text-sc-ink focus:border-sc-gold-dim focus:outline-none transition-colors"
              value={props.difficulty}
              onChange={(e) =>
                props.setDifficulty(e.target.value as Difficulty)
              }
            >
              {DIFFICULTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Focus */}
        <div>
          <label className="block font-mono text-xs tracking-widest text-sc-muted uppercase mb-2">
            Focus mode{" "}
            <span className="text-sc-dim normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <div className="flex gap-2">
            {(["grammar", "confidence", "brevity"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => props.setFocus(props.focus === f ? null : f)}
                className={`rounded-sm border px-4 py-2 text-xs font-mono transition-all ${
                  props.focus === f
                    ? "border-sc-gold bg-sc-gold-bg text-sc-gold"
                    : "border-sc-border bg-sc-surface text-sc-muted hover:border-sc-gold-dim hover:text-sc-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Drill mode */}
        <div
          className={`rounded-sm border p-4 transition-colors ${
            drillActive
              ? "border-sc-gold-dim bg-sc-gold-bg"
              : "border-dashed border-sc-border bg-sc-surface"
          }`}
        >
          <label className="block font-mono text-xs tracking-widest text-sc-muted uppercase mb-1">
            Drill mode{" "}
            <span className="text-sc-dim normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <p className="text-xs text-sc-dim mb-3">
            Paste one question to repeat. Session ends early once your last 3
            answers all average 8 or above.
          </p>
          <textarea
            className="w-full rounded-sm border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors resize-none"
            rows={2}
            value={props.drillQuestion}
            onChange={(e) => props.setDrillQuestion(e.target.value)}
            placeholder='"Why are you looking to move after 18 years at Datamatics?"'
          />
          {drillActive ? (
            <p className="mt-2 text-xs font-mono text-sc-gold">
              ◆ Drill active — same question every turn
            </p>
          ) : null}
        </div>

        {/* CTA */}
        <div className="pt-2">
          <button
            type="button"
            onClick={props.onStart}
            className="w-full rounded-sm bg-sc-gold px-6 py-3.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99]"
          >
            {drillActive ? "Start drill session →" : "Start session →"}
          </button>
        </div>
      </div>
    </section>
  );
}

function WarmupView(props: {
  recorderState: RecorderState;
  transcript: string;
  answerMode: "voice" | "type";
  onStart: () => void;
  onStop: () => void;
  onContinue: () => void;
  onModeChange: (m: "voice" | "type") => void;
  onTypeAnswer: (text: string) => void;
  speechSupported: boolean;
  browserRecording: boolean;
  interimText: string;
  onBrowserVoice: () => void;
}) {
  return (
    <section className="space-y-8">
      <div>
        <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-4">
          Warm-up — not scored
        </p>
        <p className="font-display text-2xl font-light text-sc-ink leading-snug">
          In two sentences — who are you,
          <br />
          and what do you do?
        </p>
        <p className="mt-3 text-sm text-sc-muted">
          Just speak. This one&apos;s only to loosen up. No coaching, no score.
        </p>
      </div>

      <AnswerModeToggle mode={props.answerMode} onChange={props.onModeChange} />

      {props.answerMode === "voice" ? (
        <>
          {props.speechSupported ? (
            <>
              {/* Browser voice — instant, no upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={props.onBrowserVoice}
                    className={`flex items-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-semibold transition-all ${
                      props.browserRecording
                        ? "border-sc-red bg-sc-red/10 text-sc-red"
                        : "border-sc-gold-dim bg-sc-gold-bg text-sc-gold hover:bg-sc-gold/20"
                    }`}
                  >
                    <span>{props.browserRecording ? "⏹ Stop" : "🎙 Speak now"}</span>
                  </button>
                  {!props.browserRecording && (
                    <MicButton
                      recorderState={props.recorderState}
                      onStart={props.onStart}
                      onStop={props.onStop}
                    />
                  )}
                </div>
                {props.browserRecording && (
                  <p className="font-mono text-xs text-sc-gold animate-pulse">
                    Listening… speak your answer
                  </p>
                )}
                {props.interimText && (
                  <p className="font-mono text-xs text-sc-dim italic">{props.interimText}</p>
                )}
              </div>
            </>
          ) : (
            <MicButton
              recorderState={props.recorderState}
              onStart={props.onStart}
              onStop={props.onStop}
            />
          )}

          {props.transcript && !props.browserRecording ? (
            <div className="border-l-2 border-sc-border pl-4">
              <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-2">
                Transcript
              </p>
              <p className="font-mono text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">
                {props.transcript}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <textarea
          className="w-full rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors resize-none leading-relaxed font-sans"
          rows={5}
          value={props.transcript}
          onChange={(e) => props.onTypeAnswer(e.target.value)}
          placeholder="Type your two-sentence intro here…"
          autoFocus
        />
      )}

      <button
        type="button"
        onClick={props.onContinue}
        disabled={props.recorderState === "recording"}
        className="rounded-sm bg-sc-gold px-6 py-3 text-sm font-semibold text-sc-void hover:brightness-110 transition-all disabled:opacity-30"
      >
        Continue to Q1 →
      </button>
    </section>
  );
}

function QuestionView(props: {
  index: number;
  total: number;
  roundLabel: string;
  question: string;
  recorderState: RecorderState;
  transcript: string;
  audioUrl: string;
  feedback: string;
  feedbackStreaming: boolean;
  memorized: boolean;
  answerMode: "voice" | "type";
  interviewerSpeaking: boolean;
  onStartRec: () => void;
  onStopRec: () => void;
  onSubmit: () => void;
  onNext: () => void;
  onRetry: () => void;
  onMemorize: () => void;
  onModeChange: (m: "voice" | "type") => void;
  onTypeAnswer: (text: string) => void;
  isLast: boolean;
  speechSupported: boolean;
  browserRecording: boolean;
  interimText: string;
  onBrowserVoice: () => void;
}) {
  const hasFeedback = props.feedback.length > 0;

  // Live timing for browser-voice recording — same sweet-spot feedback as MicButton
  const srElapsed = useRecordingTimer(props.browserRecording);
  const srTimerColor =
    srElapsed >= 90 ? "text-sc-red" : srElapsed >= 60 ? "text-sc-gold" : "text-sc-green";
  const srTimerHint =
    srElapsed >= 90
      ? "— too long, wrap up"
      : srElapsed >= 60
        ? "— start closing"
        : null;
  const srMm = String(Math.floor(srElapsed / 60)).padStart(1, "0");
  const srSs = String(srElapsed % 60).padStart(2, "0");

  return (
    <section className="space-y-7">
      {/* Question header */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-sc-gold tracking-widest uppercase">
          Q{props.index}
        </span>
        <span className="text-sc-border text-xs">—</span>
        <span className="font-mono text-xs text-sc-dim tracking-widest uppercase">
          {props.roundLabel}
        </span>
        <span className="ml-auto font-mono text-xs text-sc-dim">
          {props.index} / {props.total}
        </span>
      </div>

      {/* Question text — dim slightly while interviewer is speaking */}
      <div className={`border-l-2 pl-5 transition-all ${props.interviewerSpeaking ? "border-sc-gold-dim opacity-60" : "border-sc-gold"}`}>
        <p className="font-display text-xl font-medium text-sc-ink leading-snug">
          {props.question}
        </p>
      </div>

      {/* Interviewer speaking overlay */}
      {props.interviewerSpeaking && !hasFeedback && (
        <div className="flex items-center gap-3 rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-3">
          {/* Animated sound bars */}
          <div className="flex items-end gap-0.5 h-4 shrink-0">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-0.5 bg-sc-gold rounded-full animate-bounce"
                style={{
                  height: `${50 + (i % 2 === 0 ? 50 : 25)}%`,
                  animationDelay: `${i * 0.12}s`,
                  animationDuration: "0.8s",
                }}
              />
            ))}
          </div>
          <p className="font-mono text-xs text-sc-gold">
            Interviewer is speaking — listen, then answer when done
          </p>
        </div>
      )}

      {!hasFeedback ? (
        <>
          <AnswerModeToggle
            mode={props.answerMode}
            onChange={props.onModeChange}
          />

          {props.answerMode === "voice" ? (
            <>
              {props.speechSupported ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={props.onBrowserVoice}
                      disabled={props.interviewerSpeaking}
                      className={`flex items-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-30 ${
                        props.browserRecording
                          ? "border-sc-red bg-sc-red/10 text-sc-red"
                          : "border-sc-gold-dim bg-sc-gold-bg text-sc-gold hover:bg-sc-gold/20"
                      }`}
                    >
                      <span>{props.browserRecording ? "⏹ Stop" : "🎙 Speak now"}</span>
                    </button>
                    {!props.browserRecording && (
                      <MicButton
                        recorderState={props.interviewerSpeaking ? "idle" : props.recorderState}
                        onStart={props.interviewerSpeaking ? () => undefined : props.onStartRec}
                        onStop={props.onStopRec}
                        disabled={props.interviewerSpeaking}
                      />
                    )}
                  </div>
                  {props.browserRecording && (
                    <div className="flex items-baseline gap-2">
                      <span className={`font-mono text-lg font-semibold tabular-nums ${srTimerColor}`}>
                        {srMm}:{srSs}
                      </span>
                      {srTimerHint ? (
                        <span className={`font-mono text-xs ${srTimerColor}`}>
                          {srTimerHint}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-sc-dim animate-pulse">
                          listening…
                        </span>
                      )}
                    </div>
                  )}
                  {props.interimText && (
                    <p className="font-mono text-xs text-sc-dim italic leading-relaxed">
                      {props.interimText}
                    </p>
                  )}
                </div>
              ) : (
                <MicButton
                  recorderState={props.interviewerSpeaking ? "idle" : props.recorderState}
                  onStart={props.interviewerSpeaking ? () => undefined : props.onStartRec}
                  onStop={props.onStopRec}
                  disabled={props.interviewerSpeaking}
                />
              )}

              {props.transcript && !props.browserRecording ? (
                <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm">
                  <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                    <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
                      Your answer
                    </span>
                  </div>
                  {props.audioUrl ? (
                    <div className="px-4 pb-2">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={props.audioUrl} controls className="w-full" />
                    </div>
                  ) : null}
                  <p className="px-4 pb-4 font-mono text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">
                    {props.transcript}
                  </p>
                  <div className="border-t border-sc-line px-4 py-3">
                    <button
                      type="button"
                      onClick={props.onSubmit}
                      className="rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99]"
                    >
                      Submit for coaching →
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <TypeAnswerBox
              value={props.transcript}
              onChange={props.onTypeAnswer}
              onSubmit={props.onSubmit}
            />
          )}
        </>
      ) : (
        <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm">
          {/* Feedback header */}
          <div className="px-4 py-3 border-b border-sc-line flex items-center justify-between">
            <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
              {props.feedbackStreaming ? (
                <span className="text-sc-gold">coaching…</span>
              ) : (
                "coaching"
              )}
            </span>
            {!props.feedbackStreaming ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={props.onRetry}
                  className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-2.5 py-1.5 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-all"
                  title="Re-record the same question after seeing the sample answer"
                >
                  ↻ Retry
                </button>
                <button
                  type="button"
                  onClick={props.onNext}
                  className="rounded-sm bg-sc-gold px-3 py-1.5 text-xs font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99]"
                >
                  {props.isLast ? "End session →" : "Next →"}
                </button>
              </div>
            ) : null}
          </div>

          {/* Feedback body */}
          <div className="px-4 py-4 space-y-4">
            {/* Annotated transcript — shown once feedback is complete */}
            {!props.feedbackStreaming && props.transcript && (
              <AnnotatedTranscript transcript={props.transcript} />
            )}

            {props.feedbackStreaming ? (
              // While streaming: progressive section display
              <StreamingFeedbackRenderer raw={props.feedback} />
            ) : (
              // Once complete: full structured renderer with memorize button
              <FeedbackRenderer
                raw={props.feedback}
                memorized={props.memorized}
                onMemorize={props.onMemorize}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ReportView(props: {
  targetRole: string;
  round: string;
  averages: { content: number; english: number; delivery: number; n: number };
  patternCounts: [string, number[]][];
  items: QAItem[];
  audioByIndex: Record<number, string>;
  aiReport: string;
  reportLoading: boolean;
  onGenerateReport: () => void;
  onRestart: () => void;
}) {
  // Derived insights for action cards
  const weakestItem = props.items.length > 0
    ? props.items.reduce((a, b) =>
        (a.scores.content * 0.4 + a.scores.english * 0.3 + a.scores.delivery * 0.3) <
        (b.scores.content * 0.4 + b.scores.english * 0.3 + b.scores.delivery * 0.3)
          ? a : b,
      )
    : null;

  const lowestAxis =
    props.averages.english <= props.averages.content &&
    props.averages.english <= props.averages.delivery
      ? "english"
      : props.averages.delivery <= props.averages.content
        ? "delivery"
        : "content";

  const topPattern = props.patternCounts[0];

  return (
    <section className="space-y-7">
      {/* Header */}
      <div>
        <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-3">
          Session complete
        </p>
        <h2 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
          Session report
        </h2>
        <p className="mt-1 text-sm text-sc-muted">
          {props.targetRole} &middot; {props.round} &middot;{" "}
          {props.averages.n} question{props.averages.n !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Score chips */}
      <div className="grid grid-cols-3 gap-3">
        <ScoreChip label="Content" value={props.averages.content} />
        <ScoreChip label="English" value={props.averages.english} />
        <ScoreChip label="Delivery" value={props.averages.delivery} />
      </div>

      {/* Per-question score grid */}
      {props.items.length > 1 && (
        <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-sc-line">
            <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
              Per-question breakdown
            </span>
          </div>
          <div className="px-4 py-3 space-y-2">
            {props.items.map((it) => {
              const composite = +(
                it.scores.content * 0.4 +
                it.scores.english * 0.3 +
                it.scores.delivery * 0.3
              ).toFixed(1);
              const isWorst = it.index === weakestItem?.index;
              return (
                <div key={it.index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs shrink-0 w-5 text-right ${isWorst ? "text-sc-red" : "text-sc-dim"}`}
                    >
                      Q{it.index}
                    </span>
                    {/* Bar track */}
                    <div className="flex-1 flex gap-0.5 h-3">
                      {(
                        [
                          { v: it.scores.content, label: "C" },
                          { v: it.scores.english, label: "E" },
                          { v: it.scores.delivery, label: "D" },
                        ] as const
                      ).map(({ v, label }) => (
                        <div
                          key={label}
                          className="flex-1 relative bg-sc-border/40 rounded-sm overflow-hidden"
                          title={`${label}: ${v}/10`}
                        >
                          <div
                            className={`absolute inset-y-0 left-0 rounded-sm transition-all ${
                              v >= 8
                                ? "bg-sc-green"
                                : v >= 5
                                  ? "bg-sc-gold"
                                  : "bg-sc-red"
                            }`}
                            style={{ width: `${v * 10}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <span
                      className={`font-mono text-xs tabular-nums shrink-0 ${
                        composite >= 8
                          ? "text-sc-green"
                          : composite >= 5
                            ? "text-sc-gold"
                            : "text-sc-red"
                      }`}
                    >
                      {composite}
                    </span>
                    {isWorst && (
                      <Link
                        href={`/stagecraft/drill?q=${encodeURIComponent(it.question)}`}
                        className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors shrink-0"
                      >
                        re-drill →
                      </Link>
                    )}
                  </div>
                  {/* Question label — truncated */}
                  <p className="font-mono text-xs text-sc-dim/60 truncate pl-7">
                    {it.question}
                  </p>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="px-4 pb-3 flex gap-3">
            {(["C Content", "E English", "D Delivery"] as const).map((s) => (
              <span key={s} className="font-mono text-[9px] text-sc-dim/50">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI report */}
      <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm">
        <div className="px-4 py-3 border-b border-sc-line flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
            Session debrief
          </span>
          {!props.aiReport && !props.reportLoading ? (
            <button
              type="button"
              onClick={props.onGenerateReport}
              className="rounded-sm bg-sc-gold px-3 py-1.5 text-xs font-semibold text-sc-void hover:brightness-110 transition-all"
            >
              Generate
            </button>
          ) : null}
        </div>
        <div className="px-4 py-4">
          {props.reportLoading && !props.aiReport ? (
            <p className="font-mono text-xs text-sc-gold animate-pulse">
              Generating report…
            </p>
          ) : props.aiReport ? (
            <SessionReportView
              raw={props.aiReport}
              streaming={props.reportLoading}
            />
          ) : (
            <p className="text-sm text-sc-muted">
              What worked, what to fix, repeated patterns, and three answers to
              memorize.
            </p>
          )}
        </div>
      </div>

      {/* Patterns */}
      {props.patternCounts.length > 0 ? (
        <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm">
          <div className="px-4 py-3 border-b border-sc-line">
            <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
              Repeated patterns
            </span>
          </div>
          <div className="px-4 py-4 flex flex-wrap gap-2">
            {props.patternCounts.map(([p, idx]) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-2.5 py-1 font-mono text-xs text-sc-muted"
                title={`Q${idx.map(String).join(", Q")}`}
              >
                <span className="text-sc-red">●</span>
                {p}
                <span className="text-sc-dim">×{idx.length}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3">
          <span className="font-mono text-xs text-sc-dim">
            No repeated patterns — clean session.
          </span>
        </div>
      )}

      {/* All Q&A accordion */}
      <details className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm group">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
          <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
            All questions &amp; feedback
          </span>
          <span className="font-mono text-xs text-sc-dim group-open:hidden">
            expand
          </span>
          <span className="font-mono text-xs text-sc-dim hidden group-open:block">
            collapse
          </span>
        </summary>
        <div className="border-t border-sc-line divide-y divide-sc-line">
          {props.items.map((it) => {
            const url = props.audioByIndex[it.index];
            const sec = parseFeedbackSections(it.feedback);
            return (
              <div key={it.index} className="px-4 py-4 space-y-3">
                {/* Question header */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-sc-gold">
                    Q{it.index}
                  </span>
                  <span className="font-mono text-xs text-sc-dim">
                    {roundLabel(it.round)}
                  </span>
                  <span className="ml-auto flex gap-2">
                    <ScorePill label="C" value={it.scores.content} />
                    <ScorePill label="E" value={it.scores.english} />
                    <ScorePill label="D" value={it.scores.delivery} />
                  </span>
                </div>
                {/* Question text */}
                <p className="text-sm font-medium text-sc-ink">{it.question}</p>
                {/* Audio playback */}
                {url ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio src={url} controls className="w-full" />
                ) : null}
                {/* Your answer */}
                {it.answer && (
                  <p className="font-mono text-xs text-sc-muted leading-relaxed">
                    {it.answer}
                  </p>
                )}
                {/* Parsed coaching sections */}
                {sec ? (
                  <div className="space-y-2 pt-1">
                    {sec.grammarFix && (
                      <div>
                        <p className="font-mono text-xs text-sc-dim uppercase tracking-wider mb-1">Grammar fix</p>
                        <p className="font-mono text-xs text-sc-muted leading-relaxed whitespace-pre-wrap">
                          {renderWithPatternTags(sec.grammarFix)}
                        </p>
                        {sec.patternTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {[...new Set(sec.patternTags)].map((tag) => (
                              <span key={tag} className="rounded-sm border border-sc-red/30 bg-sc-red/10 px-1.5 py-0.5 font-mono text-xs text-sc-red">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {sec.sampleAnswer && (
                      <div>
                        <p className="font-mono text-xs text-sc-gold uppercase tracking-wider mb-1">Sample answer</p>
                        <p className="text-sm text-sc-ink leading-relaxed">{renderSampleAnswer(sec.sampleAnswer)}</p>
                      </div>
                    )}
                    {sec.deliveryTip && (
                      <div>
                        <p className="font-mono text-xs text-sc-dim uppercase tracking-wider mb-1">Delivery tip</p>
                        <p className="text-xs text-sc-muted leading-relaxed">{sec.deliveryTip}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-xs text-sc-dim leading-relaxed">
                    {stripMeta(it.feedback)}
                  </pre>
                )}
                {/* Re-drill link */}
                <Link
                  href={`/stagecraft/drill?q=${encodeURIComponent(it.question)}`}
                  className="inline-block font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors"
                >
                  Re-drill this question →
                </Link>
              </div>
            );
          })}
        </div>
      </details>

      {/* Memorize tonight — top 3 sample answers from lowest-scoring questions */}
      <MemorizePanel items={props.items} />

      {/* Action cards — contextual next steps based on scores */}
      <div className="space-y-2">
        <h2 className="font-mono text-xs tracking-widest text-sc-dim uppercase">
          What to do next
        </h2>

        {/* Lowest axis → specific drill */}
        {lowestAxis === "english" && (
          <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sc-ink">English was your weakest axis</p>
              <p className="font-mono text-xs text-sc-dim mt-0.5">
                Run your next session with Focus: Grammar — the grader will penalise harder.
              </p>
            </div>
            <Link
              href="/stagecraft/patterns"
              className="shrink-0 rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-3 py-1.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
            >
              Patterns →
            </Link>
          </div>
        )}

        {lowestAxis === "delivery" && (
          <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sc-ink">Delivery is trailing your content</p>
              <p className="font-mono text-xs text-sc-dim mt-0.5">
                Run a Drill with Focus: Confidence — shorter answers, stronger openers.
              </p>
            </div>
            <Link
              href="/stagecraft/drill"
              className="shrink-0 rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-3 py-1.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
            >
              Drill →
            </Link>
          </div>
        )}

        {/* Repeated pattern → targeted drill */}
        {topPattern && (
          <div className="rounded-sm border border-sc-red/20 bg-sc-red/3 px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sc-ink">
                <span className="text-sc-red">&ldquo;{topPattern[0]}&rdquo;</span> appeared {topPattern[1].length}× today
              </p>
              <p className="font-mono text-xs text-sc-dim mt-0.5">
                This is your most frequent pattern. Fix it before the next session.
              </p>
            </div>
            <Link
              href="/stagecraft/patterns"
              className="shrink-0 rounded-sm border border-sc-red/30 bg-sc-red/5 px-3 py-1.5 font-mono text-xs text-sc-red hover:brightness-110 transition-colors"
            >
              See trend →
            </Link>
          </div>
        )}

        {/* Weakest question → re-drill */}
        {weakestItem && props.items.length >= 3 && (
          <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sc-ink">
                Q{weakestItem.index} was your toughest
              </p>
              <p className="font-mono text-xs text-sc-dim mt-0.5 truncate">
                {weakestItem.question}
              </p>
            </div>
            <Link
              href={`/stagecraft/drill?q=${encodeURIComponent(weakestItem.question)}`}
              className="shrink-0 rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-3 py-1.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
            >
              Re-drill →
            </Link>
          </div>
        )}
      </div>

      {/* Restart */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={props.onRestart}
          className="flex-1 rounded-sm bg-sc-gold px-6 py-3.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99]"
        >
          New session →
        </button>
        <Link
          href="/stagecraft/checklist"
          className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-3.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors flex items-center"
        >
          Checklist →
        </Link>
      </div>
    </section>
  );
}

// =====================================================================
// Shared atoms
// =====================================================================

function ScoreChip({ label, value }: { label: string; value: number }) {
  const band =
    value >= 8
      ? "border-sc-green/40 bg-sc-green-bg"
      : value >= 5
        ? "border-sc-gold-dim bg-sc-gold-bg"
        : value > 0
          ? "border-sc-red/30 bg-sc-red/10"
          : "border-sc-border bg-sc-surface";

  const textColor =
    value >= 8
      ? "text-sc-green"
      : value >= 5
        ? "text-sc-gold"
        : value > 0
          ? "text-sc-red"
          : "text-sc-dim";

  return (
    <div className={`rounded-sm border px-4 py-3 ${band}`}>
      <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1">
        {label}
      </p>
      <p className={`font-display text-3xl font-semibold ${textColor}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const color =
    value >= 8 ? "text-sc-green" : value >= 5 ? "text-sc-gold" : "text-sc-red";
  return (
    <span className={`font-mono text-xs ${color}`}>
      {label}
      {value}
    </span>
  );
}

// ── Recording timer ───────────────────────────────────────────────────────────
// Counts elapsed seconds; resets each time recording starts.

function useRecordingTimer(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  return elapsed;
}

// Thin SVG arc showing progress toward 90 s cap.
// r=26 → circumference ≈ 163.4
function TimerArc({ elapsed }: { elapsed: number }) {
  const MAX = 90;
  const pct = Math.min(elapsed / MAX, 1);
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color =
    elapsed >= 90
      ? "var(--sc-red, #e05555)"
      : elapsed >= 60
        ? "var(--sc-gold, #c9a84c)"
        : "var(--sc-green, #4caf79)";

  return (
    <svg
      viewBox="0 0 64 64"
      className="absolute inset-0 w-full h-full -rotate-90"
      aria-hidden
    >
      {/* Track */}
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor"
        strokeWidth="2" className="text-sc-border opacity-40" />
      {/* Progress */}
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 0.4s linear, stroke 0.4s" }}
      />
    </svg>
  );
}

function MicButton(props: {
  recorderState: RecorderState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}) {
  const elapsed = useRecordingTimer(props.recorderState === "recording");

  const timerColor =
    elapsed >= 90
      ? "text-sc-red"
      : elapsed >= 60
        ? "text-sc-gold"
        : "text-sc-green";

  const timerLabel =
    elapsed >= 90
      ? "— too long, wrap up"
      : elapsed >= 60
        ? "— start closing"
        : null;

  const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (props.recorderState === "uploading") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-16 h-16 rounded-full border-2 border-sc-gold-dim flex items-center justify-center">
          <svg
            className="w-5 h-5 text-sc-gold animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="32"
              strokeDashoffset="10"
            />
          </svg>
        </div>
        <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
          Transcribing…
        </p>
      </div>
    );
  }

  if (props.recorderState === "recording") {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        {/* Stop button + arc timer */}
        <div className="relative w-20 h-20">
          <TimerArc elapsed={elapsed} />
          <button
            type="button"
            onClick={props.onStop}
            className="absolute inset-1.5 rounded-full bg-sc-red flex items-center justify-center hover:brightness-110 transition-all sc-pulse-ring"
            aria-label="Stop recording"
          >
            <span className="w-4 h-4 rounded-sm bg-white" />
          </button>
        </div>

        {/* Elapsed time + hint */}
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono text-lg font-semibold tabular-nums ${timerColor}`}>
            {mm}:{ss}
          </span>
          {timerLabel && (
            <span className={`font-mono text-xs ${timerColor}`}>
              {timerLabel}
            </span>
          )}
        </div>

        <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
          Tap to stop
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 py-4 transition-opacity ${props.disabled ? "opacity-30 pointer-events-none" : ""}`}>
      <button
        type="button"
        onClick={props.onStart}
        disabled={props.disabled}
        className="relative w-16 h-16 rounded-full border-2 border-sc-gold-dim bg-sc-surface flex items-center justify-center hover:border-sc-gold hover:bg-sc-raised transition-all group disabled:cursor-not-allowed"
        aria-label="Start recording"
      >
        {/* Microphone icon */}
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-sc-gold"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      </button>
      <p className="font-mono text-xs tracking-widest text-sc-dim uppercase">
        {props.disabled ? "wait…" : "Tap to speak"}
      </p>
    </div>
  );
}

// =====================================================================
// Answer mode toggle — Speak / Type
// =====================================================================

function AnswerModeToggle({
  mode,
  onChange,
}: {
  mode: "voice" | "type";
  onChange: (m: "voice" | "type") => void;
}) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-0.5 rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm p-0.5">
        <button
          type="button"
          onClick={() => onChange("voice")}
          className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-mono transition-all ${
            mode === "voice"
              ? "bg-sc-gold text-sc-void"
              : "text-sc-muted hover:text-sc-ink"
          }`}
        >
          {/* Microphone icon */}
          <svg
            viewBox="0 0 16 16"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="1" width="6" height="8" rx="3" fill={mode === "voice" ? "currentColor" : "none"} strokeWidth="1.5"/>
            <path d="M2 8a6 6 0 0 0 12 0" />
            <line x1="8" y1="14" x2="8" y2="16" />
            <line x1="5" y1="16" x2="11" y2="16" />
          </svg>
          Speak
        </button>
        <button
          type="button"
          onClick={() => onChange("type")}
          className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-mono transition-all ${
            mode === "type"
              ? "bg-sc-gold text-sc-void"
              : "text-sc-muted hover:text-sc-ink"
          }`}
        >
          {/* Pen icon */}
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
            <path d="M12.146 1.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-9 9a.5.5 0 0 1-.168.11l-3.5 1a.5.5 0 0 1-.624-.624l1-3.5a.5.5 0 0 1 .11-.168l9-9z" />
          </svg>
          Type
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Typing answer box — used in type mode
// =====================================================================

function TypeAnswerBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const wordCount = value.trim()
    ? value.trim().split(/\s+/).length
    : 0;

  // Rough spoken-time estimate: ~130 words/min
  const seconds = Math.round((wordCount / 130) * 60);
  const timeHint =
    wordCount < 10
      ? ""
      : seconds < 60
        ? `~${seconds}s`
        : `~${Math.round(seconds / 60)}m`;

  // Quality signals — shown when answer is long enough to evaluate
  const qualitySignals =
    wordCount >= 10
      ? [
          {
            ok: /\bI\b|\bmy\b/i.test(value),
            label: "Ownership",
          },
          {
            ok: /\d+/.test(value),
            label: "Number",
          },
          {
            ok: !/^\s*(So|Well|Um|Uh|Actually|Basically)\b/i.test(value),
            label: "Strong open",
          },
          {
            ok: wordCount >= 40 && wordCount <= 110,
            label: "Length",
          },
        ]
      : null;

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
      <textarea
        className="w-full bg-transparent px-4 py-3 text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none resize-none leading-relaxed font-sans"
        rows={7}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here — write it as you would say it…"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />

      {/* Quality signal chips */}
      {qualitySignals && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {qualitySignals.map(({ ok, label }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-xs transition-all ${
                ok
                  ? "border border-sc-green/30 bg-sc-green-bg text-sc-green"
                  : "border border-sc-border bg-sc-raised text-sc-dim"
              }`}
            >
              {ok ? "✓" : "·"} {label}
            </span>
          ))}
        </div>
      )}

      <div className="border-t border-sc-line px-4 py-3 flex items-center justify-between">
        <span className="font-mono text-xs text-sc-dim">
          {wordCount > 0 ? (
            <>
              {wordCount} {wordCount === 1 ? "word" : "words"}
              {timeHint && (
                <span className="ml-2 text-sc-dim/60">{timeHint} spoken</span>
              )}
            </>
          ) : (
            <span className="text-sc-dim/40">target: 60–100 words</span>
          )}
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim()}
          className="rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-30"
        >
          Submit for coaching →
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Structured feedback renderer
// =====================================================================

// ── Streaming progressive feedback ───────────────────────────────────────────
// Renders sections as their headers arrive mid-stream.  A pulsing dot shows
// which section is actively being written; sections not yet started don't render
// at all so there's no flash of empty containers.

function StreamingFeedbackRenderer({ raw }: { raw: string }) {
  const p = parseFeedbackSectionsStreaming(raw);

  // Nothing yet — pulse
  if (p.grammarFix === undefined) {
    return (
      <p className="font-mono text-xs text-sc-gold animate-pulse">
        Coaching…
      </p>
    );
  }

  const grammarDone = p.sampleAnswer !== undefined;
  const sampleDone  = p.deliveryTip !== undefined;
  const deliveryDone = p.scoreLines !== undefined;

  return (
    <div className="space-y-4">
      {/* Grammar fix */}
      <div className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-sc-line">
          <span className="w-1 h-3 rounded-full bg-sc-gold shrink-0" />
          <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
            Grammar fix
          </span>
          {!grammarDone && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sc-gold animate-pulse" />
          )}
        </div>
        <div className="px-3 py-3 space-y-2.5">
          <p className="font-mono text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">
            {renderWithPatternTags(p.grammarFix)}
          </p>
          {p.patternTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[...new Set(p.patternTags)].map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-sc-red/30 bg-sc-red/10 px-2 py-0.5 font-mono text-xs text-sc-red"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sample answer — appears once grammar header is complete */}
      {p.sampleAnswer !== undefined && (
        <div className="rounded-sm border border-sc-gold-dim/60 bg-sc-gold-bg/40 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-sc-gold-dim/30">
            <span className="w-1 h-3 rounded-full bg-sc-gold shrink-0" />
            <span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
              Sample answer
            </span>
            {!sampleDone && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sc-gold animate-pulse" />
            )}
          </div>
          <div className="px-3 py-3">
            <p className="text-sm text-sc-ink leading-relaxed">
              {renderSampleAnswer(p.sampleAnswer)}
            </p>
          </div>
        </div>
      )}

      {/* Delivery tip */}
      {p.deliveryTip !== undefined && (
        <div className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-3 py-3">
          <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1.5">
            Delivery tip
          </p>
          <p className="text-sm text-sc-muted leading-relaxed">
            {p.deliveryTip}
          </p>
          {!deliveryDone && (
            <span className="inline-block mt-1.5 w-1.5 h-1.5 rounded-full bg-sc-gold animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackRenderer({
  raw,
  memorized,
  onMemorize,
}: {
  raw: string;
  memorized: boolean;
  onMemorize: () => void;
}) {
  const sections = parseFeedbackSections(raw);

  // Fallback: if parsing fails (unexpected model output), render plain text
  if (!sections) {
    return (
      <p className="sc-feedback whitespace-pre-wrap text-sm text-sc-ink leading-relaxed font-sans">
        {stripMeta(raw)}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <GrammarFixSection sections={sections} />
      <SampleAnswerSection
        sections={sections}
        memorized={memorized}
        onMemorize={onMemorize}
      />
      <DeliveryTipSection sections={sections} />
      <ScoreSection sections={sections} />
    </div>
  );
}

// ── Grammar Fix ──────────────────────────────────────────────────────────────

function GrammarFixSection({ sections }: { sections: FeedbackSections }) {
  const isClean =
    sections.grammarFix.toLowerCase().startsWith("grammar: clean") ||
    sections.grammarFix.toLowerCase().startsWith("grammar is clean");

  return (
    <div className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-sc-line">
        <span className="w-1 h-3 rounded-full bg-sc-gold shrink-0" />
        <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
          Grammar fix
        </span>
        {isClean && (
          <span className="ml-auto font-mono text-xs text-sc-green">
            ✓ clean
          </span>
        )}
      </div>

      <div className="px-3 py-3 space-y-2.5">
        {/* Corrected text — monospace, slightly muted */}
        <p className="font-mono text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">
          {/* Highlight [pattern tags] inside the grammar text */}
          {renderWithPatternTags(sections.grammarFix)}
        </p>

        {/* Pattern tag pills */}
        {sections.patternTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
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
      </div>
    </div>
  );
}

// ── Annotated transcript ──────────────────────────────────────────────────────
// Shows John's original answer with:
//   • Filler words  →  red inline chip
//   • Run-on sentences (>22 words)  →  amber sentence underline + pill
// No AI call; purely deterministic regex/heuristic.

const FILLER_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bactually\b/gi,     label: "actually"     },
  { re: /\bthe same\b/gi,     label: "the same"     },
  { re: /\bkind of\b/gi,      label: "kind of"      },
  { re: /\bas such\b/gi,      label: "as such"      },
  { re: /\bbasically\b/gi,    label: "basically"    },
  { re: /\byou know\b/gi,     label: "you know"     },
  { re: /\bdo the needful\b/gi, label: "do the needful" },
  { re: /\bkindly\b/gi,       label: "kindly"       },
  { re: /\bI mean\b/gi,       label: "I mean"       },
  { re: /\bright\?\s/gi,      label: "right?"       },
];

const RUN_ON_THRESHOLD = 22; // words per sentence

// Split text into sentence strings, preserving punctuation.
function splitSentences(text: string): string[] {
  // Split on . ! ? followed by space or end-of-string, keeping the delimiter.
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Render a single sentence with filler words wrapped in chips.
function renderAnnotatedSentence(
  sentence: string,
  isRunOn: boolean,
): React.ReactNode {
  // Build an array of [text, isFiller, label] chunks.
  interface Chunk { text: string; filler: boolean; label?: string }
  const chunks: Chunk[] = [{ text: sentence, filler: false }];

  for (const { re, label } of FILLER_PATTERNS) {
    const next: Chunk[] = [];
    for (const chunk of chunks) {
      if (chunk.filler) { next.push(chunk); continue; }
      const parts = chunk.text.split(re);
      const matches = chunk.text.match(re) ?? [];
      parts.forEach((part, i) => {
        if (part) next.push({ text: part, filler: false });
        if (i < matches.length) {
          next.push({ text: matches[i]!, filler: true, label });
        }
      });
    }
    chunks.length = 0;
    chunks.push(...next);
  }

  return (
    <span
      className={
        isRunOn
          ? "rounded px-0.5 border-b-2 border-sc-gold/40"
          : ""
      }
      title={isRunOn ? `Long sentence (${sentence.split(/\s+/).length} words) — break it up` : undefined}
    >
      {chunks.map((c, i) =>
        c.filler ? (
          <mark
            key={i}
            className="rounded-sm border border-sc-red/40 bg-sc-red/10 px-1 py-0 font-mono text-xs text-sc-red not-italic mx-0.5"
            title={`Filler — remove "${c.label}"`}
          >
            {c.text}
          </mark>
        ) : (
          <span key={i}>{c.text}</span>
        ),
      )}
    </span>
  );
}

function AnnotatedTranscript({ transcript }: { transcript: string }) {
  const [open, setOpen] = useState(false);
  if (!transcript.trim()) return null;

  const sentences = splitSentences(transcript);
  const wordCount = transcript.trim().split(/\s+/).length;

  // Count flags
  const runOnCount = sentences.filter(
    (s) => s.split(/\s+/).length > RUN_ON_THRESHOLD,
  ).length;
  const fillerCount = FILLER_PATTERNS.reduce(
    (acc, { re }) => acc + (transcript.match(re)?.length ?? 0),
    0,
  );
  const flagCount = runOnCount + fillerCount;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm overflow-hidden"
    >
      <summary className="flex items-center justify-between px-3 py-2 cursor-pointer list-none select-none">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3 rounded-full bg-sc-dim shrink-0" />
          <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
            Your answer — annotated
          </span>
        </div>
        <div className="flex items-center gap-2">
          {flagCount > 0 && (
            <span className="font-mono text-xs text-sc-red">
              {flagCount} flag{flagCount !== 1 ? "s" : ""}
            </span>
          )}
          {flagCount === 0 && (
            <span className="font-mono text-xs text-sc-green">clean</span>
          )}
          <span className="font-mono text-xs text-sc-dim">
            {wordCount}w · {open ? "collapse" : "expand"}
          </span>
        </div>
      </summary>

      <div className="border-t border-sc-line px-3 pt-3 pb-4 space-y-3">
        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 font-mono text-xs text-sc-dim">
            <mark className="rounded-sm border border-sc-red/40 bg-sc-red/10 px-1 font-mono text-xs text-sc-red not-italic">
              word
            </mark>
            filler word
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-sc-dim">
            <span className="inline-block w-6 h-px border-b-2 border-sc-gold/40" />
            run-on sentence (&gt;{RUN_ON_THRESHOLD} words)
          </span>
        </div>

        {/* Annotated text */}
        <p className="text-sm text-sc-muted leading-relaxed">
          {sentences.map((s, i) => {
            const wc = s.split(/\s+/).length;
            const isRunOn = wc > RUN_ON_THRESHOLD;
            return (
              <span key={i}>
                {renderAnnotatedSentence(s, isRunOn)}
                {i < sentences.length - 1 ? " " : ""}
              </span>
            );
          })}
        </p>

        {/* Summary chips */}
        {(runOnCount > 0 || fillerCount > 0) && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-sc-line">
            {runOnCount > 0 && (
              <span className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-2 py-0.5 font-mono text-xs text-sc-gold">
                {runOnCount} run-on{runOnCount !== 1 ? "s" : ""} — use full stops
              </span>
            )}
            {fillerCount > 0 && (
              <span className="rounded-sm border border-sc-red/30 bg-sc-red/10 px-2 py-0.5 font-mono text-xs text-sc-red">
                {fillerCount} filler{fillerCount !== 1 ? "s" : ""} — cut entirely
              </span>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

// ── useSpeech — Web Speech API wrapper ───────────────────────────────────────

function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Clean text for speech: strip markdown markers, convert [pause] to a pause
    const clean = text
      .replace(/\*\*([^*]+)\*\*/g, "$1")   // **bold** → bold
      .replace(/\[pause\]/gi, "... ")        // [pause] → audible pause
      .replace(/\[[^\]]+\]/g, " ")           // any other [tags] → space
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate  = 0.88;   // slightly slower than default — executive cadence
    utterance.pitch = 1.0;

    // Prefer a clear English voice; fall back gracefully
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
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return { speaking, speak, stop };
}

// ── Sample Answer ────────────────────────────────────────────────────────────

function SampleAnswerSection({
  sections,
  memorized,
  onMemorize,
}: {
  sections: FeedbackSections;
  memorized: boolean;
  onMemorize: () => void;
}) {
  const { speaking, speak, stop } = useSpeech();

  return (
    <div
      className={`rounded-sm border bg-sc-gold-bg overflow-hidden transition-colors ${
        speaking ? "border-sc-gold" : "border-sc-gold-dim"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sc-gold-dim/50">
        <div className="flex items-center gap-2">
          <span
            className={`w-1 h-3 rounded-full shrink-0 transition-all ${
              speaking ? "bg-sc-gold animate-pulse" : "bg-sc-gold"
            }`}
          />
          <span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
            Sample answer — memorize this
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Listen / Stop button */}
          <button
            type="button"
            onClick={speaking ? stop : () => speak(sections.sampleAnswer)}
            className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-mono transition-all ${
              speaking
                ? "border-sc-gold bg-sc-gold text-sc-void"
                : "border-sc-gold-dim text-sc-gold hover:bg-sc-gold/10"
            }`}
            title={speaking ? "Stop playback" : "Listen to this answer"}
          >
            {speaking ? (
              <>
                <span className="inline-block w-2 h-2 bg-sc-void rounded-sm" />
                <span>Stop</span>
              </>
            ) : (
              <>
                {/* Play triangle */}
                <svg
                  viewBox="0 0 8 10"
                  className="w-2 h-2.5 fill-current"
                >
                  <path d="M0 0 L8 5 L0 10 Z" />
                </svg>
                <span>Listen</span>
              </>
            )}
          </button>

          {/* Memorize button */}
          <button
            type="button"
            onClick={onMemorize}
            disabled={memorized}
            className={`flex items-center gap-1 rounded-sm border px-2 py-1 text-xs font-mono transition-all ${
              memorized
                ? "border-sc-green/40 bg-sc-green-bg text-sc-green"
                : "border-sc-gold-dim text-sc-gold hover:bg-sc-gold/10"
            }`}
            title="Add to memorize queue"
          >
            <span>{memorized ? "♥" : "♡"}</span>
            <span>{memorized ? "Memorized" : "Memorize"}</span>
          </button>
        </div>
      </div>

      {/* Answer text */}
      <div className="px-4 py-4">
        <p
          className={`text-base leading-relaxed transition-colors ${
            speaking ? "text-sc-ink" : "text-sc-ink"
          }`}
        >
          {renderSampleAnswer(sections.sampleAnswer)}
        </p>

        {speaking && (
          <p className="mt-3 font-mono text-xs text-sc-gold animate-pulse">
            Speaking — read along, then repeat from memory
          </p>
        )}
      </div>
    </div>
  );
}

// ── Delivery Tip ─────────────────────────────────────────────────────────────

function DeliveryTipSection({ sections }: { sections: FeedbackSections }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm">
      <span className="font-mono text-xs tracking-widest text-sc-dim uppercase shrink-0 mt-0.5">
        Tip
      </span>
      <p className="text-sm text-sc-muted italic leading-snug">
        {sections.deliveryTip}
      </p>
    </div>
  );
}

// ── Score ─────────────────────────────────────────────────────────────────────

function ScoreSection({ sections }: { sections: FeedbackSections }) {
  // Parse "Content: X/10" style lines from scoreLines
  const parseScore = (label: string) => {
    const m = sections.scoreLines.match(
      new RegExp(`${label}\\s*:\\s*(\\d+)\\s*/\\s*10`, "i"),
    );
    return m ? Number(m[1]) : null;
  };

  const content  = parseScore("Content");
  const english  = parseScore("English");
  const delivery = parseScore("Delivery");

  // Strip inline scores so we don't show them twice; keep explanations
  const explanation = sections.scoreLines
    .replace(/[-–]\s*(Content|English|Delivery)\s*:\s*\d+\s*\/\s*10\s*/gi, "")
    .replace(/^\s*[-–•]\s*/gm, "")
    .trim();

  return (
    <div className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-sc-line">
        <span className="w-1 h-3 rounded-full bg-sc-muted shrink-0" />
        <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
          Score
        </span>
      </div>
      <div className="px-3 py-3 space-y-3">
        {/* Chip row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Content",  value: content },
            { label: "English",  value: english },
            { label: "Delivery", value: delivery },
          ].map(({ label, value }) => (
            <div
              key={label}
              className={`rounded-sm border px-3 py-2 text-center ${scoreBand(value)}`}
            >
              <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-0.5">
                {label}
              </p>
              <p className={`font-display text-2xl font-semibold ${scoreColor(value)}`}>
                {value ?? "—"}
              </p>
            </div>
          ))}
        </div>
        {/* Explanation text */}
        {explanation && (
          <p className="text-xs text-sc-muted leading-relaxed whitespace-pre-wrap">
            {explanation}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Inline renderers ─────────────────────────────────────────────────────────

// Render the grammar fix text: wrap [pattern tags] in a subtle highlight
// renderWithPatternTags and renderSampleAnswer are imported from
// @/lib/stagecraft/feedbackRenderers

// ── Memorize tonight panel ────────────────────────────────────────────────────
// Surfaces up to 3 sample answers from the session's lowest-scoring questions.
// These are the ones John needs most — weakest scores = most room to memorize.

function MemorizePanel({ items }: { items: QAItem[] }) {
  const [saved, setSaved] = useState<Set<number>>(() => new Set());
  const [saving, setSaving] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Pick up to 3 lowest-composite items that have a parseable sample answer
  const candidates = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const ca = a.scores.content * 0.4 + a.scores.english * 0.3 + a.scores.delivery * 0.3;
        const cb = b.scores.content * 0.4 + b.scores.english * 0.3 + b.scores.delivery * 0.3;
        return ca - cb;
      })
      .map((it) => ({ item: it, sample: extractSampleAnswer(it.feedback) }))
      .filter((x): x is { item: QAItem; sample: string } => x.sample !== null)
      .slice(0, 3);
  }, [items]);

  if (candidates.length === 0) return null;

  const handleSave = async (index: number, question: string, sample: string) => {
    setSaving(index);
    setErr(null);
    try {
      const res = await fetch("/api/stagecraft/memorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", question, answer: sample }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSaved((prev) => new Set([...prev, index]));
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-sc-gold-dim/40 flex items-center gap-2">
        <span className="text-sc-gold text-xs">♥</span>
        <span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
          Memorize tonight — {candidates.length} answer{candidates.length !== 1 ? "s" : ""}
        </span>
      </div>
      {err && (
        <p className="px-4 py-2 font-mono text-xs text-sc-red">{err}</p>
      )}
      <div className="divide-y divide-sc-gold-dim/30">
        {candidates.map(({ item, sample }, i) => (
          <div key={item.index} className="px-4 py-4 space-y-2">
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-sc-gold/60 shrink-0 mt-0.5">Q{item.index}</span>
              <p className="text-xs text-sc-muted flex-1 leading-snug">{item.question}</p>
              <button
                type="button"
                onClick={() => void handleSave(item.index, item.question, sample)}
                disabled={saved.has(item.index) || saving === item.index}
                className={`flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-xs transition-all shrink-0 ${
                  saved.has(item.index)
                    ? "border-sc-green/40 bg-sc-green-bg text-sc-green"
                    : "border-sc-gold-dim text-sc-gold hover:bg-sc-gold/10 disabled:opacity-50"
                }`}
              >
                {saved.has(item.index) ? "✓ Saved" : saving === item.index ? "…" : "♥ Add"}
              </button>
            </div>
            {/* Sample answer with delivery markers */}
            <div className="pl-7">
              <p className="text-sm text-sc-ink leading-relaxed">
                {renderSampleAnswer(sample)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-sc-gold-dim/40">
        <Link
          href="/stagecraft/memorize"
          className="font-mono text-xs text-sc-gold hover:text-sc-gold/80 transition-colors"
        >
          Open memorize queue →
        </Link>
      </div>
    </div>
  );
}

function scoreBand(v: number | null): string {
  if (v === null) return "border-sc-border";
  if (v >= 8)  return "border-sc-green/40 bg-sc-green-bg";
  if (v >= 5)  return "border-sc-gold-dim bg-sc-gold-bg";
  return "border-sc-red/30 bg-sc-red/10";
}

function scoreColor(v: number | null): string {
  if (v === null) return "text-sc-dim";
  if (v >= 8)  return "text-sc-green";
  if (v >= 5)  return "text-sc-gold";
  return "text-sc-red";
}

// ── Running session score strip ───────────────────────────────────────────────
// Shown beneath the progress bar once the first question is answered.
// Gives John a live read on his trajectory without leaving the question loop.

function SessionScoreStrip({ items }: { items: QAItem[] }) {
  const n = items.length;
  const sum = items.reduce(
    (acc, it) => {
      acc.content += it.scores.content;
      acc.english += it.scores.english;
      acc.delivery += it.scores.delivery;
      return acc;
    },
    { content: 0, english: 0, delivery: 0 },
  );
  const avgC = +(sum.content / n).toFixed(1);
  const avgE = +(sum.english / n).toFixed(1);
  const avgD = +(sum.delivery / n).toFixed(1);
  const composite = +(avgC * 0.4 + avgE * 0.3 + avgD * 0.3).toFixed(1);

  // Patterns flagged ≥2× in this session
  const patMap = new Map<string, number>();
  for (const it of items) {
    for (const p of it.patterns) patMap.set(p, (patMap.get(p) ?? 0) + 1);
  }
  const recurring = Array.from(patMap.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  return (
    <div className="border-b border-sc-border bg-sc-raised px-6 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center gap-5 flex-wrap">
        <span className="font-mono text-xs tracking-widest text-sc-dim uppercase shrink-0">
          Session · {n}Q
        </span>
        <div className="flex items-center gap-4">
          {(
            [
              { label: "C", value: avgC, title: "Content avg" },
              { label: "E", value: avgE, title: "English avg" },
              { label: "D", value: avgD, title: "Delivery avg" },
            ] as const
          ).map(({ label, value, title }) => (
            <span key={label} className="flex items-baseline gap-0.5" title={title}>
              <span className="font-mono text-xs text-sc-dim">{label}</span>
              <span className={`font-mono text-sm font-semibold tabular-nums ${scoreColor(value)}`}>
                {value}
              </span>
            </span>
          ))}
          <span className="flex items-baseline gap-0.5 border-l border-sc-border pl-4" title="Composite">
            <span className="font-mono text-xs text-sc-dim">avg</span>
            <span className={`font-mono text-sm font-semibold tabular-nums ${scoreColor(composite)}`}>
              {composite}
            </span>
          </span>
        </div>
        {recurring.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="font-mono text-xs text-sc-dim uppercase tracking-wider shrink-0">Recurring:</span>
            <div className="flex flex-wrap gap-1.5">
              {recurring.map(([tag, count]) => (
                <span
                  key={tag}
                  className="rounded-sm border border-sc-red/30 bg-sc-red/10 px-1.5 py-0.5 font-mono text-xs text-sc-red"
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
