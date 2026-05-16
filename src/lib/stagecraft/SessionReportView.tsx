"use client";

// Structured renderer for the SESSION REPORT format produced by
// /api/stagecraft/report.  Replaces the raw <pre> fallback with a
// sectioned layout: averages, what worked / what to fix, repeated
// patterns, memorize-tonight answers, and next-session recommendation.
//
// Handles partial streamed text gracefully — sections that haven't
// arrived yet simply don't render, so there's no flash of broken UI.

import { useState, useCallback } from "react";

// ── Parser ────────────────────────────────────────────────────────────────────

interface ParsedReport {
  meta: string; // "Role: … Round: … Questions: N"
  averages: { content: number | null; english: number | null; delivery: number | null };
  whatWorked: string[];
  whatToFix: string[];
  patterns: string[]; // raw "- [tag] — appeared in Q1, Q2" lines
  memorize: { q: string; a: string }[];
  nextSession: string;
}

function parseReport(raw: string): ParsedReport {
  const result: ParsedReport = {
    meta: "",
    averages: { content: null, english: null, delivery: null },
    whatWorked: [],
    whatToFix: [],
    patterns: [],
    memorize: [],
    nextSession: "",
  };

  // Strip code fences if the model wrapped its output
  const text = raw.replace(/^```[^\n]*\n?/, "").replace(/```\s*$/, "").trim();
  const lines = text.split("\n");

  type Section =
    | "none"
    | "averages"
    | "worked"
    | "fix"
    | "patterns"
    | "memorize"
    | "next";

  let section: Section = "none";
  let memorizeEntry: { q: string; a: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip the banner lines
    if (/^SESSION REPORT/.test(trimmed) || /^-{4,}/.test(trimmed)) continue;

    // Meta line: "Role: …   Round: …   Questions: N"
    if (/^Role:/i.test(trimmed) && result.meta === "") {
      result.meta = trimmed;
      continue;
    }

    // Section headers
    if (/^Averages:/i.test(trimmed)) { section = "averages"; continue; }
    if (/^What worked today/i.test(trimmed)) { section = "worked"; continue; }
    if (/^What to fix before/i.test(trimmed)) { section = "fix"; continue; }
    if (/^Grammar patterns/i.test(trimmed)) { section = "patterns"; continue; }
    if (/^3 sample answers/i.test(trimmed) || /^Sample answers/i.test(trimmed)) {
      section = "memorize"; continue;
    }
    if (/^Next session recommendation/i.test(trimmed)) {
      section = "next";
      // Value may be on the same line after the colon
      const after = trimmed.replace(/^Next session recommendation\s*:\s*/i, "").trim();
      if (after) result.nextSession = after;
      continue;
    }

    if (!trimmed) {
      // Flush any in-progress memorize entry on blank line between entries
      if (memorizeEntry && memorizeEntry.q && memorizeEntry.a) {
        result.memorize.push(memorizeEntry);
        memorizeEntry = null;
      }
      continue;
    }

    switch (section) {
      case "averages": {
        const cMatch = trimmed.match(/Content\s*:\s*([\d.]+)\s*\/\s*10/i);
        const eMatch = trimmed.match(/English\s*:\s*([\d.]+)\s*\/\s*10/i);
        const dMatch = trimmed.match(/Delivery\s*:\s*([\d.]+)\s*\/\s*10/i);
        if (cMatch) result.averages.content = parseFloat(cMatch[1]);
        if (eMatch) result.averages.english = parseFloat(eMatch[1]);
        if (dMatch) result.averages.delivery = parseFloat(dMatch[1]);
        break;
      }
      case "worked": {
        // "1. Some insight" or "- Some insight"
        const m = trimmed.match(/^[\d]+\.\s+(.+)$/) ?? trimmed.match(/^[-•]\s+(.+)$/);
        if (m) result.whatWorked.push(m[1].trim());
        break;
      }
      case "fix": {
        const m = trimmed.match(/^[\d]+\.\s+(.+)$/) ?? trimmed.match(/^[-•]\s+(.+)$/);
        if (m) result.whatToFix.push(m[1].trim());
        break;
      }
      case "patterns": {
        if (/^[-•]/.test(trimmed)) result.patterns.push(trimmed.slice(1).trim());
        break;
      }
      case "memorize": {
        // Format:
        // 1. Q: ...
        //    A: ...
        const qMatch = trimmed.match(/^[\d]+\.\s+Q:\s*(.+)$/) ?? trimmed.match(/^Q:\s*(.+)$/);
        const aMatch = trimmed.match(/^A:\s*(.+)$/) ?? trimmed.match(/^\s+A:\s*(.+)$/);
        if (qMatch) {
          if (memorizeEntry && memorizeEntry.q && memorizeEntry.a) {
            result.memorize.push(memorizeEntry);
          }
          memorizeEntry = { q: qMatch[1].trim(), a: "" };
        } else if (aMatch && memorizeEntry) {
          memorizeEntry.a = (memorizeEntry.a ? memorizeEntry.a + " " : "") + aMatch[1].trim();
        } else if (memorizeEntry && memorizeEntry.q && !trimmed.startsWith("Q:") && !trimmed.startsWith("A:")) {
          // Continuation line for the answer
          if (memorizeEntry.a) memorizeEntry.a += " " + trimmed;
        }
        break;
      }
      case "next": {
        // Could span a continuation line
        if (!result.nextSession) result.nextSession = trimmed;
        else result.nextSession += " " + trimmed;
        break;
      }
    }
  }

  // Flush final memorize entry
  if (memorizeEntry && memorizeEntry.q && memorizeEntry.a) {
    result.memorize.push(memorizeEntry);
  }

  return result;
}

