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

// ── provider selection ────────────────────────────────────────────────────────

function supabaseEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const METRICS_PATH =
  process.env.PI_METRICS_PATH || resolve(process.cwd(), ".pi-data/metrics.jsonl");

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
    return raw.split("\n").filter(Boolean).map((l) => JSON.parse(l) as MetricRecord);
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
    const runs = await table("pi_runs").select("*");
    const fb = await table("pi_feedback").select("*");
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
  return supabaseEnabled() ? supabaseAppend(rec) : localAppend(rec);
}

async function readAll(): Promise<MetricRecord[]> {
  return supabaseEnabled() ? supabaseReadAll() : localReadAll();
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

/** Governance audit history — most recent first. */
export async function listAudit(limit = 50): Promise<AuditEntry[]> {
  const records = await readAll();
  return records
    .filter((r): r is FixMetric => r.type === "fix")
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, limit)
    .map((f) => ({
      ts: f.ts,
      userEmail: f.userEmail,
      filename: f.filename,
      mode: f.mode,
      beforeScore: f.beforeScore,
      afterScore: f.afterScore,
      violationsFixed: f.violationsFixed,
      editabilityPassed: f.editabilityPassed,
    }));
}
