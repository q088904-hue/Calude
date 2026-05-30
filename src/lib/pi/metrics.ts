/**
 * PI measurement + governance store — provider-agnostic.
 *
 *   • localStore    — JSONL append (`.pi-data/`), zero backend. Default.
 *   • supabaseStore — `pi_runs` / `pi_feedback` via the admin client. Active when
 *                     NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *                     and migration 004 is applied; otherwise we fall back to local.
 *
 * Every record carries `userEmail` (from the signed session) — this doubles as
 * the governance AUDIT TRAIL: who processed which deck, scores before/after,
 * fixes applied, and feedback. Works meaningfully at N=1.
 */

import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface FixMetric {
  type: "fix";
  ts: string;
  userEmail: string;
  filename: string;
  mode: "snap" | "enforce";
  beforeScore: number;
  afterScore: number;
  violationsDetected: number;
  violationsFixed: number;
  editabilityPassed: boolean;
  slideCount: number;
}

export interface FeedbackMetric {
  type: "feedback";
  ts: string;
  userEmail: string;
  filename: string;
  satisfaction: number;
  estimatedMinutesSaved: number;
  manualStillNeeded: boolean;
  notes?: string;
}

export type MetricRecord = FixMetric | FeedbackMetric;

export interface KpiSummary {
  decksGoverned: number;
  avgScoreImprovement: number;
  totalViolationsDetected: number;
  totalViolationsFixed: number;
  editabilityPreservationRate: number;
  feedbackCount: number;
  avgSatisfaction: number | null;
  totalEstimatedMinutesSaved: number;
  uniqueUsers: number;
}

export interface AuditEntry {
  ts: string;
  userEmail: string;
  filename: string;
  mode: string;
  beforeScore: number;
  afterScore: number;
  violationsFixed: number;
  editabilityPassed: boolean;
}

// ── provider selection + production guard ──────────────────────────────────────

/** Read bounds — eliminate unbounded scans. */
const MAX_ROWS = 5000; // hard cap per table per query
const WINDOW_DAYS = 90; // KPI/aggregate window

/** Thrown when production runs without a configured persistence backend. */
export class PiPersistenceError extends Error {
  constructor() {
    super(
      "PI persistence is not configured. In production set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY and apply migration 004_pi_govern.sql. " +
        "The JSONL fallback is for local development only."
    );
    this.name = "PiPersistenceError";
  }
}

function supabaseEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Resolve the persistence mode, FAILING CLOSED in production.
 * Production REQUIRES Supabase — JSONL is dev-only. Routes catch the error and
 * return a 503 with the operator message, rather than silently losing audit/KPI
 * data to an ephemeral local file.
 */
export function requirePersistence(): "supabase" | "local" {
  if (supabaseEnabled()) return "supabase";
  if (process.env.NODE_ENV === "production") throw new PiPersistenceError();
  return "local";
}

const METRICS_PATH =
  process.env.PI_METRICS_PATH || resolve(process.cwd(), ".pi-data/metrics.jsonl");

function windowStartIso(): string {
  return new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
}

// ── local (JSONL) provider ──────────────────────────────────────────────────

async function localAppend(rec: MetricRecord): Promise<void> {
  try {
    await fs.mkdir(dirname(METRICS_PATH), { recursive: true });
    await fs.appendFile(METRICS_PATH, JSON.stringify(rec) + "\n", "utf8");
  } catch (e) {
    console.error("PI metrics(local): persist failed:", (e as Error).message);
  }
}

async function localReadAll(): Promise<MetricRecord[]> {
  try {
    const raw = await fs.readFile(METRICS_PATH, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    // Bound: only the most recent MAX_ROWS entries (dev-only store).
    const recent = lines.length > MAX_ROWS ? lines.slice(-MAX_ROWS) : lines;
    return recent.map((l) => JSON.parse(l) as MetricRecord);
  } catch {
    return [];
  }
}

// ── supabase provider ─────────────────────────────────────────────────────────

// supabase-js v2.104+ resolves .insert()/.select() to `never` on an un-generified
// client. Mirror the repo convention (src/lib/supabase/subscriptions.ts): cast
// `.from(name)` to a loose handle once; runtime shape is enforced by migration 004.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: string): any {
  return getSupabaseAdmin().from(name);
}

async function supabaseAppend(rec: MetricRecord): Promise<void> {
  try {
    if (rec.type === "fix") {
      await table("pi_runs").insert({
        user_email: rec.userEmail,
        filename: rec.filename,
        mode: rec.mode,
        slide_count: rec.slideCount,
        before_score: rec.beforeScore,
        after_score: rec.afterScore,
        violations_detected: rec.violationsDetected,
        violations_fixed: rec.violationsFixed,
        editability_passed: rec.editabilityPassed,
      });
    } else {
      await table("pi_feedback").insert({
        user_email: rec.userEmail,
        filename: rec.filename,
        satisfaction: rec.satisfaction,
        estimated_minutes_saved: rec.estimatedMinutesSaved,
        manual_still_needed: rec.manualStillNeeded,
        notes: rec.notes ?? null,
      });
    }
  } catch (e) {
    console.error("PI metrics(supabase): persist failed, falling back to local:", (e as Error).message);
    await localAppend(rec);
  }
}

