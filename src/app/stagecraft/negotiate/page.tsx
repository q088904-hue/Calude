"use client";

// Stagecraft — Salary Negotiation Simulator.
// Five scenarios covering every moment in a compensation conversation:
// current CTC disclosure, anchoring expectations, holding against a counter,
// naming a number under pressure, and closing with a condition.
// The coaching format is tactical, not the 5-block interview grammar loop.

import { useCallback, useEffect, useRef, useState } from "react";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { getSRClass, type SREvent, type SRInstance } from "@/lib/stagecraft/speechRecognition";
import { SuggestedAnswer } from "@/components/stagecraft/SuggestedAnswer";

// ── Market bands ──────────────────────────────────────────────────────────────

const MARKETS = [
  {
    id: "mumbai",
    label: "Mumbai",
    band: "₹55–90L CTC for Creative Director at a premium brand",
    notes:
      "Fixed + variable. Push for variable to be capped, not at-risk. Ask for ESOP if the brand has a holding structure.",
  },
  {
    id: "dubai",
    label: "Dubai",
    band: "AED 28,000–45,000/month all-in for a senior creative leadership role",
    notes:
      "Tax-free base. Always negotiate the package: housing allowance, annual flights, school fees, health cover for family.",
  },
  {
    id: "singapore",
    label: "Singapore",
    band: "SGD 13,000–22,000/month for Creative Director / VP Brand level",
    notes:
      "13-month salary is standard. Negotiate: housing subsidy, work pass support, annual bonus structure.",
  },
] as const;

type MarketId = (typeof MARKETS)[number]["id"];

// ── Scenarios ─────────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: "current-ctc",
    label: "Current CTC",
    tag: "The opening trap",
    question:
      "What is your current CTC? We need to understand where you are before we can discuss an offer.",
    context:
      "You are not legally required to disclose. Sharing it anchors their offer to your history, not your market value. Deflect — redirect to the role's scope and the market.",
    tactic: "Deflect. Redirect to market value, not current pay.",
    risk: true,
  },
  {
    id: "expectations",
    label: "Expectations",
    tag: "Your anchor moment",
    question: "What are your salary expectations for this role?",
    context:
      "This is your chance to anchor first. Go high with a range — where your floor is already a good number. Back it with market data and role complexity.",
    tactic: "Anchor high. State a range. Back it with market and scope.",
    risk: false,
  },
  {
    id: "above-budget",
    label: "Above budget",
    tag: "The counter-anchor",
    question:
      "That is above our budget. We were thinking more in the ₹42–48L range. Can you work with that?",
    context:
      "They have anchored low. Do not immediately counter with a number — that validates their anchor. Reframe with total compensation, role scope, and what the market pays for this responsibility.",
    tactic: "Do not counter numerically first. Reframe total comp and scope.",
    risk: true,
  },
  {
    id: "need-a-number",
    label: "Need a number",
    tag: "Pressure to break",
    question:
      "I appreciate the context, but we need a specific number from you right now to move this forward.",
    context:
      "When cornered, name a number — but name your aspiration number, not your floor. State it calmly, without hedging or apologising. Silence after is a feature, not a failure.",
    tactic: "Name the aspiration number. No hedge. No apology. Let silence work.",
    risk: true,
  },
  {
    id: "final-offer",
    label: "Final offer",
    tag: "The close",
    question:
      "Our final offer is ₹62L CTC. This is the best we can do. Can we move forward?",
    context:
      "Before accepting anything called 'final', ask for one more thing — a signing bonus, an earlier performance review, extra leave days, or a relocation allowance. You almost always get it.",
    tactic: "Accept with a condition. Never accept flat — ask for one more thing.",
    risk: false,
  },
] as const;

type ScenarioId = (typeof SCENARIOS)[number]["id"];

// ── Feedback parser ───────────────────────────────────────────────────────────

interface NegotiateBlocks {
  tacticalRead: string;
  betterResponse: string;
  whyItWorks: string;
  verdict: string;
  verdictKind: "held" | "partial" | "caved";
}

