// Supabase-backed persistence for Stagecraft. Provider-agnostic drop-in that
// mirrors the file-store signatures 1:1 — selected at runtime via
// STAGECRAFT_STORE=supabase (see storeBackend.ts). The file store stays default.
//
// Ownership (Initiative 3.2): user-data access goes through the SSR anon client
// bound to the request's auth session, so the DATABASE enforces ownership via RLS
// (auth.uid()). Every query is additionally scoped by user_id (harmless under
// RLS; required on the admin/dev path which bypasses RLS).
//
//   • Production / real session → SSR client (getSupabaseServer), userId = auth.uid()
//   • Dev bypass (STAGECRAFT_DEV_AUTH=1, non-prod) → admin client scoped by
//     DEV_USER_ID (RLS not exercised; documented dev-only convenience)
//   • No session / no creds → ctx() is null → empty/default values, never throws
//
// Storage shape mirrors 005/006: the exact app object lives in `data` jsonb
// (byte-perfect round-trip). Sessions also store a precomputed `summary` +
// `composite` so list/history reads never load `items`. The service-role admin
// client is otherwise used ONLY by claimSentinel.ts.

import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { profile as defaultProfile } from "./profile";
import { summarise, type SessionSummary } from "./sessionSummary";
import { devAuthEnabled, DEV_USER_ID } from "./authShared";
import type { Profile, SessionRecord, QAItem } from "./types";
import type { StagecraftConfig } from "./configStore";

/** Retained for claimSentinel.ts (the 3.1 single-tenant owner). */
export const SENTINEL_USER_ID = "00000000-0000-0000-0000-000000000000";

const PROFILES = "stagecraft_profiles";
const SESSIONS = "stagecraft_sessions";
const CONFIG = "stagecraft_config";

/** True only when real service-role Supabase credentials are configured. */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

interface Ctx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any; // un-generified client; runtime shape enforced by 005/006
  userId: string;
}

/** Resolve the request-scoped DB handle + owning user id, or null if unauthenticated. */
async function ctx(): Promise<Ctx | null> {
  if (devAuthEnabled()) {
    if (!hasSupabaseEnv()) return null; // dev+supabase but no creds → safe empty
    return { db: getSupabaseAdmin(), userId: DEV_USER_ID };
  }
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return null;
  return { db: supabase, userId };
}

function fail(op: string, message: string): never {
  throw new Error(`[supabaseStore] ${op}: ${message}`);
}

// ── sessions ─────────────────────────────────────────────────────────────────

/** Row for write, recomputing the denormalized summary/composite.
 *  `archived_at` omitted so upserts never clobber archive state. */
function toSessionRow(record: SessionRecord, userId: string) {
  const summary = summarise(record);
  return {
    id: record.id,
    user_id: userId,
    started_at: record.startedAt ?? null,
    ended_at: record.endedAt ?? null,
    composite: summary?.composite ?? null,
    summary: summary ?? null,
    data: record,
  };
}

export async function listSessions(): Promise<SessionRecord[]> {
  const c = await ctx();
  if (!c) return [];
  const { data, error } = await c.db
    .from(SESSIONS)
    .select("data")
    .eq("user_id", c.userId)
    .order("started_at", { ascending: false });
  if (error) fail("listSessions", error.message);
  return ((data ?? []) as { data: SessionRecord }[]).map((r) => r.data);
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const c = await ctx();
  if (!c) return null;
  const { data, error } = await c.db
    .from(SESSIONS)
    .select("data")
    .eq("id", id)
    .eq("user_id", c.userId)
    .maybeSingle();
  if (error) fail("getSession", error.message);
  return data ? (data as { data: SessionRecord }).data : null;
}

export async function upsertSession(record: SessionRecord): Promise<void> {
  const c = await ctx();
  if (!c) return;
  const { error } = await c.db
    .from(SESSIONS)
    .upsert(toSessionRow(record, c.userId), { onConflict: "id" });
  if (error) fail("upsertSession", error.message);
}

export async function appendItem(
  sessionId: string,
  item: QAItem,
): Promise<SessionRecord | null> {
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
  const c = await ctx();
  if (!c) return [];
  let query = c.db
    .from(SESSIONS)
    .select("summary")
    .eq("user_id", c.userId)
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
  const c = await ctx();
  if (!c) return defaultProfile;
  const { data, error } = await c.db
    .from(PROFILES)
    .select("data")
    .eq("user_id", c.userId)
    .maybeSingle();
  if (error) fail("getProfile", error.message);
  if (!data) return defaultProfile;
  return { ...defaultProfile, ...(data as { data: Profile }).data };
}

export async function saveProfile(p: Profile): Promise<void> {
  const c = await ctx();
  if (!c) return;
  const { error } = await c.db
    .from(PROFILES)
    .upsert({ user_id: c.userId, data: p }, { onConflict: "user_id" });
  if (error) fail("saveProfile", error.message);
}

/** True once the user has saved a profile (a row exists for them). */
export async function profileExists(): Promise<boolean> {
  const c = await ctx();
  if (!c) return false;
  const { data, error } = await c.db
    .from(PROFILES)
    .select("user_id")
    .eq("user_id", c.userId)
    .maybeSingle();
  if (error) fail("profileExists", error.message);
  return Boolean(data);
}

// ── config ───────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<StagecraftConfig> {
  const c = await ctx();
  if (!c) return {};
  const { data, error } = await c.db
    .from(CONFIG)
    .select("data")
    .eq("user_id", c.userId)
    .maybeSingle();
  if (error) fail("getConfig", error.message);
  return data ? (data as { data: StagecraftConfig }).data : {};
}

export async function saveConfig(conf: StagecraftConfig): Promise<void> {
  const c = await ctx();
  if (!c) return;
  const { error } = await c.db
    .from(CONFIG)
    .upsert({ user_id: c.userId, data: conf }, { onConflict: "user_id" });
  if (error) fail("saveConfig", error.message);
}
