/** Shared types for the PI Govern + Fix engine. */

export type Severity = "high" | "med" | "advisory";

export type ViolationCategory =
  | "font"
  | "color"
  | "logo"
  | "footer"
  | "template"
  | "spacing"
  | "hierarchy";

export interface Violation {
  category: ViolationCategory;
  severity: Severity;
  /** 1-based slide index, when the violation is slide-scoped. */
  slide?: number;
  /** What was found (e.g. "Arial", "FF0000"). */
  found: string;
  /** What the ruleset expects (e.g. "Calibri", "nearest brand color"). */
  expected: string;
  /** Whether the mechanical engine can deterministically correct it. */
  autoFixable: boolean;
  /** Occurrence count across the deck (optional). */
  count?: number;
}

export interface ComplianceReport {
  score: number; // 0–100
  violations: Violation[];
  rulesetVersion: number;
  phase: "before" | "after";
}

export interface FixesApplied {
  fonts: number;
  colors: number;
  logo: boolean;
  footer: boolean;
  theme: boolean;
}

export interface FixResult {
  fixesApplied: FixesApplied;
  beforeScore: number;
  afterScore: number;
  editabilityPassed: boolean;
  /** Corrected .pptx as a Node Buffer. */
  buffer: Buffer;
}

export type FixMode = "snap" | "enforce";
