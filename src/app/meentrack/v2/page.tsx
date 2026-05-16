"use client";

/**
 * MeenTrack V2 — Production UI Demo
 * Route: /meentrack/v2
 *
 * Orchestrates all 5 screens + shared chrome (AppShell, BottomNav, SeaStatusBanner).
 * AnimatePresence handles screen transitions (slide in from right).
 *
 * Key: main app content (SeaStatusBanner + screens + BottomNav) is gated behind
 * `onboarded` so it mounts fresh when first revealed — entrance animations fire
 * as the user sees each screen, not silently at app load while onboarding covers them.
 */

import { useState, useRef, useEffect } from "react";
import { useEscapeKey } from "@/components/meentrack/v2/shared/hooks";
import { useMeenTrackSession } from "@/lib/meentrack/useMeenTrackSession";
import type { TripRecord } from "@/lib/meentrack/types";
import { MeenTrackI18nProvider, translate } from "@/lib/meentrack/i18n";
import { motion, AnimatePresence } from "framer-motion";

import { AppShell }        from "@/components/meentrack/v2/shared/AppShell";
import { BottomNav, NavTab } from "@/components/meentrack/v2/shared/BottomNav";
import { Toast }            from "@/components/meentrack/v2/shared/Atoms";
import { ScreenErrorBoundary } from "@/components/meentrack/v2/shared/ErrorBoundary";
import { HomeDashboard }   from "@/components/meentrack/v2/screens/HomeDashboard";
import { HotspotFinder }   from "@/components/meentrack/v2/screens/HotspotFinder";
import { WeatherAlerts }   from "@/components/meentrack/v2/screens/WeatherAlerts";
import { Paywall }         from "@/components/meentrack/v2/screens/Paywall";
import { ProfileSettings } from "@/components/meentrack/v2/screens/ProfileSettings";
import { TripLog }              from "@/components/meentrack/v2/screens/TripLog";
import { ActiveTrip }           from "@/components/meentrack/v2/screens/ActiveTrip";
import { NotificationDrawer }   from "@/components/meentrack/v2/screens/NotificationDrawer";
import { Onboarding, OnboardingData } from "@/components/meentrack/v2/screens/Onboarding";
import { SeaStatusBanner, NoGoModal, type SeaLevel } from "@/components/meentrack/SeaStatusBanner";
import { DemoControls, type DemoTier, type DemoLocale } from "@/components/meentrack/DemoControls";

// Tab → screen slot mapping
const TAB_ORDER: NavTab[] = ["home", "map", "catch", "weather", "profile"];

// i18n keys for the <main> landmark — AT announces this on tab switch, so it
// must localize with the rest of the chrome. "catch" is overridden at runtime
// when a trip is active (see aria-label below).
const TAB_LABEL_KEYS: Record<NavTab, string> = {
  home:    "screen.home",
  map:     "screen.hotspotFinder",
  catch:   "screen.tripLog",
  weather: "screen.weatherAlerts",
  profile: "screen.profile",
};

/**
 * Soft cross-dissolve with a 28 px directional nudge.
 * Both screens animate simultaneously (mode="sync") — the incoming screen
 * sits above the outgoing one in the DOM so it naturally layers on top.
 * Spring on x gives a slight overshoot that reads as "snap"; 0.15 s opacity
 * fades each screen quickly so the colour-mismatch between panels is brief.
 */
