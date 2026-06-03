"use client";

// Non-blocking readiness checklist. Shows four onboarding milestones and how
// many are met — communicates progress without gating any usage. Incomplete
// items deep-link to the action that completes them. Auto-hides once all four
// are met (returning power users see nothing).

import { useEffect, useState } from "react";
import Link from "next/link";

interface StatePayload {
  sessionCount: number;
  realNumbersCount: number;
  starStoryCount: number;
}

interface Milestone {
  label: string;
  done: boolean;
  href: string;
}

export function OnboardingProgress() {
  const [state, setState] = useState<StatePayload | null>(null);

  useEffect(() => {
    fetch("/api/stagecraft/state", { cache: "no-store" })
      .then((r) => r.json() as Promise<StatePayload>)
      .then(setState)
      .catch(() => setState(null));
  }, []);

  if (!state) return null;

  const milestones: Milestone[] = [
    {
      label: "First practice session",
      done: state.sessionCount >= 1,
      href: "/stagecraft/quickfire",
    },
    {
      label: "Three real numbers",
      done: state.realNumbersCount >= 3,
      href: "/stagecraft/profile/setup",
    },
    {
      label: "One STAR story",
      done: state.starStoryCount >= 1,
      href: "/stagecraft/profile/setup",
    },
    {
      label: "Five completed sessions",
      done: state.sessionCount >= 5,
      href: "/stagecraft/quickfire",
    },
  ];

  const completed = milestones.filter((m) => m.done).length;
  // Fully ready → don't clutter the hub.
  if (completed === milestones.length) return null;

  const pct = Math.round((completed / milestones.length) * 100);

  return (
    <section
      aria-label="Onboarding progress"
      className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-5 py-4"
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-mono text-xs tracking-widest text-sc-gold uppercase">
          Getting ready
        </h2>
        <span className="font-mono text-xs text-sc-muted tabular-nums">
          {completed} / {milestones.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-sc-sm bg-sc-line overflow-hidden mb-4" aria-hidden>
        <div
          className="h-full bg-sc-gold transition-[width] duration-300 ease-sc"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-2">
        {milestones.map((m) => (
          <li key={m.label}>
            {m.done ? (
              <span className="flex items-center gap-2 text-sm text-sc-muted">
                <span aria-hidden className="text-sc-green">✓</span>
                <span className="line-through decoration-sc-dim/50">{m.label}</span>
              </span>
            ) : (
              <Link
                href={m.href}
                className="group flex items-center gap-2 text-sm text-sc-ink hover:text-sc-gold transition-colors min-h-[36px]"
              >
                <span aria-hidden className="text-sc-dim">○</span>
                <span>{m.label}</span>
                <span aria-hidden className="text-sc-dim group-hover:text-sc-gold transition-colors">
                  →
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
