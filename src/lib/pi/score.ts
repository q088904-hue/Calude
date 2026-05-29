/**
 * Brand Balance Score — governs the white-first design system.
 *
 * Measures the distribution of categorized color usage against the Datamatics
 * targets (White 60–80%, Light Grey 10–20%, Black ≤20%, Red ≤20%) and raises
 * governance flags for excessive red, excessive black, low white, and off-brand
 * colors.
 *
 * NOTE: this is a USAGE-FREQUENCY proxy (counts of color references), not true
 * rendered area. It is directionally correct for governance and cheap to
 * compute; pixel-accurate area would require rendering (Week-2+ refinement).
 */

import type { Ruleset } from "./ruleset";
import type { BalanceCounts } from "./color/classify";

export interface BrandBalance {
  pct: {
    white: number;
    lightGrey: number;
    greyOther: number;
    black: number;
    red: number;
    offBrand: number;
  };
  score: number; // 0–100
  flags: string[];
}

export function computeBrandBalance(counts: BalanceCounts, rs: Ruleset): BrandBalance {
  const total =
    counts.white +
    counts.lightGrey +
    counts.greyOther +
    counts.black +
    counts.red +
    counts.offBrand;
  const p = (n: number) => (total ? (n / total) * 100 : 0);
  const pct = {
    white: p(counts.white),
    lightGrey: p(counts.lightGrey),
    greyOther: p(counts.greyOther),
    black: p(counts.black),
    red: p(counts.red),
    offBrand: p(counts.offBrand),
  };

  const b = rs.balance;
  const flags: string[] = [];
  let penalty = 0; // score = 100 − penalties (floored at 0)

  if (pct.red > b.redMaxPct) {
    flags.push(`Excessive red: ${pct.red.toFixed(0)}% (max ${b.redMaxPct}%)`);
    penalty += (pct.red - b.redMaxPct) * 1.5;
  }
  if (pct.black > b.blackMaxPct) {
    flags.push(`Excessive black: ${pct.black.toFixed(0)}% (max ${b.blackMaxPct}%)`);
    penalty += (pct.black - b.blackMaxPct) * 1.5;
  }
  if (pct.white < b.whiteMinPct) {
    flags.push(`Low white: ${pct.white.toFixed(0)}% (min ${b.whiteMinPct}%)`);
    penalty += (b.whiteMinPct - pct.white) * 1.0;
  }
  if (pct.offBrand > 0) {
    flags.push(`Off-brand colors present: ${pct.offBrand.toFixed(0)}%`);
    penalty += pct.offBrand * 2.0; // heaviest penalty
  }
  if (pct.greyOther > 0) {
    flags.push(`Non-approved greys: ${pct.greyOther.toFixed(0)}% (use F2F2F2 / D9D9D9)`);
    penalty += pct.greyOther * 0.5; // warning weight — not auto-normalized
  }

  const score = Math.max(0, Math.round(100 - penalty));
  return { pct, score, flags };
}

/** Weighted overall compliance score across dimensions. */
export function overallCompliance(parts: {
  typography: number;
  color: number;
  brandBalance: number;
  templateAdherence: number;
}): number {
  return Math.round(
    parts.typography * 0.3 +
      parts.color * 0.25 +
      parts.brandBalance * 0.25 +
      parts.templateAdherence * 0.2
  );
}
