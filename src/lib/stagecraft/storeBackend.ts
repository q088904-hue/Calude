// Persistence backend selector for Stagecraft.
// The file store (.stagecraft/*.json) is the DEFAULT and only changes when
// STAGECRAFT_STORE is explicitly set to "supabase". Cutover is therefore a pure
// environment flip — no code change, instantly reversible.
// Server-only.

export function isSupabaseBackend(): boolean {
  return process.env.STAGECRAFT_STORE === "supabase";
}
