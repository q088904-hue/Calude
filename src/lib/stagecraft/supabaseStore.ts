// Supabase-backed persistence for Stagecraft. Provider-agnostic drop-in that
// mirrors the file-store signatures 1:1 — selected at runtime via
// STAGECRAFT_STORE=supabase (see storeBackend.ts). The file store stays default.
//
// Single-tenant v0: every row carries SENTINEL_USER_ID; all access goes through
// the service-role admin client (RLS-bypassing, server-only). Initiative 3.2
// migrates the sentinel to auth.uid() + anon RLS policies.
//
// Storage shape mirrors 005_stagecraft_core.sql: the exact application object
// lives in `data` jsonb (byte-perfect round-trip). Sessions additionally store a
// precomputed `summary` + `composite` so list/history reads never load `items`.
//
// Dev-mock safety: when Supabase env is absent, every function returns the same
// empty/default value the file store would for a fresh install — never throws.

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { profile as defaultProfile } from "./profile";
import { summarise, type SessionSummary } from "./sessionSummary";
import type { Profile, SessionRecord, QAItem } from "./types";
import type { StagecraftConfig } from "./configStore";

export const SENTINEL_USER_ID = "00000000-0000-0000-0000-000000000000";

const PROFILES = "stagecraft_profiles";
const SESSIONS = "stagecraft_sessions";
const CONFIG = "stagecraft_config";

/** True only when real Supabase credentials are configured. */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// supabase-js v2.104+ resolves .insert()/.upsert()/.select() to `never` on an
// un-generified client. Mirror the repo convention (src/lib/pi/metrics.ts): cast
// `.from(name)` to a loose handle once; runtime shape is enforced by 005.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: string): any {
  return getSupabaseAdmin().from(name);
}

function fail(op: string, message: string): never {
  throw new Error(`[supabaseStore] ${op}: ${message}`);
}

// ── sessions ─────────────────────────────────────────────────────────────────

/** Map a record to its row, recomputing the denormalized summary/composite.
 *  `archived_at` is intentionally omitted so upserts never clobber archive state. */
function toSessionRow(record: SessionRecord) {
  const summary = summarise(record);
  return {
    id: record.id,
    user_id: SENTINEL_USER_ID,
    started_at: record.startedAt ?? null,
    ended_at: record.endedAt ?? null,
    composite: summary?.composite ?? null,
    summary: summary ?? null,
    data: record,
  };
}

export async function listSessions(): Promise<SessionRecord[]> {
  if (!hasSupabaseEnv()) return [];
  const { data, error } = await table(SESSIONS)
    .select("data")
    .eq("user_id", SENTINEL_USER_ID)
    .order("started_at", { ascending: false });
  if (error) fail("listSessions", error.message);
  return ((data ?? []) as { data: SessionRecord }[]).map((r) => r.data);
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  if (!hasSupabaseEnv()) return null;
  const { data, error } = await table(SESSIONS)
    .select("data")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("getSession", error.message);
  return data ? (data as { data: SessionRecord }).data : null;
}

export async function upsertSession(record: SessionRecord): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const { error } = await table(SESSIONS)
    .upsert(toSessionRow(record), { onConflict: "id" });
  if (error) fail("upsertSession", error.message);
}

export async function appendItem(
  sessionId: string,
  item: QAItem,
): Promise<SessionRecord | null> {
  if (!hasSupabaseEnv()) return null;
  const existing = await getSession(sessionId);
  if (!existing) return null;
  const updated: SessionRecord = { ...existing, items: [...existing.items, item] };
  await upsertSession(updated);
  return updated;
}

export async function setReport(
  sessionId: string,
  report: string,
): Promise<SessionRecord | null> {
  if (!hasSupabaseEnv()) return null;
  const existing = await getSession(sessionId);
  if (!existing) return null;
  const updated: SessionRecord = {
    ...existing,
    report,
    endedAt: new Date().toISOString(),
  };
  await upsertSession(updated);
  return updated;
}

/** Cheap, newest-first summaries (skips `data`/items entirely). Optional paging. */
export async function listSessionSummaries(opts?: {
  limit?: number;
  offset?: number;
}): Promise<SessionSummary[]> {
  if (!hasSupabaseEnv()) return [];
  let query = table(SESSIONS)
    .select("summary")
    .eq("user_id", SENTINEL_USER_ID)
    .is("archived_at", null)
    .not("summary", "is", null)
    .order("started_at", { ascending: false });
  if (opts?.limit !== undefined) {
    const offset = opts.offset ?? 0;
    query = query.range(offset, offset + opts.limit - 1);
  }
  const { data, error } = await query;
  if (error) fail("listSessionSummaries", error.message);
  return ((data ?? []) as { summary: SessionSummary | null }[])
    .map((r) => r.summary)
    .filter((s): s is SessionSummary => s !== null);
}

// ── profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile> {
  if (!hasSupabaseEnv()) return defaultProfile;
  const { data, error } = await table(PROFILES)
    .select("data")
    .eq("user_id", SENTINEL_USER_ID)
    .maybeSingle();
  if (error) fail("getProfile", error.message);
  if (!data) return defaultProfile;
  // Merge with defaults so newly added fields don't break older saves.
  return { ...defaultProfile, ...(data as { data: Profile }).data };
}

export async function saveProfile(p: Profile): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const { error } = await table(PROFILES)
    .upsert({ user_id: SENTINEL_USER_ID, data: p }, { onConflict: "user_id" });
  if (error) fail("saveProfile", error.message);
}

/** True once the user has saved a profile (a row exists). */
export async function profileExists(): Promise<boolean> {
  if (!hasSupabaseEnv()) return false;
  const { data, error } = await table(PROFILES)
    .select("user_id")
    .eq("user_id", SENTINEL_USER_ID)
    .maybeSingle();
  if (error) fail("profileExists", error.message);
  return Boolean(data);
}

// ── config ───────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<StagecraftConfig> {
  if (!hasSupabaseEnv()) return {};
  const { data, error } = await table(CONFIG)
    .select("data")
    .eq("user_id", SENTINEL_USER_ID)
    .maybeSingle();
  if (error) fail("getConfig", error.message);
  return data ? (data as { data: StagecraftConfig }).data : {};
}

export async function saveConfig(c: StagecraftConfig): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const { error } = await table(CONFIG)
    .upsert({ user_id: SENTINEL_USER_ID, data: c }, { onConflict: "user_id" });
  if (error) fail("saveConfig", error.message);
}