function parseNegotiateFeedback(raw: string): NegotiateBlocks | null {
  const H_TACTICAL = /\*\*\s*Tactical read\s*:\s*\*\*/i;
  const H_BETTER   = /\*\*\s*Better response\s*:\s*\*\*/i;
  const H_WHY      = /\*\*\s*Why it works\s*:\s*\*\*/i;
  const H_VERDICT  = /\*\*\s*Verdict\s*:\s*\*\*/i;

  const tm = H_TACTICAL.exec(raw);
  const bm = H_BETTER.exec(raw);
  const wm = H_WHY.exec(raw);
  const vm = H_VERDICT.exec(raw);

  if (!tm || !bm || !wm || !vm) return null;

  const slice = (from: RegExpExecArray, to: RegExpExecArray) =>
    raw.slice(from.index + from[0].length, to.index).trim();

  const tacticalRead  = slice(tm, bm);
  const betterResponse = slice(bm, wm);
  const whyItWorks    = slice(wm, vm);
  const verdict       = raw.slice(vm.index + vm[0].length).trim();

  const verdictKind: NegotiateBlocks["verdictKind"] =
    verdict.startsWith("✓") ? "held"
    : verdict.startsWith("~") ? "partial"
    : "caved";

  return { tacticalRead, betterResponse, whyItWorks, verdict, verdictKind };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RecorderState = "idle" | "recording" | "uploading" | "transcribed";

interface Attempt {
  n: number;
  scenarioId: ScenarioId;
  transcript: string;
  blocks: NegotiateBlocks;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VerdictBadge({ kind }: { kind: NegotiateBlocks["verdictKind"] }) {
  const cfg = {
    held:    { label: "✓ Held",    cls: "border-sc-green/40 bg-sc-green-bg text-sc-green" },
    partial: { label: "~ Partial", cls: "border-sc-gold-dim bg-sc-gold-bg text-sc-gold" },
    caved:   { label: "✗ Caved",   cls: "border-sc-red/40 bg-sc-red/5 text-sc-red" },
  }[kind];
  return (
    <span className={`inline-flex items-center rounded-sm border px-2.5 py-1 font-mono text-xs font-bold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function CoachBlock({
  label,
  labelColor = "text-sc-dim",
  border = "border-sc-border",
  bg = "bg-sc-surface",
  children,
}: {
  label: string;
  labelColor?: string;
  border?: string;
  bg?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className={`font-mono text-[10px] tracking-widest uppercase ${labelColor}`}>
        {label}
      </p>
      <div className={`rounded-sm border ${border} ${bg} px-4 py-3 text-sm text-sc-ink leading-relaxed`}>
        {children}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NegotiatePage() {
  const [market, setMarket] = useState<MarketId>("mumbai");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("current-ctc");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptN, setAttemptN] = useState(0);

  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [answerMode, setAnswerMode] = useState<"voice" | "type">("voice");
  const [transcript, setTranscript] = useState("");

  const [rawFeedback, setRawFeedback] = useState("");
  const [feedbackStreaming, setFeedbackStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Web Speech API
  const srRef = useRef<SRInstance | null>(null);
  const srTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [browserRecording, setBrowserRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [srSeconds, setSrSeconds] = useState(0);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const activeMarket = MARKETS.find((m) => m.id === market)!;

  const hasFeedback = rawFeedback.length > 0 && !feedbackStreaming;
  const blocks = hasFeedback ? parseNegotiateFeedback(rawFeedback) : null;
  const lastAttempt = attempts[attempts.length - 1];

  // Tally held/partial/caved for this scenario
  const scenarioAttempts = attempts.filter((a) => a.scenarioId === scenarioId);
  const heldCount = scenarioAttempts.filter((a) => a.blocks.verdictKind === "held").length;

  useEffect(() => {
    setSpeechSupported(getSRClass() !== null);
    return () => {
      srRef.current?.stop();
      if (srTimerRef.current) clearInterval(srTimerRef.current);
    };
  }, []);

  const switchScenario = (id: ScenarioId) => {
    if (id === scenarioId) return;
    srRef.current?.stop();
    setBrowserRecording(false);
    setInterimText("");
    setScenarioId(id);
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
      setError("Microphone blocked. Check your browser settings and try again.");
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
      if (!res.ok) throw new Error("Transcription failed — type your answer instead.");
      const json = (await res.json()) as { text: string };
      setTranscript(json.text ?? "");
      setRecorderState("transcribed");
    } catch (err) {
      setError(String(err));
      setRecorderState("idle");
    }
  }, []);

  const toggleBrowserVoice = useCallback(() => {
    const SR = getSRClass();
    if (!SR) return;
    if (browserRecording) {
      srRef.current?.stop();
      if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; }
      return;
    }
    setTranscript("");
    setInterimText("");
    setError(null);
    setSrSeconds(0);
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
          setTranscript(final);
          setInterimText("");
        } else {
          setInterimText(seg);
        }
      }
    };
    sr.onerror = () => {
      if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; }
      setBrowserRecording(false);
      setInterimText("");
    };
    sr.onend = () => {
      if (srTimerRef.current) { clearInterval(srTimerRef.current); srTimerRef.current = null; }
      setBrowserRecording(false);
      setInterimText("");
    };
    sr.start();
    srRef.current = sr;
    srTimerRef.current = setInterval(() => setSrSeconds((s) => s + 1), 1000);
    setBrowserRecording(true);
  }, [browserRecording]);

  // ── Coaching ──────────────────────────────────────────────────────────────

  const submitAnswer = useCallback(async () => {
    if (!transcript.trim()) return;
    setRawFeedback("");
    setFeedbackStreaming(true);
    setError(null);
    const n = attemptN + 1;
    setAttemptN(n);
    try {
      const res = await fetch("/api/stagecraft/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          scenarioQuestion: scenario.question,
          answer: transcript,
          market: activeMarket.label,
          marketBand: activeMarket.band,
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
      const parsed = parseNegotiateFeedback(acc);
      if (parsed) {
        setAttempts((prev) => [
          ...prev,
          { n, scenarioId: scenario.id as ScenarioId, transcript, blocks: parsed },
        ]);
      }
    } catch (err) {
      setError(String(err));
      setFeedbackStreaming(false);
    }
  }, [activeMarket, attemptN, scenario, transcript]);

  const retry = useCallback(() => {
    srRef.current?.stop();
    setBrowserRecording(false);
    setInterimText("");
    setTranscript("");
    setRawFeedback("");
    setRecorderState("idle");
    setError(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* ── Header ── */}
      <StagecraftHeader label="Negotiate">
        <span className="font-mono text-xs text-sc-dim tabular-nums">
          {attempts.length === 0 ? "no attempts yet" : `${attempts.length} attempt${attempts.length !== 1 ? "s" : ""}`}
        </span>
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* ── Hero ── */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            Salary negotiation
          </p>
          <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
            Don&apos;t cave. Hold the number.
          </h1>
          <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
            Five scenarios. One market. Practice until you stop apologising for your number.
          </p>
        </div>

        {/* ── Market selector ── */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">Market</p>
          <div className="flex gap-2 flex-wrap">
            {MARKETS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMarket(m.id)}
                className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-all ${
                  m.id === market
                    ? "border-sc-gold-dim bg-sc-gold-bg text-sc-gold"
                    : "border-sc-border bg-sc-surface text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {/* Band + notes */}
          <div className="rounded-sm border border-sc-border bg-sc-surface px-4 py-3 space-y-1">
            <p className="font-mono text-xs text-sc-gold">{activeMarket.band}</p>
            <p className="font-mono text-xs text-sc-dim leading-relaxed">{activeMarket.notes}</p>
          </div>
        </div>

        {/* ── Scenario selector ── */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">Scenario</p>
          <div className="rounded-sm border border-sc-border bg-sc-surface divide-y divide-sc-line overflow-hidden">
            {SCENARIOS.map((s) => {
              const sAttempts = attempts.filter((a) => a.scenarioId === s.id);
              const sHeld = sAttempts.filter((a) => a.blocks.verdictKind === "held").length;
              const isActive = s.id === scenarioId;
              return (
                <button
                  key={s.id}
                  onClick={() => switchScenario(s.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                    isActive ? "bg-sc-gold-bg" : "hover:bg-sc-raised"
                  }`}
                >
                  <span className={`w-0.5 self-stretch rounded-full shrink-0 ${
                    isActive ? "bg-sc-gold" : s.risk ? "bg-sc-red/30" : "bg-sc-border"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug truncate ${isActive ? "text-sc-ink" : "text-sc-ink"}`}>
                      {s.question}
                    </p>
                    <p className={`font-mono text-xs mt-0.5 ${s.risk && !isActive ? "text-sc-red/60" : "text-sc-dim"}`}>
                      {s.tag} · {s.tactic}
                    </p>
                  </div>
                  {sHeld > 0 && (
                    <span className="font-mono text-xs text-sc-green shrink-0">✓{sHeld}</span>
                  )}
                  {isActive && (
                    <span className="font-mono text-xs text-sc-gold shrink-0">◆</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Active scenario context ── */}
        <div className={`rounded-sm border p-5 ${scenario.risk ? "border-sc-red/30 bg-sc-red/5" : "border-sc-border bg-sc-surface"}`}>
          <p className={`font-mono text-[10px] tracking-widest uppercase mb-2 ${scenario.risk ? "text-sc-red" : "text-sc-dim"}`}>
            {scenario.tag}
          </p>
          <p className="text-lg font-medium leading-snug text-sc-ink mb-3">
            &ldquo;{scenario.question}&rdquo;
          </p>
          <p className="font-mono text-xs text-sc-muted leading-relaxed">{scenario.context}</p>
          <SuggestedAnswer question={scenario.question} />
        </div>

        {/* ── Score tally for this scenario ── */}
        {scenarioAttempts.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {scenarioAttempts.slice(-5).map((a, i) => {
              const cfg = {
                held:    "border-sc-green/40 bg-sc-green-bg text-sc-green",
                partial: "border-sc-gold-dim bg-sc-gold-bg text-sc-gold",
                caved:   "border-sc-red/40 bg-sc-red/5 text-sc-red",
              }[a.blocks.verdictKind];
              const sym = { held: "✓", partial: "~", caved: "✗" }[a.blocks.verdictKind];
              return (
                <span key={i} title={`Attempt ${a.n}`}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-xs font-bold ${cfg}`}>
                  {sym}
                </span>
              );
            })}
            {heldCount >= 2 && (
              <span className="font-mono text-xs text-sc-green border border-sc-green/30 bg-sc-green-bg px-2.5 py-1 rounded-sm">
                ✓ Holding under pressure
              </span>
            )}
          </div>
        )}

        {/* ── Answer area ── */}
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

            {/* Voice */}
            {answerMode === "voice" && (
              <div className="space-y-3">
                {/* Transcript display */}
                {(transcript || interimText) && (
                  <div className="rounded-sm border border-sc-border bg-sc-surface px-4 py-3">
                    <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-1.5">
                      {browserRecording ? "Listening…" : "Your response"}
                    </p>
                    <p className="text-sm text-sc-ink leading-relaxed">
                      {transcript}
                      {interimText && (
                        <span className="text-sc-muted italic"> {interimText}…</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Action row */}
                {!transcript && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Browser voice */}
                      {speechSupported && (
                        browserRecording ? (
                          <>
                            <button
                              onClick={toggleBrowserVoice}
                              className="flex items-center gap-2 rounded-sm border border-sc-red/50 bg-sc-red/10 px-4 py-3 font-mono text-sm text-sc-red animate-pulse hover:bg-sc-red/20 transition-colors"
                            >
                              <span>🎙</span>
                              <span>Listening — tap to stop</span>
                            </button>
                            <span className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${
                              srSeconds >= 50 ? "text-sc-red" : srSeconds >= 30 ? "text-sc-gold" : "text-sc-green"
                            }`}>
                              {String(Math.floor(srSeconds / 60)).padStart(1, "0")}:{String(srSeconds % 60).padStart(2, "0")}
                            </span>
                          </>
                        ) : (
                          <button
                            onClick={toggleBrowserVoice}
                            disabled={recorderState === "recording" || recorderState === "uploading"}
                            className="flex items-center gap-2 rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-3 font-mono text-sm text-sc-gold hover:brightness-105 transition-colors disabled:opacity-40"
                          >
                            <span>🎙</span>
                            <span>Speak now</span>
                          </button>
                        )
                      )}

                      {speechSupported && !browserRecording && recorderState !== "uploading" && (
                        <span className="font-mono text-xs text-sc-border">or</span>
                      )}

                      {/* Whisper */}
                      {!browserRecording && recorderState === "idle" && (
                        <button
                          onClick={startRecording}
                          className="flex items-center gap-2 rounded-sm border border-sc-border bg-sc-surface px-4 py-3 font-mono text-sm text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
                        >
                          <span>⏺</span>
                          <span>{speechSupported ? "Record (Whisper)" : "Record"}</span>
                        </button>
                      )}
                      {!browserRecording && recorderState === "recording" && (
                        <button
                          onClick={stopAndTranscribe}
                          className="flex items-center gap-2 rounded-sm border border-sc-red/50 bg-sc-red/10 px-4 py-3 font-mono text-sm text-sc-red animate-pulse hover:bg-sc-red/20 transition-colors"
                        >
                          <span>⏹</span>
                          <span>Stop recording</span>
                        </button>
                      )}
                      {!browserRecording && recorderState === "uploading" && (
                        <div className="px-4 py-3 font-mono text-sm text-sc-dim animate-pulse">
                          Transcribing…
                        </div>
                      )}
                    </div>

                    {interimText && !transcript && (
                      <p className="font-mono text-[10px] text-sc-muted italic">
                        {interimText}…
                      </p>
                    )}
                  </div>
                )}

                {/* Submit / re-record row — shown after transcript captured */}
                {transcript && !browserRecording && (
                  <div className="flex gap-2">
                    <button
                      onClick={submitAnswer}
                      className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-2 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors"
                    >
                      Get tactical coaching
                    </button>
                    <button
                      onClick={() => { setTranscript(""); setRecorderState("idle"); setBrowserRecording(false); setInterimText(""); }}
                      className="rounded-sm border border-sc-border px-4 py-2 font-mono text-xs text-sc-dim hover:text-sc-ink transition-colors"
                    >
                      Re-record
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Type */}
            {answerMode === "type" && (
              <div className="space-y-3">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Type what you would say on the call…"
                  rows={4}
                  className="w-full rounded-sm border border-sc-border bg-sc-surface px-4 py-3 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors resize-none leading-relaxed"
                />
                <button
                  disabled={!transcript.trim()}
                  onClick={submitAnswer}
                  className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-2 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Get tactical coaching
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

        {/* ── Streaming ── */}
        {feedbackStreaming && (
          <div className="rounded-sm border border-sc-border bg-sc-surface px-4 py-3 font-mono text-xs text-sc-dim animate-pulse">
            Analysing…
          </div>
        )}

        {/* ── Coaching blocks ── */}
        {hasFeedback && blocks && lastAttempt && (
          <div className="space-y-5">
            {/* Verdict badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <VerdictBadge kind={blocks.verdictKind} />
              <p className="text-sm text-sc-muted flex-1 leading-relaxed">
                {blocks.verdict.replace(/^[✓~✗]\s*(Held|Partial|Caved)\s*/i, "")}
              </p>
            </div>

            {/* Tactical read */}
            <CoachBlock label="Tactical read" labelColor="text-sc-dim">
              <p className="whitespace-pre-wrap">{blocks.tacticalRead}</p>
            </CoachBlock>

            {/* Better response — gold, always visible */}
            <CoachBlock
              label="Better response — say this instead"
              labelColor="text-sc-gold"
              border="border-sc-gold-dim"
              bg="bg-sc-gold-bg"
            >
              <p className="whitespace-pre-wrap">{blocks.betterResponse}</p>
            </CoachBlock>

            {/* Why it works */}
            <CoachBlock label="Why it works" labelColor="text-sc-dim">
              <p className="text-sc-muted">{blocks.whyItWorks}</p>
            </CoachBlock>

            {/* Try again */}
            <button
              onClick={retry}
              className="w-full rounded-sm border border-sc-border bg-sc-surface px-4 py-3 font-mono text-sm text-sc-dim hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
            >
              Try again ↩
            </button>
          </div>
        )}

        {/* ── Attempt history ── */}
        {attempts.length > 1 && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">This session</p>
            <div className="space-y-1.5">
              {[...attempts].reverse().slice(0, 8).map((a) => {
                const sym = { held: "✓", partial: "~", caved: "✗" }[a.blocks.verdictKind];
                const col = {
                  held: "text-sc-green",
                  partial: "text-sc-gold",
                  caved: "text-sc-red",
                }[a.blocks.verdictKind];
                const scenLabel = SCENARIOS.find((s) => s.id === a.scenarioId)?.label ?? a.scenarioId;
                return (
                  <div key={a.n} className="flex items-center gap-3 rounded-sm border border-sc-border bg-sc-surface px-3 py-2">
                    <span className="font-mono text-[10px] text-sc-dim w-5 text-right shrink-0">#{a.n}</span>
                    <span className={`font-mono text-xs font-bold shrink-0 ${col}`}>{sym}</span>
                    <span className="font-mono text-[10px] text-sc-dim shrink-0 hidden sm:inline">{scenLabel}</span>
                    <p className="flex-1 text-xs text-sc-muted truncate min-w-0">{a.transcript}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
