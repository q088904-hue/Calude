"use client";

// MeenTrack Demo Page — /meentrack
// Shows the complete subscription UX in a realistic mobile shell:
//   - Sea Status Banner (all 4 states)
//   - BiteTime™ cards (free 3-band vs Pro 0-100)
//   - Locked feature cards → subscription modal
//   - Trial countdown chip in bottom nav
//   - No-Go modal blocking Start Trip
// Demo controls let you switch tier / sea status / locale without reloading.

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fish, Map, Navigation, Camera, Zap, Home,
  AlertTriangle, Anchor, Search
} from "lucide-react";

import { SeaStatusBanner, NoGoModal, SeaLevel } from "@/components/meentrack/SeaStatusBanner";
import { BiteTimeCard, DEMO_HARBORS } from "@/components/meentrack/BiteTimeCard";
import { DemoControls, DemoTier, DemoLocale } from "@/components/meentrack/DemoControls";
import { LockedFeatureCard } from "@/components/paywall/LockedFeatureCard";
import { TrialCountdown } from "@/components/paywall/TrialCountdown";
import { SubscriptionModal, ModalTrigger } from "@/components/paywall/SubscriptionModal";
import { Feature } from "@/lib/payments/types";
import { getPaywallCopy } from "@/lib/i18n/paywall";

// ── Wave heights per sea level (demo values) ──────────────────────────────────
const WAVE_BY_LEVEL: Record<SeaLevel, number> = {
  green: 0.8,
  amber: 1.9,
  red:   3.1,
  nogo:  4.2,
};

// ── Feature gate (client-side optimistic, matches server resolve logic) ────────
function canAccess(feature: Feature, tier: DemoTier): boolean {
  if (tier === "pro") return true;
  if (tier === "trialing") return true;
  const FREE_FEATURES = new Set<Feature>([]); // nothing Pro-gated is free
  return FREE_FEATURES.has(feature);
}

