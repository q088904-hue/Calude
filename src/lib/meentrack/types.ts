/**
 * MeenTrack V2 — persisted data shapes
 *
 * Provider-agnostic. The localStorage store and the (future) Supabase store
 * both read/write exactly these shapes, so swapping backends is invisible to
 * the UI.
 */

export type Locale = "en" | "ta" | "ml";

/** Subscription tier as the V2 UI understands it (matches DemoControls). */
export type MeenTrackTier = "free" | "trialing" | "pro";

/** Captured during onboarding; the user's home/profile context. */
export interface MeenTrackProfile {
  harbor:   string;
  boatType: string;
  species:  string[];
  locale:   Locale;
}

/** One completed trip — persisted on End Trip (wired in a later slice). */
export interface TripRecord {
  id:          string;
  startedAt:   string;   // ISO
  endedAt:     string;   // ISO
  durationSec: number;
  zoneName:    string;
  biteScore:   number;
  catches:     { species: string; count: number }[];
  harbor:      string;
}

/** Everything the V2 session needs to rehydrate after a reload. */
export interface MeenTrackSnapshot {
  profile:       MeenTrackProfile | null;
  tier:          MeenTrackTier;
  trialDaysLeft: number;
  trips:         TripRecord[];
}

/**
 * Read-only default for initial hook state only. The store NEVER hands this
 * out — it builds fresh, type-validated snapshots (see freshSnapshot /
 * coerceSnapshot in store.ts), so there is no shared-mutable-array risk here.
 * Treat as immutable; never mutate `.trips` in place.
 */
export const EMPTY_SNAPSHOT: MeenTrackSnapshot = {
  profile:       null,
  tier:          "trialing",
  trialDaysLeft: 5,
  trips:         [],
};
