/**
 * MeenTrack V2 Design Tokens
 *
 * Synthesized from:
 *   Revolut  → financial data hierarchy, mono numbers, card grid density
 *   GO Club  → premium dark navy, bold ALL-CAPS labels, layered elevation
 *   Open     → gradient mesh heroes, radial elements, generous breathing room
 *
 * Adapted for fishermen: sunlight-readable contrast, semantic ocean colors,
 * fast decision-making hierarchy.
 */

// ─── Motion Tokens ─────────────────────────────────────────────────────────────

/**
 * Shared Framer Motion transition presets.
 *
 * `springs.snap` — standard tap/press spring used on every interactive
 * element (buttons, chips, cards, nav items). stiffness 500 gives a crisp
 * settle; damping 28 keeps overshoot imperceptible on short scale bounces.
 * Tune this one value to change the global tactile feel of the whole app.
 */
export const springs = {
  snap: { type: "spring" as const, stiffness: 500, damping: 28 },
} as const;

// ─── Color Palette ─────────────────────────────────────────────────────────────
// All color tokens live as CSS custom properties in src/app/globals.css (@theme).
// In component code use:
//   • Tailwind utilities  — bg-mt-aqua, text-mt-ink, border-mt-border/50 …
//   • CSS var references  — var(--color-mt-aqua), var(--color-mt-base) …

// ─── Gradient Presets ───────────────────────────────────────────────────────────

/**
 * Reusable CSS gradient strings derived from color tokens.
 * Use these instead of inline gradient literals so a palette change
 * propagates everywhere automatically.
 */
export const gradients = {
  /** Deep ocean card interior — BiteTime hero, LiveScore, ZoneDetail, AI card */
  heroCard:   "linear-gradient(135deg, var(--color-mt-mesh) 0%, var(--color-mt-surface) 60%, var(--color-mt-base) 100%)",
  /** Top ambient aqua glow — Onboarding, Paywall hero sections */
  topGlow:    "radial-gradient(ellipse at 50% 0%, var(--color-mt-aqua) 0%, transparent 70%)",
  /** Horizontal scroll fade — right-edge affordance on card rows */
  scrollFade: "linear-gradient(to left, var(--color-mt-bg) 0%, transparent 100%)",
  /** Bottom nav bar background — frosted-over-app effect */
  navBar:     "linear-gradient(to top, var(--color-mt-base) 0%, var(--color-mt-bg) 100%)",
} as const;

// ─── Score band → color mapping ─────────────────────────────────────────────────

export type ScoreBand = "excellent" | "good" | "fair" | "slow" | "poor";

export function getScoreBand(score: number): ScoreBand {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  if (score >= 30) return "slow";
  return "poor";
}

export const scoreBandConfig: Record<ScoreBand, {
  label: string;
  /** Tailwind text-color utility — use for className props */
  color: string;
  /** CSS custom property — use for SVG stroke, inline style, and filter expressions */
  cssVar: string;
  bg: string;
  bar: string;
  glow: string;
  ring: string;
}> = {
  excellent: {
    label:  "Excellent",
    color:  "text-mt-aqua",
    cssVar: "var(--color-mt-aqua)",
    bg:     "bg-mt-aqua/10",
    bar:    "bg-mt-aqua",
    glow:   "shadow-mt-aqua-glow",
    ring:   "border-mt-aqua/40",
  },
  good: {
    label:  "Good",
    color:  "text-mt-green",
    cssVar: "var(--color-mt-green)",
    bg:     "bg-mt-green/10",
    bar:    "bg-mt-green",
    glow:   "shadow-mt-green-glow",
    ring:   "border-mt-green/40",
  },
  fair: {
    label:  "Fair",
    color:  "text-mt-amber",
    cssVar: "var(--color-mt-amber)",
    bg:     "bg-mt-amber/10",
    bar:    "bg-mt-amber",
    glow:   "shadow-mt-amber-glow",
    ring:   "border-mt-amber/40",
  },
  slow: {
    label:  "Slow",
    color:  "text-mt-muted",
    cssVar: "var(--color-mt-muted)",
    bg:     "bg-mt-muted/10",
    bar:    "bg-mt-muted",
    glow:   "shadow-none",
    ring:   "border-mt-muted/30",
  },
  poor: {
    label:  "Poor",
    color:  "text-mt-dim",
    cssVar: "var(--color-mt-dim)",
    bg:     "bg-mt-dim/10",
    bar:    "bg-mt-dim",
    glow:   "shadow-none",
    ring:   "border-mt-dim/30",
  },
};