const slideVariants = {
  initial: (dir: number) => ({ x: dir > 0 ? 28 : -28, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit:    (dir: number) => ({ x: dir < 0 ? 28 : -28, opacity: 0 }),
};

const transition = {
  x:       { type: "spring" as const, stiffness: 420, damping: 38 },
  opacity: { duration: 0.15, ease: "easeInOut" as const },
};

// Representative wave height per sea level — drives the SeaStatusBanner
// sub-label in the demo until the real INCOIS feed lands (Milestone 1).
const WAVE_BY_LEVEL: Record<SeaLevel, number> = {
  green: 0.8,
  amber: 1.8,
  red:   2.8,
  nogo:  4.2,
};

export default function MeenTrackV2() {
  const [onboarded,      setOnboarded]     = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({ harbor: "", boatType: "", species: [], locale: "en" });
  const [tab,            setTab]           = useState<NavTab>("home");
  const [prevTab,        setPrevTab]       = useState<NavTab>("home");
  const [showPaywall,    setPaywall]       = useState(false);
  const [activeTrip,     setActiveTrip]   = useState(false);
  const [tripStartTime,  setTripStart]    = useState<Date | null>(null);
  const [showNotifs,     setShowNotifs]   = useState(false);
  const [unreadCount,    setUnreadCount]  = useState(2); // matches 2 unread in mock data
  const [toastMsg,      setToastMsg]  = useState("");
  const [toastVisible,  setToastVis]  = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Demo state ───────────────────────────────────────────────────────────────
  // Drives SeaStatusBanner / NoGoModal / locale until real data lands. The panel
  // is collapsed by default and pinned above the No-Go modal so state stays
  // flippable even while the safety block is up.
  const [seaLevel,      setSeaLevel]   = useState<SeaLevel>("green");
  const [tier,          setTier]       = useState<DemoTier>("trialing");
  const [demoLocale,    setDemoLocale] = useState<DemoLocale>("en");
  const [trialDaysLeft, setTrialDays]  = useState(5);
  const [demoOpen,      setDemoOpen]   = useState(false);

  // ── Persistence (Milestone 1) ────────────────────────────────────────────────
  // localStorage today; transparently Supabase once credentials + tables exist.
  const session = useMeenTrackSession();
  const [hydrationApplied, setHydrationApplied] = useState(false);

  // Apply persisted state once, the moment the store finishes hydrating. A
  // returning user with a saved profile skips straight past onboarding. All
  // setState calls batch into one render, so there is no onboarding flash.
  useEffect(() => {
    if (!session.hydrated || hydrationApplied) return;
    // rAF defers the state apply off the synchronous effect body so it
    // doesn't trip the cascading-render rule; runs within ~16ms, and the
    // first-paint gate below holds the UI until it lands (no flash).
    const raf = requestAnimationFrame(() => {
      if (session.profile) {
        setOnboardingData(session.profile);
        setDemoLocale(session.profile.locale);
        setOnboarded(true);
      }
      setTier(session.tier);
      setTrialDays(session.trialDaysLeft);
      setHydrationApplied(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [session.hydrated, session.profile, session.tier, session.trialDaysLeft, hydrationApplied]);

  // Demo tier / trial-day changes persist through the store.
  function handleTier(t: DemoTier) {
    setTier(t);
    session.setTier(t, trialDaysLeft);
  }
  function handleTrialDays(n: number) {
    setTrialDays(n);
    session.setTier(tier, n);
  }

  // Dismiss overlays on Escape — paywall takes precedence over notifications.
  useEscapeKey(() => setPaywall(false),    showPaywall);
  useEscapeKey(() => setShowNotifs(false), showNotifs && !showPaywall);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVis(true);
    toastTimer.current = setTimeout(() => setToastVis(false), 2800);
  }

  function navigate(next: NavTab) {
    setPrevTab(tab);
    setTab(next);
  }

  function handleStartTrip() {
    // Safety invariant (#1): never start a trip under Red / No-Go conditions.
    // Success metric: 0 trips started under Red/No-Go.
    if (seaLevel === "red" || seaLevel === "nogo") {
      showToast(
        seaLevel === "nogo"
          ? "No-Go today — do not go to sea"
          : "Dangerous conditions — return to harbor",
      );
      return;
    }
    if (!activeTrip) {
      setTripStart(new Date());
      setActiveTrip(true);
    }
    setPrevTab(tab);
    setTab("catch");
  }

  function handleEndTrip(trip: TripRecord) {
    session.addTrip(trip);   // persist — surfaces in Trip Log, survives reload
    setActiveTrip(false);
    setTripStart(null);
    setPrevTab("home"); // dir = indexOf("catch") - indexOf("home") = 2 → TripLog enters from the right
  }

  // Trial and paid tiers both grant Pro feature access; only "free" is gated.
  const isPro = tier !== "free";

  const dir = TAB_ORDER.indexOf(tab) - TAB_ORDER.indexOf(prevTab);

  // Hold the first paint until persisted state is known AND applied — a
  // returning user must never flash the onboarding screen before the
  // hydration effect skips them past it.
  if (!session.hydrated || !hydrationApplied) {
    return <AppShell><div className="flex-1" /></AppShell>;
  }

  return (
    <MeenTrackI18nProvider locale={demoLocale}>
    <AppShell>
      {/* ── Onboarding overlay ────────────────────────────────────────────────
          Absolute-positioned at z-60 so it covers the entire app.
          Exits with a scale-fade that "lifts off" to reveal the screen below. */}
      <AnimatePresence>
        {!onboarded && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-[60] flex flex-col bg-mt-bg"
          >
            <Onboarding
              onComplete={(data) => {
                setOnboardingData(data);
                setDemoLocale(data.locale);
                setOnboarded(true);
                session.saveProfile(data);   // persist — skips onboarding next visit
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main app content ──────────────────────────────────────────────────
          Only mounts after onboarding completes — this ensures every screen's
          entrance animations fire fresh the first time the user sees them,
          rather than silently completing while the onboarding overlay hides them.
          The 0.18 s fade-in overlaps with the last half of the onboarding exit
          (0.35 s) for a seamless cross-dissolve handoff. */}
      {onboarded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Sea Status Banner — always visible at top */}
          <SeaStatusBanner
            level={seaLevel}
            waveHeight={WAVE_BY_LEVEL[seaLevel]}
            source="INCOIS"
            locale={demoLocale}
          />

          {/* Screen area */}
          <main
            aria-label={
              tab === "catch" && activeTrip
                ? translate(demoLocale, "screen.activeTrip")
                : translate(demoLocale, TAB_LABEL_KEYS[tab])
            }
            className="flex-1 flex flex-col overflow-hidden relative"
          >
            <ScreenErrorBoundary resetKey={tab} name={tab}>
            <AnimatePresence mode="sync" custom={dir}>
              {tab === "home" && (
                <motion.div
                  key="home"
                  custom={dir}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="absolute inset-0 flex flex-col"
                >
                  <HomeDashboard
                    onUpgrade={()    => setPaywall(true)}
                    onStartTrip={handleStartTrip}
                    onNotify={() => setShowNotifs(true)}
                    onToast={showToast}
                    tripStartTime={tripStartTime}
                    hasUnread={unreadCount > 0}
                    harbor={onboardingData.harbor}
                    species={onboardingData.species}
                    isPro={isPro}
                  />
                </motion.div>
              )}

              {/* Catch tab: TripLog (no active trip) or ActiveTrip (trip in progress) */}
              {tab === "catch" && !activeTrip && (
                <motion.div
                  key="catch-log"
                  custom={dir}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="absolute inset-0 flex flex-col"
                >
                  <TripLog
                    onStartTrip={handleStartTrip}
                    onUpgrade={() => setPaywall(true)}
                    onToast={showToast}
                    isPro={isPro}
                    trips={session.trips}
                  />
                </motion.div>
              )}

              {tab === "catch" && activeTrip && (
                <motion.div
                  key="catch-active"
                  custom={dir}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="absolute inset-0 flex flex-col"
                >
                  <ActiveTrip
                    startTime={tripStartTime!}
                    onEndTrip={handleEndTrip}
                    onToast={showToast}
                    harbor={onboardingData.harbor}
                  />
                </motion.div>
              )}

              {tab === "map" && (
                <motion.div
                  key="map"
                  custom={dir}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="absolute inset-0 flex flex-col"
                >
                  <HotspotFinder onUpgrade={() => setPaywall(true)} onToast={showToast} isPro={isPro} />
                </motion.div>
              )}

              {tab === "weather" && (
                <motion.div
                  key="weather"
                  custom={dir}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="absolute inset-0 flex flex-col"
                >
                  <WeatherAlerts harbor={onboardingData.harbor} />
                </motion.div>
              )}

              {tab === "profile" && (
                <motion.div
                  key="profile"
                  custom={dir}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="absolute inset-0 flex flex-col"
                >
                  <ProfileSettings
                    onUpgrade={() => setPaywall(true)}
                    onToast={showToast}
                    harbor={onboardingData.harbor}
                    species={onboardingData.species}
                    tier={tier}
                    trialDaysLeft={trialDaysLeft}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </ScreenErrorBoundary>

            {/* Paywall overlay — slides up from bottom */}
            <AnimatePresence>
              {showPaywall && (
                <motion.div
                  key="paywall"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Upgrade to Pro"
                  initial={{ y: "100%" }}
                  animate={{ y: "0%" }}
                  exit={{ y: "100%", transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
                  transition={{ type: "spring", stiffness: 280, damping: 32 }}
                  className="absolute inset-0 z-30 flex flex-col bg-mt-bg overflow-hidden"
                >
                  <Paywall onClose={() => setPaywall(false)} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notification drawer — slides down from top */}
            <NotificationDrawer
              visible={showNotifs}
              onClose={() => setShowNotifs(false)}
              onMarkAllRead={() => setUnreadCount(0)}
            />

            {/* Toast snackbar — sits above bottom nav */}
            <Toast message={toastMsg} visible={toastVisible} />
          </main>

          {/* Bottom navigation */}
          <BottomNav active={tab} onChange={navigate} tripActive={activeTrip} />
        </motion.div>
      )}
    </AppShell>

    {/* ── No-Go safety block ──────────────────────────────────────────────────
        Full-screen, non-dismissible. Mounted only after onboarding so it can't
        cover the first-run flow. Enforces the #1 safety outcome at the app
        level — combined with the handleStartTrip guard, 0 trips can start. */}
    <AnimatePresence>
      {onboarded && seaLevel === "nogo" && <NoGoModal locale={demoLocale} />}
    </AnimatePresence>

    {/* ── Demo controls ───────────────────────────────────────────────────────
        Dev-only. Fixed + z-[70] so it stays above the No-Go modal (z-50),
        keeping sea level / tier / locale flippable even while blocked.
        Collapsed by default behind a gear toggle so it never obscures the UI. */}
    <div className="fixed bottom-3 right-3 z-[70] flex flex-col items-end gap-2">
      <button
        onClick={() => setDemoOpen((o) => !o)}
        aria-label={demoOpen ? "Hide demo controls" : "Show demo controls"}
        aria-expanded={demoOpen}
        className="meentrack-v2 w-11 h-11 rounded-full bg-mt-surface border border-mt-border text-mt-aqua text-[18px] flex items-center justify-center shadow-lg"
      >
        ⚙
      </button>
      <AnimatePresence>
        {demoOpen && (
          <motion.div
            key="demo-panel"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="meentrack-v2 w-[320px] max-h-[80vh] overflow-y-auto scrollbar-none rounded-2xl"
          >
            <DemoControls
              tier={tier}
              seaLevel={seaLevel}
              locale={demoLocale}
              trialDaysLeft={trialDaysLeft}
              onTier={handleTier}
              onSeaLevel={setSeaLevel}
              onLocale={setDemoLocale}
              onTrialDays={handleTrialDays}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MeenTrackI18nProvider>
  );
}
