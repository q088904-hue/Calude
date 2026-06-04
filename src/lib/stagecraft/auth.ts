// Stagecraft identity + access control (Initiative 3.2).
// Server-side resolution + the mutating-route guard. Pure/edge-safe primitives
// (allowlist, dev bypass) live in authShared.ts and are re-exported here.
// Server-only (imports getSupabaseServer → next/headers).

import { getSupabaseServer } from "@/lib/supabase/server";
import {
  STAGECRAFT_ALLOWLIST,
  DEV_USER_ID,
  isAllowed,
  devAuthEnabled,
  type StagecraftUser,
} from "./authShared";

export {
  STAGECRAFT_ALLOWLIST,
  DEV_USER_ID,
  isAllowed,
  devAuthEnabled,
  type StagecraftUser,
};

function devUser(): StagecraftUser {
  const email = process.env.STAGECRAFT_DEV_USER ?? STAGECRAFT_ALLOWLIST[0];
  return { id: DEV_USER_ID, email };
}

/**
 * Resolve the current Stagecraft user, or null if not authenticated / not
 * allowlisted. Usable from route handlers and server components (reads the
 * cookie session via getSupabaseServer()).
 */
export async function resolveStagecraftUser(): Promise<StagecraftUser | null> {
  if (devAuthEnabled()) return devUser();
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  return u && isAllowed(u.email) ? { id: u.id, email: u.email as string } : null;
}

/**
 * Guard for mutating route handlers. Returns the user, or a 401 Response to
 * return directly:
 *   const u = await requireStagecraftUser();
 *   if (u instanceof Response) return u;
 */
export async function requireStagecraftUser(): Promise<StagecraftUser | Response> {
  const user = await resolveStagecraftUser();
  if (user) return user;
  return Response.json({ error: "Authentication required." }, { status: 401 });
}
