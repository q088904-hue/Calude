"use client";

// Stagecraft — Recruiter Message Coach.
// Paste a recruiter email or LinkedIn message / job description.
// Get: a drafted reply in John's voice + 5 likely first-call questions
// with drill links, and a fit-gap assessment.
//
// State: compose → analyzing → result

import { useCallback, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import type { RecruiterPayload } from "@/app/api/stagecraft/recruiter/route";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = "compose" | "analyzing" | "result";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLACEHOLDER_EXAMPLES = [
  `Hi John,

I came across your profile and I'm impressed by your creative leadership background. We have an exciting Creative Director opportunity at Kohler India — premium plumbing and lifestyle brand. The role oversees brand campaigns, retail experience, and digital creative across the India market.

Would you be open to a quick 20-minute exploratory call this week?

Best,
Priya Sharma
Talent Acquisition, Kohler India`,

  `Hi John,

Hope this finds you well. I'm reaching out about a VP Brand & Creative role at a luxury hospitality group in Dubai (5-star portfolio, 8 properties). They're looking for a seasoned creative leader to unify their brand narrative and digital presence.

Budget: AED 35-42K/month + housing + flights. UAE residency preferred but will sponsor.

Are you open to a conversation?

Regards,
Ahmed Al-Rashid
Executive Search, Dubai`,
];

/** Maps a detected company name string to a company pack ID. */
function resolveCompanyId(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("kohler")) return "kohler-india";
  if (n.includes("hettich")) return "hettich-india";
  if (n.includes("marriott")) return "marriott-dubai";
  if (n.includes("emaar")) return "emaar-dubai";
  if (n.includes("marina bay") || n.includes("sands") || n.includes("mbs")) return "marina-bay-sands";
  if (n.includes("pidilite") || n.includes("fevicol")) return "pidilite-india";
  return "kohler-india"; // default fallback
}

const ROUND_SHORT: Record<string, string> = {
  hr: "HR",
  "hiring-manager": "Hiring Manager",
  portfolio: "Portfolio / CD",
  leadership: "Leadership / CXO",
  stress: "Stress",
  mixed: "Mixed",
};

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      className={`font-mono text-[10px] transition-colors ${
        copied ? "text-sc-green" : "text-sc-dim hover:text-sc-gold"
      }`}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ── Question row ──────────────────────────────────────────────────────────────

