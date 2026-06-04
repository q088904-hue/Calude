// One-time, idempotent sentinel-claim (Initiative 3.2, D3).
// Reassigns the 3.1 single-tenant rows (user_id = sentinel) to the authenticated
// user's id on first login. Uses the service-role admin client because changing
// user_id across owners must bypass RLS. Allowlist-guarded; re-running is a no-op
// (no sentinel rows remain). Reversible (admin can move uid → sentinel).
// Server-only.

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SENTINEL_USER_ID, hasSupabaseEnv } from "./supabaseStore";
import { isAllowed } from "./authShared";

const TABLES = [
  "stagecraft_profiles",
  "stagecraft_sessions",
  "stagecraft_config",
] as const;

export interface ClaimResult {
  claimed: Record<string, number>;
  skipped?: string;
}

export async function claimSentinelRows(
  userId: string,
  email: string,
): Promise<ClaimResult> {
  if (!isAllowed(email)) return { claimed: {}, skipped: "not-allowed" };
  if (!hasSupabaseEnv()) return { claimed: {}, skipped: "no-supabase-env" };
  if (userId === SENTINEL_USER_ID) return { claimed: {}, skipped: "sentinel-self" };

  // Loose handle — un-generified admin client resolves .update() to `never`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;
  const claimed: Record<string, number> = {};
  for (const t of TABLES) {
    // Move only rows still on the sentinel → idempotent.
    const { data, error } = await admin
      .from(t)
      .update({ user_id: userId })
      .eq("user_id", SENTINEL_USER_ID)
      .select("user_id");
    if (error) throw new Error(`[claimSentinel] ${t}: ${error.message}`);
    claimed[t] = (data as unknown[] | null)?.length ?? 0;
  }
  return { claimed };
}
