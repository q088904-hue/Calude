/**
 * MeenTrack V2 — persistence layer (provider-agnostic)
 *
 * One interface, two implementations:
 *
 *   • localStore   — backed by window.localStorage. Runs today with zero
 *                     backend. This is what the demo uses.
 *   • supabaseStore — backed by the existing src/lib/supabase client. Inert
 *                     until NEXT_PUBLIC_SUPABASE_URL is set AND the
 *                     `meentrack_profiles` / `meentrack_trips` tables exist
 *                     (migration noted below). Until then it transparently
 *                     delegates to localStore so nothing breaks.
 *
 * `getMeenTrackStore()` picks the right one. Flipping to Supabase later is a
 * config + migration change only — no UI edits:
 *   1. set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   2. run supabase/migrations/003_meentrack_v2.sql (schema + RLS)
 *   3. fill in the supabaseStore method bodies below
 */

import type {
  MeenTrackSnapshot,
  MeenTrackProfile,
  MeenTrackTier,
  TripRecord,
} from "./types";

const KEY = "meentrack.v2.snapshot";

export interface MeenTrackStore {
  /** Provider id — useful for diagnostics / a "synced" badge later. */
  readonly kind: "local" | "supabase";
  load(): Promise<MeenTrackSnapshot>;
  saveProfile(profile: MeenTrackProfile): Promise<void>;
  saveTier(tier: MeenTrackTier, trialDaysLeft: number): Promise<void>;
  addTrip(trip: TripRecord): Promise<void>;
  clear(): Promise<void>;
}

// ── localStorage implementation ───────────────────────────────────────────────

const TIERS: MeenTrackTier[] = ["free", "trialing", "pro"];
const LOCALES = ["en", "ta", "ml"];

/** A guaranteed-safe blank snapshot with its own fresh arrays. */
function freshSnapshot(): MeenTrackSnapshot {
  return { profile: null, tier: "trialing", trialDaysLeft: 5, trips: [] };
}

/**
 * Build a fully-typed snapshot from untrusted JSON. The schema has already
 * evolved (profile → +tier → +trips) so stale blobs from earlier builds can
 * exist; a present-but-wrong-typed field (e.g. `trips: "x"`, a trip missing
 * `catches`) must NOT reach the UI, where `.map`/`.reduce` would throw. Every
 * field is validated and every array/object is rebuilt fresh.
 */
function coerceSnapshot(raw: unknown): MeenTrackSnapshot {
  const snap = freshSnapshot();
  if (!raw || typeof raw !== "object") return snap;
  const r = raw as Record<string, unknown>;

  if (TIERS.includes(r.tier as MeenTrackTier)) snap.tier = r.tier as MeenTrackTier;
  if (typeof r.trialDaysLeft === "number" && Number.isFinite(r.trialDaysLeft)) {
    snap.trialDaysLeft = r.trialDaysLeft;
  }

  const p = r.profile;
  if (p && typeof p === "object") {
    const pr = p as Record<string, unknown>;
    snap.profile = {
      harbor:   typeof pr.harbor === "string" ? pr.harbor : "",
      boatType: typeof pr.boatType === "string" ? pr.boatType : "",
      species:  Array.isArray(pr.species) ? pr.species.filter((s) => typeof s === "string") : [],
      locale:   LOCALES.includes(pr.locale as string) ? (pr.locale as "en" | "ta" | "ml") : "en",
    };
  }

  if (Array.isArray(r.trips)) {
    snap.trips = r.trips
      .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
      .map((t) => ({
        id:          typeof t.id === "string" ? t.id : `trip-${Math.random().toString(36).slice(2)}`,
        startedAt:   typeof t.startedAt === "string" ? t.startedAt : new Date().toISOString(),
        endedAt:     typeof t.endedAt === "string" ? t.endedAt : new Date().toISOString(),
        durationSec: typeof t.durationSec === "number" ? t.durationSec : 0,
        zoneName:    typeof t.zoneName === "string" ? t.zoneName : "",
        biteScore:   typeof t.biteScore === "number" ? t.biteScore : 0,
        catches:     Array.isArray(t.catches)
          ? (t.catches as unknown[])
              .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
              .map((c) => ({
                species: typeof c.species === "string" ? c.species : "",
                count:   typeof c.count === "number" ? c.count : 0,
              }))
          : [],
        harbor:      typeof t.harbor === "string" ? t.harbor : "",
      }));
  }

  return snap;
}

function readLocal(): MeenTrackSnapshot {
  if (typeof window === "undefined") return freshSnapshot();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return freshSnapshot();
    return coerceSnapshot(JSON.parse(raw));
  } catch {
    return freshSnapshot();
  }
}

function writeLocal(snap: MeenTrackSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* quota / private mode — non-fatal, session just won't persist */
  }
}

const localStore: MeenTrackStore = {
  kind: "local",
  async load() {
    return readLocal();
  },
  async saveProfile(profile) {
    writeLocal({ ...readLocal(), profile });
  },
  async saveTier(tier, trialDaysLeft) {
    writeLocal({ ...readLocal(), tier, trialDaysLeft });
  },
  async addTrip(trip) {
    const snap = readLocal();
    writeLocal({ ...snap, trips: [trip, ...snap.trips] });
  },
  async clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  },
};

// ── Supabase implementation (skeleton — delegates until backend is live) ───────

/**
 * When credentials + tables exist, replace each delegate body with the real
 * Supabase reads/writes (client from src/lib/supabase/client.ts). The shape
 * contract is already fixed by MeenTrackStore, so the UI never changes.
 */
const supabaseStore: MeenTrackStore = {
  kind: "supabase",
  async load() {
    // TODO(milestone-1): select from meentrack_profiles + meentrack_trips,
    // plus effective tier from the existing entitlements resolver.
    return localStore.load();
  },
  async saveProfile(profile) {
    return localStore.saveProfile(profile);
  },
  async saveTier(tier, trialDaysLeft) {
    return localStore.saveTier(tier, trialDaysLeft);
  },
  async addTrip(trip) {
    return localStore.addTrip(trip);
  },
  async clear() {
    return localStore.clear();
  },
};

// ── Selector ──────────────────────────────────────────────────────────────────

let _store: MeenTrackStore | null = null;

/**
 * Returns the Supabase store once the project has credentials, otherwise the
 * localStorage store. Memoised — the choice can't change within a session.
 */
export function getMeenTrackStore(): MeenTrackStore {
  if (_store) return _store;
  const hasSupabase =
    typeof process !== "undefined" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  _store = hasSupabase ? supabaseStore : localStore;
  return _store;
}
