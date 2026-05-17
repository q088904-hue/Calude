"use client";

import { useState } from "react";
import { getSuggestedAnswer } from "@/lib/stagecraft/suggestedAnswers";
import { renderSampleAnswer } from "@/lib/stagecraft/feedbackRenderers";

export function SuggestedAnswer({
  question,
  className = "",
}: {
  question: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const entry = getSuggestedAnswer(question);
  if (!entry) return null;

  return (
    <div className={`mt-3 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="font-mono text-[11px] tracking-widest uppercase text-sc-dim hover:text-sc-gold transition-colors"
      >
        {open ? "Hide suggested answer ▴" : "Show a suggested answer ▾"}
      </button>
      {open && (
        <div className="mt-2 rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-3">
          <p className="text-sm text-sc-ink leading-relaxed">
            {renderSampleAnswer(entry.answer)}
          </p>
        </div>
      )}
    </div>
  );
}