export default function MeenTrackDemo() {
  // ── Demo state ──────────────────────────────────────────────────────────────
  const [tier, setTier] = useState<DemoTier>("free");
  const [seaLevel, setSeaLevel] = useState<SeaLevel>("green");
  const [locale, setLocale] = useState<DemoLocale>("en");
  const [trialDaysLeft, setTrialDaysLeft] = useState(5);
  const [activeTab, setActiveTab] = useState<"home" | "map" | "advisor" | "trip">("home");
  const [showNoGoModal, setShowNoGoModal] = useState(false);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<{ isOpen: boolean; trigger: ModalTrigger }>({
    isOpen: false,
    trigger: { kind: "deliberate" },
  });

  const openModal = useCallback(
    (trigger: ModalTrigger) => {
      // Suppress modal in Red/No-Go — safety first
      if (seaLevel === "red" || seaLevel === "nogo") return;
      setModal({ isOpen: true, trigger });
    },
    [seaLevel]
  );

  const closeModal = useCallback(() => setModal((s) => ({ ...s, isOpen: false })), []);

  const handleLockedTap = useCallback(
    (featureId: Feature) => {
      if (canAccess(featureId, tier)) return; // already has access
      openModal({ kind: "locked_feature", featureId });
    },
    [tier, openModal]
  );

  const handleStartTrial = useCallback(async () => {
    // Simulate trial start (no real API in demo)
    await new Promise((r) => setTimeout(r, 600));
    setTier("trialing");
    setTrialDaysLeft(7);
    closeModal();
  }, [closeModal]);

  const handleSubscribe = useCallback(
    async (t: "pro" | "fleet", _interval: "monthly" | "yearly") => {
      await new Promise((r) => setTimeout(r, 400));
      setTier(t === "fleet" ? "pro" : "pro"); // both upgrade to pro in demo
      closeModal();
    },
    [closeModal]
  );

  const handleStartTrip = useCallback(() => {
    if (seaLevel === "nogo" || seaLevel === "red") {
      setShowNoGoModal(true);
    }
    // else → show checklist (Phase 4, not implemented here)
  }, [seaLevel]);

  const c = getPaywallCopy(locale);
  const isPro = tier === "pro" || tier === "trialing";
  const waveHeight = WAVE_BY_LEVEL[seaLevel];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* No-Go modal — blocks everything */}
      <AnimatePresence>
        {showNoGoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60]"
          >
            <NoGoModal locale={locale} />
            <button
              onClick={() => setShowNoGoModal(false)}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#8FA3BF] text-sm underline"
            >
              (demo: dismiss)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription modal */}
      <SubscriptionModal
        isOpen={modal.isOpen}
        trigger={modal.trigger}
        locale={locale}
        onClose={closeModal}
        onTrialStart={handleStartTrial}
        onSubscribe={handleSubscribe}
      />

      {/* App shell — 360 px max, centered on desktop */}
      <div className="mx-auto max-w-[430px] min-h-dvh flex flex-col relative">

        {/* ── Sea Status Banner ─────────────────────────────────────────────── */}
        <SeaStatusBanner
          level={seaLevel}
          waveHeight={waveHeight}
          locale={locale}
          isStale={false}
        />

        {/* ── Scrollable content area ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-24">

          {/* Demo controls */}
          <DemoControls
            tier={tier}
            seaLevel={seaLevel}
            locale={locale}
            trialDaysLeft={trialDaysLeft}
            onTier={setTier}
            onSeaLevel={setSeaLevel}
            onLocale={setLocale}
            onTrialDays={setTrialDaysLeft}
          />

          {/* ── Home tab ────────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="px-4 pt-4 flex flex-col gap-5"
              >

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-[#F5F9FF] text-xl font-bold">
                      {locale === "ta" ? "வணக்கம்" : locale === "ml" ? "സ്വാഗതം" : "Good morning"}
                      {tier === "pro" && (
                        <span className="ml-2 text-[#00E5FF] text-sm font-normal">· Pro</span>
                      )}
                      {tier === "trialing" && (
                        <span className="ml-2 text-[#FFB800] text-sm font-normal">· Trial</span>
                      )}
                    </h1>
                    <p className="text-[#8FA3BF] text-sm">
                      {locale === "ta" ? "கோச்சி துறைமுகம்" : locale === "ml" ? "കൊച്ചി തുറമുഖം" : "Kochi harbor"}
                    </p>
                  </div>
                  {/* Trial countdown chip */}
                  {tier === "trialing" && (
                    <TrialCountdown
                      daysLeft={trialDaysLeft}
                      locale={locale}
                      onClick={() => openModal({ kind: "deliberate" })}
                    />
                  )}
                </div>

                {/* Start Trip CTA */}
                <button
                  onClick={handleStartTrip}
                  className={`w-full min-h-[56px] rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 ${
                    seaLevel === "nogo" || seaLevel === "red"
                      ? "bg-[#B00020]/20 text-[#FF3B30] border border-[#B00020]/40 cursor-not-allowed"
                      : "bg-[#00E5FF] text-[#0A1628] hover:bg-[#00CCEE]"
                  }`}
                >
                  <Anchor className="w-5 h-5" />
                  {locale === "ta"
                    ? "பயணம் தொடங்கு"
                    : locale === "ml"
                    ? "യാത്ര ആരംഭിക്കുക"
                    : seaLevel === "nogo" || seaLevel === "red"
                    ? "Cannot start — unsafe conditions"
                    : "Start trip"}
                </button>

                {/* AI Quick actions */}
                <div>
                  <p className="text-[#8FA3BF] text-xs font-semibold uppercase tracking-wider mb-3">
                    {locale === "ta" ? "AI கருவிகள்" : locale === "ml" ? "AI ടൂളുകൾ" : "AI tools"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Hotspot Finder */}
                    {canAccess("advisor_query", tier) ? (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="bg-[#0F2A45] border border-[#00E5FF]/30 rounded-2xl p-4 flex flex-col gap-2 text-left"
                      >
                        <Fish className="w-6 h-6 text-[#00E5FF]" />
                        <p className="text-[#F5F9FF] font-semibold text-sm">
                          {locale === "ta" ? "மீன் கண்டுபிடி" : locale === "ml" ? "മത്സ്യം കണ്ടെത്തുക" : "Find fish"}
                        </p>
                        <p className="text-[#8FA3BF] text-xs">AI hotspot finder</p>
                      </motion.button>
                    ) : (
                      <LockedFeatureCard
                        featureId="advisor_query"
                        locale={locale}
                        description="AI hotspot predictions"
                        compact
                        onCta={() => handleLockedTap("advisor_query")}
                      />
                    )}

                    {/* Species ID */}
                    {canAccess("species_id", tier) ? (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="bg-[#0F2A45] border border-[#00E5FF]/30 rounded-2xl p-4 flex flex-col gap-2 text-left"
                      >
                        <Camera className="w-6 h-6 text-[#00E5FF]" />
                        <p className="text-[#F5F9FF] font-semibold text-sm">
                          {locale === "ta" ? "மீன் அறிவு" : locale === "ml" ? "മത്സ്യ തിരിച്ചറിയൽ" : "Identify fish"}
                        </p>
                        <p className="text-[#8FA3BF] text-xs">Photo → species + price</p>
                      </motion.button>
                    ) : (
                      <LockedFeatureCard
                        featureId="species_id"
                        locale={locale}
                        description="Photo → name + market price"
                        compact
                        onCta={() => handleLockedTap("species_id")}
                      />
                    )}
                  </div>
                </div>

                {/* BiteTime section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#8FA3BF] text-xs font-semibold uppercase tracking-wider">
                      BiteTime™{" "}
                      {isPro
                        ? "· today + 48h"
                        : "· today (3-band · "}
                      {!isPro && (
                        <button
                          onClick={() => openModal({ kind: "locked_feature", featureId: "bitetime_forecast" })}
                          className="text-[#00E5FF] underline"
                        >
                          {locale === "ta" ? "Pro-க்கு மேம்படுத்து" : locale === "ml" ? "Pro-ലേക്ക് അപ്‌ഗ്രേഡ്" : "upgrade for forecast"}
                        </button>
                      )}
                      {!isPro && ")"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {DEMO_HARBORS.map((harbor) => (
                      <BiteTimeCard
                        key={harbor.slug}
                        harbor={harbor}
                        locale={locale}
                        isPro={isPro}
                        isLocked={!isPro}
                        onUnlock={() => handleLockedTap("bitetime_forecast")}
                      />
                    ))}
                  </div>
                </div>

                {/* Upgrade nudge for free users */}
                {tier === "free" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-[#0F1E33] border border-[#00E5FF]/20 rounded-2xl p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-[#00E5FF] flex-shrink-0" />
                      <div>
                        <p className="text-[#F5F9FF] font-semibold text-sm">
                          {c.headline}
                        </p>
                        <p className="text-[#8FA3BF] text-xs mt-0.5">{c.subhead}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal({ kind: "deliberate" })}
                      className="w-full min-h-[56px] rounded-xl bg-[#00E5FF] text-[#0A1628] font-semibold text-base active:scale-98 transition-transform"
                    >
                      {c.startTrialCta}
                    </button>
                    <p className="text-center text-[#8FA3BF] text-xs">{c.noCardNeeded}</p>
                  </motion.div>
                )}

              </motion.div>
            )}

            {/* ── Map tab ──────────────────────────────────────────────────── */}
            {activeTab === "map" && (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-4 pt-4 flex flex-col gap-4"
              >
                <h2 className="text-[#F5F9FF] text-lg font-bold">
                  {locale === "ta" ? "மீன்பிடி வரைபடம்" : locale === "ml" ? "ഫിഷിംഗ് മാപ്പ്" : "Fishing map"}
                </h2>

                {/* Map placeholder with IMBL label */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#051020] border border-[#1A2E4A] flex items-center justify-center">
                  {/* Fake ocean grid */}
                  <div className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: "linear-gradient(#1A2E4A 1px, transparent 1px), linear-gradient(90deg, #1A2E4A 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />
                  {/* IMBL line */}
                  <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-[#FF3B30]/60" />
                  <div className="absolute right-1 top-4 text-[#FF3B30] text-[10px] font-mono rotate-90 origin-right whitespace-nowrap">
                    IMBL
                  </div>
                  {/* Current position dot */}
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-[#00E5FF] animate-ping opacity-40 absolute -inset-2" />
                    <div className="w-3 h-3 rounded-full bg-[#00E5FF] relative" />
                  </div>
                  <p className="absolute bottom-4 left-0 right-0 text-center text-[#8FA3BF] text-xs">
                    MapLibre map — Phase 2 build
                  </p>
                </div>

                {/* Layer toggles */}
                <div className="flex flex-col gap-3">
                  <p className="text-[#8FA3BF] text-xs font-semibold uppercase tracking-wider">Map layers</p>
                  {[
                    { id: "pfz_layer" as Feature,         label: "Potential Fishing Zones",  locked: !isPro },
                    { id: "bathymetry_layer" as Feature,  label: "Depth + Hazards",          locked: !isPro },
                    { id: "advisor_query" as Feature,     label: "My catch history",   locked: false  },
                  ].map(({ id, label, locked }) =>
                    locked ? (
                      <LockedFeatureCard
                        key={id}
                        featureId={id}
                        locale={locale}
                        description={label}
                        onCta={() => handleLockedTap(id)}
                      />
                    ) : (
                      <div
                        key={id}
                        className="bg-[#0F1E33] border border-[#1A2E4A] rounded-xl px-4 py-3 flex items-center justify-between"
                      >
                        <span className="text-[#F5F9FF] text-sm">{label}</span>
                        <div className="w-10 h-6 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF]/40 relative">
                          <div className="absolute right-1 top-0.5 w-5 h-5 rounded-full bg-[#00E5FF]" />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Advisor tab ──────────────────────────────────────────────── */}
            {activeTab === "advisor" && (
              <motion.div
                key="advisor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-4 pt-4 flex flex-col gap-4"
              >
                <h2 className="text-[#F5F9FF] text-lg font-bold">
                  {locale === "ta" ? "AI மீன் ஆலோசகர்" : locale === "ml" ? "AI മത്സ്യ ഉപദേഷ്ടാവ്" : "AI Fish Advisor"}
                </h2>

                {canAccess("advisor_query", tier) ? (
                  <div className="flex flex-col gap-4">
                    {/* Voice input button */}
                    <div className="bg-[#0F1E33] border border-[#00E5FF]/20 rounded-2xl p-6 flex flex-col items-center gap-4">
                      <button className="w-20 h-20 rounded-full bg-[#00E5FF]/10 border-2 border-[#00E5FF]/40 flex items-center justify-center active:bg-[#00E5FF]/20 transition-colors">
                        <Search className="w-8 h-8 text-[#00E5FF]" />
                      </button>
                      <p className="text-[#8FA3BF] text-sm text-center">
                        {locale === "ta"
                          ? '"வஞ்சிரம் எங்கே?" என்று கேளுங்கள்'
                          : locale === "ml"
                          ? '"ഇന്ന് നെയ്‌മീൻ എവിടെ?" ചോദിക്കൂ'
                          : 'Tap and ask "Where is seer fish today?"'}
                      </p>
                    </div>

                    {/* Demo result card */}
                    <div className="bg-[#0F2A45] border border-[#00E5FF]/20 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00D97E]" />
                        <span className="text-[#00D97E] text-xs font-semibold">High confidence</span>
                      </div>
                      <p className="text-[#F5F9FF] font-semibold">12 nm west of Kochi</p>
                      <p className="font-mono text-[#8FA3BF] text-xs">9.95° N, 76.05° E</p>
                      <p className="text-[#8FA3BF] text-sm">
                        {locale === "ta"
                          ? "வெப்ப நீர் (28°C) + ஏறும் அலை. 45 நிமிட பயணம்."
                          : locale === "ml"
                          ? "ചൂടുള്ള വെള്ളം (28°C) + ഉയരുന്ന തിര. 45 മിനിറ്റ് യാത്ര."
                          : "Warm water (28°C) + rising tide. 45 min from harbor."}
                      </p>
                      <button className="min-h-[48px] w-full rounded-xl bg-[#00E5FF] text-[#0A1628] font-semibold text-sm">
                        {locale === "ta" ? "வரைபடத்தில் காட்டு" : locale === "ml" ? "മാപ്പിൽ കാണിക്കുക" : "Plot on map"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <LockedFeatureCard
                      featureId="advisor_query"
                      locale={locale}
                      description={
                        locale === "ta"
                          ? "AI மூலம் இன்றைய மீன் இடங்களை கண்டறியுங்கள்"
                          : locale === "ml"
                          ? "AI ഉപയോഗിച്ച് ഇന്നത്തെ മത്സ്യ സ്ഥലങ്ങൾ കണ്ടെത്തുക"
                          : "Find today's best fishing spots using AI"
                      }
                      onCta={() => handleLockedTap("advisor_query")}
                    />
                    <LockedFeatureCard
                      featureId="species_id"
                      locale={locale}
                      description={
                        locale === "ta"
                          ? "படத்திலிருந்து மீன் பெயர் + விலை"
                          : locale === "ml"
                          ? "ഫോട്ടോയിൽ നിന്ന് മത്സ്യ നാമം + വില"
                          : "Photo → fish name + market price"
                      }
                      onCta={() => handleLockedTap("species_id")}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Trip tab ────────────────────────────────────────────────── */}
            {activeTab === "trip" && (
              <motion.div
                key="trip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-4 pt-4 flex flex-col gap-4"
              >
                <h2 className="text-[#F5F9FF] text-lg font-bold">
                  {locale === "ta" ? "பயண திட்டம்" : locale === "ml" ? "യാത്രാ പദ്ധതി" : "Trip plan"}
                </h2>
                <p className="text-[#8FA3BF] text-sm">
                  {locale === "ta"
                    ? "உங்கள் குடும்பத்திற்கு நீங்கள் எங்கே போகிறீர்கள் என்று சொல்லுங்கள்."
                    : locale === "ml"
                    ? "നിങ്ങൾ എവിടെ പോകുന്നെന്ന് കുടുംബത്തോട് പറയൂ."
                    : "Tell your family where you're going."}
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: locale === "ta" ? "திரும்பும் நேரம்" : locale === "ml" ? "മടക്ക സമയം" : "Return time", val: "6:30 PM today" },
                    { label: locale === "ta" ? "எவ்வளவு தொலைவு?" : locale === "ml" ? "എത്ര ദൂരം?" : "How far out?", val: "12 nm" },
                    { label: locale === "ta" ? "படகில் எத்தனை பேர்?" : locale === "ml" ? "ബോട്ടിൽ എത്ര പേർ?" : "Crew count", val: "4 people" },
                    { label: locale === "ta" ? "அவசர தொடர்பு" : locale === "ml" ? "അടിയന്തര ബന്ധം" : "Emergency contact", val: "+91 9876 543 210" },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-[#0F1E33] border border-[#1A2E4A] rounded-xl px-4 py-3">
                      <p className="text-[#8FA3BF] text-xs mb-1">{label}</p>
                      <p className="text-[#F5F9FF] font-semibold text-base">{val}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleStartTrip}
                  className={`w-full min-h-[56px] rounded-xl font-semibold text-base transition-all active:scale-98 ${
                    seaLevel === "nogo" || seaLevel === "red"
                      ? "bg-[#B00020]/20 text-[#FF3B30] border border-[#B00020]/40"
                      : "bg-[#00E5FF] text-[#0A1628]"
                  }`}
                >
                  {seaLevel === "nogo" || seaLevel === "red"
                    ? (locale === "ta" ? "பாதுகாப்பற்ற நிலை" : locale === "ml" ? "അസുരക്ഷിത സ്ഥിതി" : "Unsafe — cannot start")
                    : (locale === "ta" ? "பயணம் தொடங்கு" : locale === "ml" ? "യാത്ര ആരംഭിക്കുക" : "Start trip")}
                </button>

                {/* SOS button — always visible in trip context */}
                <div className="bg-[#B00020]/10 border border-[#B00020]/30 rounded-2xl p-4 flex items-center gap-4">
                  <button className="w-14 h-14 rounded-xl bg-[#B00020] flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-7 h-7 text-white" />
                  </button>
                  <div>
                    <p className="text-[#FF3B30] font-semibold text-sm">SOS</p>
                    <p className="text-[#8FA3BF] text-xs mt-0.5">
                      {locale === "ta"
                        ? "3 வினாடி அழுத்திப் பிடி"
                        : locale === "ml"
                        ? "3 സെക്കൻഡ് അമർത്തിപ്പിടിക്കുക"
                        : "Hold 3 seconds to activate"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom Navigation ──────────────────────────────────────────────── */}
        <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[430px] bg-[#0A1628]/95 backdrop-blur-md border-t border-[#1A2E4A] flex items-center justify-around px-2 pb-safe pt-2 z-30">
          {[
            { id: "home",    icon: Home,       label: locale === "ta" ? "முகப்பு" : locale === "ml" ? "ഹോം" : "Home" },
            { id: "map",     icon: Map,        label: locale === "ta" ? "வரைபடம்" : locale === "ml" ? "മാപ്പ്" : "Map" },
            { id: "advisor", icon: Fish,       label: locale === "ta" ? "தேடு" : locale === "ml" ? "കണ്ടെത്തുക" : "Find fish" },
            { id: "trip",    icon: Navigation, label: locale === "ta" ? "பயணம்" : locale === "ml" ? "യാത്ര" : "Trip" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex flex-col items-center gap-1 py-1 px-3 min-w-[56px] min-h-[56px] justify-center rounded-xl transition-all ${
                activeTab === id
                  ? "text-[#00E5FF]"
                  : "text-[#8FA3BF] hover:text-[#F5F9FF]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
