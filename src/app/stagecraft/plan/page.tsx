"use client";

// Stagecraft — 30-60-90 Day Plan Generator.
// Generates a tailored, interview-ready three-phase plan for a specific
// target company. Designed to give John a concrete, quotable answer to
// "What would you do in your first 90 days?"
//
// Flow: pick company → generate → read + study → drill the answer.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  COMPANY_PACKS,
  getPackById,
  type CompanyPack,
} from "@/lib/stagecraft/companyPacks";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = "select" | "generating" | "done";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Parse the streamed plan into labelled sections for structured display.
// Sections start with "## Day 1–30:", "## Day 31–60:", etc.
interface PlanSection {
  heading: string;
  body: string;
}

function parsePlan(raw: string): PlanSection[] {
  const sections: PlanSection[] = [];
  const lines = raw.split("\n");
  let current: PlanSection | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: line.slice(3).trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({ ...s, body: s.body.trim() }));
}

const PHASE_COLORS = [
  "border-sc-gold-dim bg-sc-gold-bg",
  "border-sc-green/30 bg-sc-green-bg",
  "border-sc-border bg-sc-surface",
  "border-sc-border bg-sc-raised",
];

const PHASE_NUM_COLORS = [
  "text-sc-gold",
  "text-sc-green",
  "text-sc-muted",
  "text-sc-dim",
];

// ── Page ──────────────────────────────────────────────────────────────────────

function PlanPageInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>("select");
  const [activePack, setActivePack] = useState<CompanyPack>(
    getPackById("kohler-india") ?? COMPANY_PACKS[0],
  );
  const [planRaw, setPlanRaw] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Pick up ?company= from URL (e.g. coming from company deep-dive)
  useEffect(() => {
    const company = searchParams.get("company");
    if (company) {
      const pack = getPackById(company);
      if (pack) setActivePack(pack);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse plan into sections when done
  const sections = state === "done" ? parsePlan(planRaw) : [];

  // ── Generate ──────────────────────────────────────────────────────────────

  const generate = useCallback(async () => {
    setError(null);
    setPlanRaw("");
    setState("generating");
    setStreaming(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/stagecraft/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: activePack.id,
          companyName: activePack.shortName,
          brandBrief: activePack.brandBrief,
          watchOuts: activePack.watchOuts,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setPlanRaw(acc);
      }

      setState("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(String(err));
      setState("select");
    } finally {
      setStreaming(false);
    }
  }, [activePack]);

  // Drill question — encode plan as context
  const drillHref = `/stagecraft/drill?q=${encodeURIComponent(
    "What would you do in your first 90 days?",
  )}&company=${activePack.id}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      <StagecraftHeader label="30-60-90 Plan">
        {state === "done" && (
          <Link
            href={drillHref}
            className="rounded-sm bg-sc-gold px-4 py-2 text-xs font-semibold text-sc-void hover:brightness-110 transition-all"
          >
            Drill this answer →
          </Link>
        )}
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Hero */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            First 90 days
          </p>
          <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
            What would you do in your first 90 days?
          </h1>
          <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
            Near-certain in the hiring manager round. The plan below is calibrated
            to your target company and written in your voice — study it, adapt it,
            own it. Then drill the answer until you can say it without reading.
          </p>
        </div>

        {/* ── Company selector (only in select/generating state) ── */}
        {state !== "done" && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
              Target company
            </p>
            <div className="space-y-2">
              {COMPANY_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setActivePack(pack)}
                  disabled={state === "generating"}
                  className={`w-full rounded-sm border px-4 py-3 text-left transition-all flex items-center justify-between gap-4 disabled:opacity-50 ${
                    activePack.id === pack.id
                      ? "border-sc-gold-dim bg-sc-gold-bg"
                      : "border-sc-border bg-sc-surface hover:border-sc-gold-dim/60"
                  }`}
                >
                  <div>
                    <p
                      className={`text-sm font-medium leading-snug ${
                        activePack.id === pack.id ? "text-sc-gold" : "text-sc-ink"
                      }`}
                    >
                      {pack.shortName}
                    </p>
                    <p className="font-mono text-[10px] text-sc-dim mt-0.5">
                      {pack.label.split("—")[1]?.trim() ?? pack.label}
                    </p>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      activePack.id === pack.id ? "bg-sc-gold" : "bg-sc-border"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Generating state ── */}
        {state === "generating" && (
          <div className="space-y-6">
            {/* Streaming preview */}
            {planRaw ? (
              <div className="rounded-sm border border-sc-border bg-sc-surface px-5 py-5">
                <p className="font-mono text-xs text-sc-gold mb-3 animate-pulse">
                  Writing your plan…
                </p>
                <p className="text-sm text-sc-muted leading-relaxed whitespace-pre-wrap">
                  {planRaw}
                </p>
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
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
                  Building your {activePack.shortName} plan…
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Select state ── */}
        {state === "select" && (
          <>
            {error && (
              <p className="font-mono text-xs text-sc-red">{error}</p>
            )}
            <button
              onClick={generate}
              className="w-full rounded-sm bg-sc-gold px-6 py-3.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all active:scale-[0.99]"
            >
              Generate my {activePack.shortName} plan →
            </button>
          </>
        )}

        {/* ── Done state — structured plan ── */}
        {state === "done" && sections.length > 0 && (
          <>
            {/* Company context strip */}
            <div className="flex items-center gap-3 rounded-sm border border-sc-border bg-sc-surface px-4 py-3">
              <span className="font-mono text-xs text-sc-gold">◆</span>
              <p className="font-mono text-xs text-sc-muted">
                {activePack.shortName} · Creative Director
              </p>
              <button
                onClick={() => {
                  setState("select");
                  setPlanRaw("");
                }}
                className="ml-auto font-mono text-[10px] text-sc-dim hover:text-sc-gold transition-colors"
              >
                Regenerate
              </button>
            </div>

            {/* Phase cards */}
            <div className="space-y-4">
              {sections.map((section, i) => (
                <div
                  key={i}
                  className={`rounded-sm border overflow-hidden ${PHASE_COLORS[i] ?? PHASE_COLORS[2]}`}
                >
                  <div className="px-5 py-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`font-display text-2xl font-semibold leading-none shrink-0 ${
                          PHASE_NUM_COLORS[i] ?? "text-sc-dim"
                        }`}
                      >
                        {i < 3 ? `${(i + 1) * 30}` : "∞"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase mb-0.5">
                          {i === 0
                            ? "Day 1–30"
                            : i === 1
                              ? "Day 31–60"
                              : i === 2
                                ? "Day 61–90"
                                : "Always"}
                        </p>
                        <p className="text-sm font-semibold text-sc-ink leading-snug">
                          {section.heading.replace(/^Day \d+[–\-]\d+:\s*/i, "").replace(/^What stays.*/i, "What stays constant.")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-sc-ink leading-relaxed">
                      {section.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* How to use this */}
            <div className="rounded-sm border border-sc-border bg-sc-surface px-4 py-4 space-y-2">
              <p className="font-mono text-[10px] tracking-widest text-sc-dim uppercase">
                How to use this
              </p>
              <ol className="space-y-1.5 text-sm text-sc-muted leading-relaxed">
                <li className="flex gap-2">
                  <span className="font-mono text-sc-gold shrink-0">1.</span>
                  Read the full plan twice. Understand the logic of each phase.
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-sc-gold shrink-0">2.</span>
                  Adapt one sentence in each phase to add your own specific
                  experience (your AI pipeline, your DAM work, a real example).
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-sc-gold shrink-0">3.</span>
                  Practice saying it out loud without reading. Aim for 90 seconds.
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-sc-gold shrink-0">4.</span>
                  Drill it with the button below until it flows naturally under
                  pressure.
                </li>
              </ol>
            </div>

            {/* Watch-outs for this company */}
            <div className="rounded-sm border border-sc-red/30 bg-sc-red/5 px-4 py-4 space-y-2">
              <p className="font-mono text-[10px] tracking-widest text-sc-red uppercase">
                Watch-outs when answering for {activePack.shortName}
              </p>
              <ul className="space-y-1.5">
                {activePack.watchOuts.slice(0, 3).map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-sc-muted leading-relaxed">
                    <span className="text-sc-red shrink-0 font-mono text-xs mt-0.5">
                      {i + 1}.
                    </span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA row */}
            <div className="flex flex-wrap gap-3 border-t border-sc-border pt-6">
              <Link
                href={drillHref}
                className="rounded-sm bg-sc-gold px-5 py-2.5 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
              >
                Drill this answer →
              </Link>
              <Link
                href={`/stagecraft/companies/${activePack.id}`}
                className="rounded-sm border border-sc-border bg-sc-surface px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
              >
                Full company prep →
              </Link>
              <button
                onClick={() => {
                  setState("select");
                  setPlanRaw("");
                }}
                className="rounded-sm border border-sc-border bg-sc-surface px-5 py-2.5 font-mono text-xs text-sc-dim hover:text-sc-gold hover:border-sc-gold-dim transition-colors"
              >
                Try another company
              </button>
            </div>

            {/* Raw text (collapsed) — for copy-paste */}
            <details className="border-t border-sc-border pt-4">
              <summary className="font-mono text-[10px] tracking-widest text-sc-dim uppercase cursor-pointer hover:text-sc-gold transition-colors">
                Copy raw text
              </summary>
              <pre className="mt-3 text-xs text-sc-dim leading-relaxed whitespace-pre-wrap font-mono overflow-auto">
                {planRaw}
              </pre>
            </details>
          </>
        )}
      </main>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div className="stagecraft-root min-h-screen bg-sc-bg flex items-center justify-center">
          <p className="font-mono text-xs text-sc-dim animate-pulse">Loading…</p>
        </div>
      }
    >
      <PlanPageInner />
    </Suspense>
  );
}