// ── Score colour helpers ──────────────────────────────────────────────────────

function scoreColor(v: number | null): string {
  if (v === null) return "text-sc-dim";
  if (v >= 8) return "text-sc-green";
  if (v >= 5) return "text-sc-gold";
  return "text-sc-red";
}

function scoreBg(v: number | null): string {
  if (v === null) return "border-sc-border bg-sc-surface";
  if (v >= 8) return "border-sc-green/40 bg-sc-green-bg";
  if (v >= 5) return "border-sc-gold-dim bg-sc-gold-bg";
  return "border-sc-red/30 bg-sc-red/10";
}

// ── Memorize card ─────────────────────────────────────────────────────────────

function MemorizeCard({ item, n }: { item: { q: string; a: string }; n: number }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await fetch("/api/stagecraft/memorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", question: item.q, answer: item.a }),
      });
      setSaved(true);
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }, [item, saved, saving]);

  return (
    <div className="rounded-sm border border-sc-gold-dim/50 bg-sc-gold-bg/40 px-4 py-3 space-y-2">
      <div className="flex items-start gap-2 justify-between">
        <p className="font-mono text-[10px] text-sc-gold uppercase tracking-wider shrink-0 mt-0.5">
          #{n}
        </p>
        <p className="text-xs text-sc-muted flex-1 leading-snug">{item.q}</p>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saved || saving}
          className={`flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[10px] transition-all shrink-0 ${
            saved
              ? "border-sc-green/40 bg-sc-green-bg text-sc-green"
              : "border-sc-gold-dim text-sc-gold hover:bg-sc-gold/20 disabled:opacity-50"
          }`}
        >
          {saved ? "✓ Saved" : saving ? "…" : "♥ Add"}
        </button>
      </div>
      <p className="text-sm text-sc-ink leading-relaxed pl-5">{item.a}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SessionReportView({
  raw,
  streaming = false,
}: {
  raw: string;
  streaming?: boolean;
}) {
  const p = parseReport(raw);

  // While streaming and nothing is parsed yet — show a pulsing line
  const hasContent =
    p.meta ||
    p.averages.content !== null ||
    p.whatWorked.length > 0 ||
    p.whatToFix.length > 0;

  if (!hasContent && streaming) {
    return (
      <p className="font-mono text-xs text-sc-gold animate-pulse">
        Generating report…
      </p>
    );
  }

  if (!hasContent) {
    // Fallback: render raw if parser found nothing
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm text-sc-ink leading-relaxed">
        {raw}
      </pre>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Averages ── */}
      {(p.averages.content !== null || p.averages.english !== null || p.averages.delivery !== null) && (
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { label: "Content", v: p.averages.content },
              { label: "English", v: p.averages.english },
              { label: "Delivery", v: p.averages.delivery },
            ] as const
          ).map(({ label, v }) => (
            <div key={label} className={`rounded-sm border px-3 py-2 ${scoreBg(v)}`}>
              <p className="font-mono text-[10px] text-sc-dim uppercase tracking-wider mb-0.5">
                {label}
              </p>
              <p className={`font-display text-2xl font-semibold ${scoreColor(v)}`}>
                {v ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── What worked ── */}
      {p.whatWorked.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-sc-green uppercase tracking-wider mb-2">
            ↑ What worked today
          </p>
          <ol className="space-y-1.5">
            {p.whatWorked.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-sc-ink leading-snug">
                <span className="font-mono text-[10px] text-sc-green shrink-0 mt-0.5 w-4">
                  {i + 1}.
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── What to fix ── */}
      {p.whatToFix.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-sc-red uppercase tracking-wider mb-2">
            ↓ What to fix before the real interview
          </p>
          <ol className="space-y-1.5">
            {p.whatToFix.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-sc-ink leading-snug">
                <span className="font-mono text-[10px] text-sc-red shrink-0 mt-0.5 w-4">
                  {i + 1}.
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Patterns ── */}
      {p.patterns.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-sc-dim uppercase tracking-wider mb-2">
            Grammar patterns repeated
          </p>
          <div className="space-y-1">
            {p.patterns.map((pat, i) => {
              // Format: "[tag] — appeared in Q1, Q2"
              const tagMatch = pat.match(/^\[([^\]]+)\]/);
              const tag = tagMatch ? tagMatch[1] : pat;
              const rest = tagMatch ? pat.slice(tagMatch[0].length).trim() : "";
              return (
                <div key={i} className="flex items-baseline gap-2 flex-wrap">
                  <span className="rounded-sm border border-sc-red/30 bg-sc-red/10 px-2 py-0.5 font-mono text-xs text-sc-red">
                    [{tag}]
                  </span>
                  {rest && (
                    <span className="font-mono text-[10px] text-sc-dim">{rest.replace(/^—\s*/, "")}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Memorize tonight ── */}
      {p.memorize.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-sc-gold uppercase tracking-wider mb-2">
            ♥ Memorize tonight
          </p>
          <div className="space-y-2">
            {p.memorize.map((item, i) => (
              <MemorizeCard key={i} item={item} n={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* ── Next session ── */}
      {p.nextSession && (
        <div className="rounded-sm border border-sc-border bg-sc-raised px-4 py-3 flex items-start gap-3">
          <span className="font-mono text-[10px] text-sc-dim uppercase tracking-wider shrink-0 mt-0.5">
            Next session
          </span>
          <p className="text-sm text-sc-muted leading-snug">{p.nextSession}</p>
        </div>
      )}

      {/* Streaming tail — show pulse while more is coming */}
      {streaming && (
        <p className="font-mono text-[10px] text-sc-dim animate-pulse">writing…</p>
      )}
    </div>
  );
}
