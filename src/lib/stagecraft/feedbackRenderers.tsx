"use client";

// Shared JSX rendering utilities for Stagecraft feedback.
// Imported by the main session loop, drill page, and any other surface that
// needs to render coaching text consistently.

import React from "react";

// ── Pattern-tag highlighter ───────────────────────────────────────────────────
// Turns "[dropped article]" inline tags into red chips.

export function renderWithPatternTags(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (/^\[[^\]]+\]$/.test(part)) {
      return (
        <span
          key={i}
          className="rounded-sm border border-sc-red/30 bg-sc-red/10 px-1 py-0.5 font-mono text-xs text-sc-red mx-0.5"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Sample-answer renderer ────────────────────────────────────────────────────
// Turns [pause] → ◦ breath marker, **bold** → <strong>.

export function renderSampleAnswer(text: string): React.ReactNode {
  const parts = text.split(/(\[pause\]|\*\*[^*]+\*\*)/gi);
  return parts.map((part, i) => {
    if (part.toLowerCase() === "[pause]") {
      return (
        <span
          key={i}
          className="inline-flex items-center mx-1 font-mono text-xs text-sc-gold"
          title="Pause here"
        >
          ◦
        </span>
      );
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="font-semibold text-sc-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
