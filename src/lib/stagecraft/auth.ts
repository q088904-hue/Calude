// Stagecraft identity + access control (Initiative 3.2).
// Single source for the allowlist, the authenticated-user resolution, the
// mutating-route guard, and the development auth bypass. Server-only.

import { getSupabaseServer } from "@/lib/supabase/server";

export interface StagecraftUser {
  id: string;
  email: string;
}

/** D1 — single permitted account. Lowercase comparison. */
export const STAGECRAFT_ALLOWLIST = ["jsviju@gmail.com"];

/** Stable synthetic id for the dev-bypass user (never used in production). */
export const DEV_USER_ID = "00000000-0000-0000-0000-0000000000d5";

export function isAllowed(email?: string | null): boolean {
  return !!email && STAGECRAFT_ALLOWLIST.includes(email.toLowerCase());
}

/**
 * Dev-only auth bypass. Fail-closed: hard-gated on NODE_ENV so the bypass can
 * NEVER authenticate in production even if STAGECRAFT_DEV_AUTH leaks into the env.
 */
export function devAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.STAGECRAFT_DEV_AUTH === "1"
  );
}

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
  return Response.json(
    { error: "Authentication required." },
    { status: 401 },
  );
}
