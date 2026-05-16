"use client";

/**
 * useMeenTrackSession — single hook the V2 page uses for persisted state.
 *
 * Hydrates from the active store (localStorage today, Supabase when wired)
 * after mount, then mirrors every change back. `hydrated` lets the page hold
 * the first paint until persisted state is known, so a returning user doesn't
 * see a flash of onboarding before being skipped past it.
 */

import { useCallback, useEffect, useState } from "react";
import { getMeenTrackStore } from "./store";
import type {
  MeenTrackProfile,
  MeenTrackTier,
  TripRecord,
} from "./types";
import { EMPTY_SNAPSHOT } from "./types";

export function useMeenTrackSession() {
  // getMeenTrackStore() memoises internally — same instance every call, so no
  // ref needed (and a ref read during render is disallowed).
  const store = getMeenTrackStore();

  const [hydrated,      setHydrated]      = useState(false);
  const [profile,       setProfile]       = useState<MeenTrackProfile | null>(EMPTY_SNAPSHOT.profile);
  const [tier,          setTierState]     = useState<MeenTrackTier>(EMPTY_SNAPSHOT.tier);
  const [trialDaysLeft, setTrialState]    = useState(EMPTY_SNAPSHOT.trialDaysLeft);
  const [trips,         setTrips]         = useState<TripRecord[]>(EMPTY_SNAPSHOT.trips);

  // Hydrate once on mount.
  useEffect(() => {
    let alive = true;
    store.load().then((snap) => {
      if (!alive) return;
      setProfile(snap.profile);
      setTierState(snap.tier);
      setTrialState(snap.trialDaysLeft);
      setTrips(snap.trips);
      setHydrated(true);
    });
    return () => { alive = false; };
  }, [store]);

  const saveProfile = useCallback((p: MeenTrackProfile) => {
    setProfile(p);
    void store.saveProfile(p);
  }, [store]);

  const setTier = useCallback((t: MeenTrackTier, days: number) => {
    setTierState(t);
    setTrialState(days);
    void store.saveTier(t, days);
  }, [store]);

  const addTrip = useCallback((trip: TripRecord) => {
    setTrips((prev) => [trip, ...prev]);
    void store.addTrip(trip);
  }, [store]);

  const resetSession = useCallback(() => {
    setProfile(null);
    setTierState(EMPTY_SNAPSHOT.tier);
    setTrialState(EMPTY_SNAPSHOT.trialDaysLeft);
    setTrips([]);
    void store.clear();
  }, [store]);

  return {
    /** Provider id — "local" | "supabase". */
    storeKind: store.kind,
    hydrated,
    profile,
    tier,
    trialDaysLeft,
    trips,
    saveProfile,
    setTier,
    addTrip,
    resetSession,
  };
}