function QuestionRow({
  q,
  n,
}: {
  q: RecruiterPayload["questions"][number];
  n: number;
}) {
  const isHard = n >= 4;
  return (
    <div
      className={`rounded-sm border overflow-hidden ${
        isHard
          ? "border-sc-red/20 bg-sc-red/3"
          : "border-sc-border bg-sc-surface"
      }`}
    >
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-start gap-3">
          <span
            className={`font-mono text-xs font-semibold shrink-0 mt-0.5 ${
              isHard ? "text-sc-red" : "text-sc-dim"
            }`}
          >
            Q{n}
          </span>
          <p className="text-sm font-medium text-sc-ink leading-snug flex-1">
            {q.question}
          </p>
        </div>
        <div className="flex items-start gap-2 pl-6">
          <span className="text-sc-gold font-mono text-xs shrink-0 mt-0.5">→</span>
          <p className="font-mono text-xs text-sc-dim leading-relaxed">{q.why}</p>
        </div>
      </div>
      <div className="border-t border-sc-line px-4 py-2.5 flex items-center gap-4">
        <Link
          href={`/stagecraft/drill?q=${encodeURIComponent(q.question)}`}
          className="font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
        >
          Drill this →
        </Link>
        <Link
          href={`/stagecraft/debrief?question=${encodeURIComponent(q.question)}`}
          className="font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
        >
          Add to debrief →
        </Link>
        <Link
          href={`/stagecraft?drill=${encodeURIComponent(q.question)}`}
          className="font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
        >
          Practice session →
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecruiterPage() {
  const [state, setState] = useState<PageState>("compose");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<RecruiterPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exampleIdx, setExampleIdx] = useState(0);

  const analyze = useCallback(async () => {
    if (!message.trim()) return;
    setError(null);
    setState("analyzing");

    try {
      const res = await fetch("/api/stagecraft/recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as RecruiterPayload;
      setResult(data);
      setState("result");
    } catch (err) {
      setError(String(err));
      setState("compose");
    }
  }, [message]);

  const reset = () => {
    setState("compose");
    setMessage("");
    setResult(null);
    setError(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <StagecraftHeader label="Recruiter">
        {state === "result" && result && (
          <div className="flex items-center gap-2">
            {result.detectedCompany && (
              <span className="font-mono text-xs text-sc-muted">
                {result.detectedCompany}
                {result.detectedRole ? ` · ${result.detectedRole}` : ""}
              </span>
            )}
            <button
              onClick={reset}
              className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-3 py-1.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
            >
              New message
            </button>
          </div>
        )}
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* ── Compose state ── */}
        {state !== "result" && (
          <>
            <div>
              <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
                Recruiter message coach
              </p>
              <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
                Got an inbound?
              </h1>
              <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
                Paste the recruiter email or LinkedIn message — or a job description.
                You&apos;ll get a reply in your voice and the five questions to
                prepare for the first call.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                  Recruiter message or JD
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMessage(PLACEHOLDER_EXAMPLES[exampleIdx] ?? "");
                    setExampleIdx(
                      (i) => (i + 1) % PLACEHOLDER_EXAMPLES.length,
                    );
                  }}
                  className="font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
                >
                  load example ↻
                </button>
              </div>
              <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden focus-within:border-sc-gold-dim transition-colors">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={PLACEHOLDER_EXAMPLES[0]}
                  rows={10}
                  disabled={state === "analyzing"}
                  className="w-full bg-transparent px-4 pt-4 pb-3 text-sm text-sc-ink placeholder:text-sc-dim focus:outline-none resize-none leading-relaxed disabled:opacity-50"
                />
                <div className="px-4 pb-3 flex justify-end">
                  <span className="font-mono text-[10px] text-sc-dim">
                    {message.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
              </div>
              <p className="font-mono text-[10px] text-sc-dim leading-relaxed">
                Paste the full message — more context = better questions.
                Job descriptions work too.
              </p>
            </div>

            {error && (
              <p className="font-mono text-xs text-sc-red">{error}</p>
            )}

            {state === "analyzing" ? (
              <div className="flex flex-col items-center gap-4 py-10">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-sc-gold animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <p className="font-mono text-xs text-sc-dim">
                  Reading the message…
                </p>
              </div>
            ) : (
              <button
                onClick={analyze}
                disabled={message.trim().length < 20}
                className="w-full rounded-sm bg-sc-gold px-6 py-3.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Analyze &amp; draft reply →
              </button>
            )}
          </>
        )}

        {/* ── Result state ── */}
        {state === "result" && result && (
          <>
            {/* Detected role */}
            {(result.detectedCompany ?? result.detectedRole) && (
              <div>
                <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-1.5">
                  {result.detectedRole ?? "Detected role"}
                </p>
                <h1 className="font-display text-2xl font-semibold text-sc-ink leading-tight">
                  {result.detectedCompany ?? "Role analysis"}
                </h1>
              </div>
            )}

            {/* Fit notes */}
            <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-4 space-y-2">
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                Fit read
              </p>
              <p className="text-sm text-sc-ink leading-relaxed">
                {result.fitNotes}
              </p>
            </div>

            {/* Drafted reply */}
            <div className="rounded-sm border border-sc-gold-dim bg-sc-gold-bg overflow-hidden">
              <div className="px-4 py-3 border-b border-sc-gold-dim/40 flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
                  Your reply — in your voice
                </p>
                <CopyButton text={result.reply} />
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-sc-ink leading-relaxed whitespace-pre-wrap">
                  {result.reply}
                </p>
              </div>
              <div className="border-t border-sc-gold-dim/30 px-4 py-2.5">
                <p className="font-mono text-[10px] text-sc-dim">
                  Edit before sending — add your name and adjust the timing
                  if needed. Keep it under 60 words.
                </p>
              </div>
            </div>

            {/* First-call questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                  5 questions to prepare — first call
                </p>
                <span className="font-mono text-[10px] text-sc-red">
                  Q4–5 are the hardest
                </span>
              </div>

              <div className="space-y-2">
                {result.questions.map((q, i) => (
                  <QuestionRow key={i} q={q} n={i + 1} />
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="border-t border-sc-border pt-6 space-y-3">
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                Prep now
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/stagecraft"
                  className="rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
                >
                  Full mock session →
                </Link>
                {result.detectedCompany && (
                  <Link
                    href={`/stagecraft/companies/${resolveCompanyId(result.detectedCompany)}`}
                    className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
                  >
                    Company prep →
                  </Link>
                )}
                <Link
                  href="/stagecraft/negotiate"
                  className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
                >
                  Negotiate simulator →
                </Link>
                <button
                  onClick={reset}
                  className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
                >
                  Another message
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