async function supabaseReadAll(): Promise<MetricRecord[]> {
  try {
    // Bounded: last WINDOW_DAYS, newest first, capped at MAX_ROWS per table.
    const since = windowStartIso();
    const runs = await table("pi_runs")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    const fb = await table("pi_feedback")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    const out: MetricRecord[] = [];
    for (const r of (runs.data ?? []) as Record<string, unknown>[]) {
      out.push({
        type: "fix",
        ts: String(r.created_at ?? ""),
        userEmail: String(r.user_email ?? ""),
        filename: String(r.filename ?? ""),
        mode: (r.mode as "snap" | "enforce") ?? "snap",
        beforeScore: Number(r.before_score ?? 0),
        afterScore: Number(r.after_score ?? 0),
        violationsDetected: Number(r.violations_detected ?? 0),
        violationsFixed: Number(r.violations_fixed ?? 0),
        editabilityPassed: Boolean(r.editability_passed),
        slideCount: Number(r.slide_count ?? 0),
      });
    }
    for (const f of (fb.data ?? []) as Record<string, unknown>[]) {
      out.push({
        type: "feedback",
        ts: String(f.created_at ?? ""),
        userEmail: String(f.user_email ?? ""),
        filename: String(f.filename ?? ""),
        satisfaction: Number(f.satisfaction ?? 0),
        estimatedMinutesSaved: Number(f.estimated_minutes_saved ?? 0),
        manualStillNeeded: Boolean(f.manual_still_needed),
      });
    }
    return out;
  } catch (e) {
    console.error("PI metrics(supabase): read failed, falling back to local:", (e as Error).message);
    return localReadAll();
  }
}

// ── public API ────────────────────────────────────────────────────────────────

export const STORE_KIND: "local" | "supabase" = supabaseEnabled() ? "supabase" : "local";

export async function recordMetric(rec: MetricRecord): Promise<void> {
  return requirePersistence() === "supabase" ? supabaseAppend(rec) : localAppend(rec);
}

async function readAll(): Promise<MetricRecord[]> {
  return requirePersistence() === "supabase" ? supabaseReadAll() : localReadAll();
}

export async function summarizeKpis(): Promise<KpiSummary> {
  const records = await readAll();
  const fixes = records.filter((r): r is FixMetric => r.type === "fix");
  const feedback = records.filter((r): r is FeedbackMetric => r.type === "feedback");
  const decks = fixes.length;

  const avgImprovement = decks
    ? Math.round(fixes.reduce((a, f) => a + (f.afterScore - f.beforeScore), 0) / decks)
    : 0;
  const editabilityOk = fixes.filter((f) => f.editabilityPassed).length;
  const avgSat = feedback.length
    ? Math.round((feedback.reduce((a, f) => a + f.satisfaction, 0) / feedback.length) * 10) / 10
    : null;
  const users = new Set(
    [...fixes, ...feedback].map((r) => r.userEmail).filter(Boolean)
  ).size;

  return {
    decksGoverned: decks,
    avgScoreImprovement: avgImprovement,
    totalViolationsDetected: fixes.reduce((a, f) => a + f.violationsDetected, 0),
    totalViolationsFixed: fixes.reduce((a, f) => a + f.violationsFixed, 0),
    editabilityPreservationRate: decks ? Math.round((editabilityOk / decks) * 100) : 100,
    feedbackCount: feedback.length,
    avgSatisfaction: avgSat,
    totalEstimatedMinutesSaved: feedback.reduce((a, f) => a + f.estimatedMinutesSaved, 0),
    uniqueUsers: users,
  };
}

/** Governance audit history — most recent first. Bounded at the source. */
export async function listAudit(limit = 50): Promise<AuditEntry[]> {
  const cap = Math.min(Math.max(1, limit), 200);
  const toEntry = (f: FixMetric): AuditEntry => ({
    ts: f.ts,
    userEmail: f.userEmail,
    filename: f.filename,
    mode: f.mode,
    beforeScore: f.beforeScore,
    afterScore: f.afterScore,
    violationsFixed: f.violationsFixed,
    editabilityPassed: f.editabilityPassed,
  });

  if (requirePersistence() === "supabase") {
    // DB returns only `cap` rows (no full-table scan).
    const rows = await table("pi_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(cap);
    return ((rows.data ?? []) as Record<string, unknown>[]).map((r) =>
      toEntry({
        type: "fix",
        ts: String(r.created_at ?? ""),
        userEmail: String(r.user_email ?? ""),
        filename: String(r.filename ?? ""),
        mode: (r.mode as "snap" | "enforce") ?? "snap",
        beforeScore: Number(r.before_score ?? 0),
        afterScore: Number(r.after_score ?? 0),
        violationsDetected: Number(r.violations_detected ?? 0),
        violationsFixed: Number(r.violations_fixed ?? 0),
        editabilityPassed: Boolean(r.editability_passed),
        slideCount: Number(r.slide_count ?? 0),
      })
    );
  }

  // Local (dev): bounded read already caps to MAX_ROWS.
  const records = await localReadAll();
  return records
    .filter((r): r is FixMetric => r.type === "fix")
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, cap)
    .map(toEntry);
}
