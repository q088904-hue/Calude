// First-party, owner-scoped analytics events (Initiative 3.3-D).
// Mirrors src/lib/pi/metrics.ts. Writes to stagecraft_events via the SSR client
// (RLS owner-only on auth.uid()). Best-effort: analytics must NEVER break a
// request. No-op on the file backend / when unauthenticated. Server-only.

import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveStagecraftUser } from "./auth";
import { isSupabaseBackend } from "./storeBackend";

export type StagecraftEvent =
  | "login"
  | "session_start"
  | "session_complete"
  | "grade"
  | "export"
  | "error";

/** Fire-and-forget event capture. Swallows all errors. */
export async function emit(
  event: StagecraftEvent,
  props: Record<string, unknown> = {},
): Promise<void> {
  try {
    if (!isSupabaseBackend()) return; // analytics only meaningful on the durable backend
    const user = await resolveStagecraftUser();
    if (!user) return;
    const supabase = await getSupabaseServer();
    // Un-generified client resolves insert() to `never`; loose handle (repo convention).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("stagecraft_events")
      .insert({ user_id: user.id, event, props });
  } catch {
    /* analytics is best-effort — never propagate */
  }
}
