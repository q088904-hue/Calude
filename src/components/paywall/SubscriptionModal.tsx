"use client";

// Feature: Subscription Modal
// Outcome: #4 Earn more — primary conversion surface
// Success metric: ≥8% trial-start rate among users who see the modal
//
// Design rules:
//   - MeenTrack marine instrument palette (#0A1628 background, #00E5FF accent)
//   - Min 22px primary action, 18px body
//   - Min 56×56px touch targets
//   - One primary CTA per screen (Start trial)
//   - Never shown when sea status is Red/No-Go or SOS is active

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Star, Users, Zap, Fish, Map, Navigation } from "lucide-react";
import {
  getPaywallCopy,
  Locale,
  FEATURE_DISPLAY_NAMES,
} from "@/lib/i18n/paywall";
import { Feature } from "@/lib/payments/types";
import { PRICES_INR, YEARLY_SAVINGS_PERCENT } from "@/lib/payments/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModalTrigger =
  | { kind: "locked_feature"; featureId: Feature }
  | { kind: "trial_expired" }
  | { kind: "deliberate" }
  | { kind: "opportunistic" };

interface Props {
  isOpen: boolean;
  trigger: ModalTrigger;
  locale?: Locale;
  onClose: () => void;
  onTrialStart: () => Promise<void>;
  onSubscribe: (tier: "pro" | "fleet", interval: "monthly" | "yearly") => Promise<void>;
}

// ── Icon map for feature bullets ──────────────────────────────────────────────

const FEATURE_ICONS = [Fish, Zap, Map, Navigation, Star, Users];

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  name,
  price,
  features,
  badge,
  cta,
  ctaVariant,
  isHighlighted,
  isDisabled,
  onCta,
}: {
  name: string;
  price: string;
  features: string[];
  badge?: string;
  cta: string;
  ctaVariant: "primary" | "secondary" | "disabled";
  isHighlighted: boolean;
  isDisabled?: boolean;
  onCta: () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl p-5 flex flex-col gap-4 transition-all ${
        isHighlighted
          ? "bg-[#0F2A45] border-2 border-[#00E5FF] shadow-[0_0_24px_rgba(0,229,255,0.12)]"
          : "bg-[#0F1E33] border border-[#1A2E4A]"
      }`}
    >
      {/* Most popular badge */}
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-[#00E5FF] text-[#0A1628] text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
            {badge}
          </span>
        </div>
      )}

      {/* Plan name + price */}
      <div>
        <p className="text-[#8FA3BF] text-sm font-medium uppercase tracking-wider mb-1">
          {name}
        </p>
        <p className="text-[#F5F9FF] text-xl font-semibold leading-snug">{price}</p>
      </div>

      {/* Feature bullets */}
      <ul className="flex flex-col gap-2.5 flex-1">
        {features.map((feat, i) => {
          const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
          return (
            <li key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#00D97E]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3 h-3 text-[#00D97E]" />
              </div>
              <span className="text-[#F5F9FF] text-sm leading-snug">{feat}</span>
            </li>
          );
        })}
      </ul>

      {/* CTA button — min 56px touch target */}
      <button
        onClick={onCta}
        disabled={isDisabled}
        className={`w-full min-h-[56px] rounded-xl text-base font-semibold transition-all active:scale-95 ${
          ctaVariant === "primary"
            ? "bg-[#00E5FF] text-[#0A1628] hover:bg-[#00CCEE]"
            : ctaVariant === "secondary"
            ? "border border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/10"
            : "border border-[#1A2E4A] text-[#8FA3BF] cursor-default"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function SubscriptionModal({
  isOpen,
  trigger,
  locale = "en",
  onClose,
  onTrialStart,
  onSubscribe,
}: Props) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(false);

  const c = getPaywallCopy(locale);

  // Auto-scroll Pro card into view when modal opens
  useEffect(() => {
    if (isOpen && trigger.kind === "locked_feature") {
      const el = document.getElementById("meentrack-pro-card");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isOpen, trigger]);

  const handleTrialStart = useCallback(async () => {
    setIsLoading(true);
    try {
      await onTrialStart();
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [onTrialStart, onClose]);

  const handleSubscribe = useCallback(
    async (tier: "pro" | "fleet") => {
      setIsLoading(true);
      try {
        await onSubscribe(tier, interval);
      } finally {
        setIsLoading(false);
      }
    },
    [onSubscribe, interval]
  );

  const isDismissible = trigger.kind !== "trial_expired";

  // Price display
  const proMonthly = PRICES_INR.pro.monthly;
  const proYearly = PRICES_INR.pro.yearly;
  const fleetMonthly = PRICES_INR.fleet.monthly;
  const fleetYearly = PRICES_INR.fleet.yearly;
  const proPerMonth = Math.round(proYearly / 12);

  const proPrice =
    interval === "monthly"
      ? c.proPriceMonthly(proMonthly)
      : c.proPriceYearly(proYearly, proPerMonth);

  const fleetPrice =
    interval === "monthly"
      ? c.fleetPriceMonthly(fleetMonthly)
      : c.fleetPriceYearly(fleetYearly);

  const contextFeatureName =
    trigger.kind === "locked_feature"
      ? (FEATURE_DISPLAY_NAMES[trigger.featureId]?.[locale] ?? "this feature")
      : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={isDismissible ? onClose : undefined}
          />

          {/* Sheet — slides up from bottom (thumb-zone friendly) */}
          <motion.div
            key="sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300, duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-[#0A1628] safe-area-pb"
            style={{ maxWidth: "100vw" }}
          >
            {/* Handle + close */}
            <div className="sticky top-0 bg-[#0A1628] pt-3 pb-2 px-5 flex items-center justify-between z-10">
              <div className="w-10 h-1 rounded-full bg-[#1A2E4A] mx-auto" />
              {isDismissible && (
                <button
                  onClick={onClose}
                  className="absolute right-4 top-3 w-9 h-9 rounded-full bg-[#0F1E33] flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-[#8FA3BF]" />
                </button>
              )}
            </div>

            <div className="px-5 pb-8 flex flex-col gap-6">
              {/* Context hook — "You're trying to open PFZ Heatmap" */}
              {contextFeatureName && (
                <div className="bg-[#00E5FF]/8 border border-[#00E5FF]/20 rounded-xl px-4 py-3">
                  <p className="text-[#00E5FF] text-sm">
                    🔒 {c.lockedSubhead(contextFeatureName)}
                  </p>
                </div>
              )}

              {/* Headline */}
              <div>
                <h2 className="text-[#F5F9FF] text-2xl font-bold leading-tight">
                  {c.headline}
                </h2>
                <p className="text-[#8FA3BF] text-base mt-1">{c.subhead}</p>
              </div>

              {/* Billing toggle */}
              <div className="flex bg-[#0F1E33] rounded-xl p-1 gap-1">
                {(["monthly", "yearly"] as const).map((iv) => (
                  <button
                    key={iv}
                    onClick={() => setInterval(iv)}
                    className={`flex-1 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      interval === iv
                        ? "bg-[#0F2A45] text-[#F5F9FF]"
                        : "text-[#8FA3BF]"
                    }`}
                  >
                    {iv === "monthly" ? c.monthly : c.yearly}
                    {iv === "yearly" && (
                      <span className="bg-[#00D97E] text-[#0A1628] text-xs font-bold px-1.5 py-0.5 rounded-md">
                        {c.yearlySavingsBadge(YEARLY_SAVINGS_PERCENT.pro)}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Plan cards */}
              <div className="flex flex-col gap-4">
                {/* Free */}
                <PlanCard
                  name={c.freePlanName}
                  price={c.freePrice}
                  features={c.freeFeatures}
                  cta={c.currentPlan}
                  ctaVariant="disabled"
                  isHighlighted={false}
                  isDisabled
                  onCta={() => {}}
                />

                {/* Pro — highlighted */}
                <div id="meentrack-pro-card">
                  <PlanCard
                    name={c.proPlanName}
                    price={proPrice}
                    features={c.proFeatures}
                    badge={c.mostPopular}
                    cta={isLoading ? "..." : c.startTrialCta}
                    ctaVariant="primary"
                    isHighlighted
                    isDisabled={isLoading}
                    onCta={handleTrialStart}
                  />
                  <p className="text-center text-[#8FA3BF] text-xs mt-2">
                    {c.noCardNeeded}
                  </p>
                </div>

                {/* Fleet */}
                <PlanCard
                  name={`${c.fleetPlanName} · ${c.upToNBoats(5)}`}
                  price={fleetPrice}
                  features={c.fleetFeatures}
                  cta={c.choosePlanCta("Fleet")}
                  ctaVariant="secondary"
                  isHighlighted={false}
                  isDisabled={isLoading}
                  onCta={() => handleSubscribe("fleet")}
                />
              </div>

              {/* Trust signals */}
              <div className="border-t border-[#1A2E4A] pt-5 flex flex-col gap-2">
                <p className="text-[#8FA3BF] text-xs text-center">{c.trustedBy}</p>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  {c.trustedSources.split(" · ").map((src) => (
                    <span
                      key={src}
                      className="flex items-center gap-1 text-[#F5F9FF] text-xs"
                    >
                      <Check className="w-3 h-3 text-[#00D97E]" />
                      {src}
                    </span>
                  ))}
                </div>
                <p className="text-[#8FA3BF] text-xs text-center mt-1">
                  {c.cancelAnytime} · {c.upiSupported}
                </p>
              </div>

              {/* Share-pay affordance */}
              <button
                onClick={() => {
                  // TODO: Open share-payment flow (generate 6-digit code)
                  alert("Share payment link — TODO: implement code generation");
                }}
                className="w-full min-h-[48px] text-[#00E5FF] text-sm underline underline-offset-2 text-center"
              >
                {c.sharePayment}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SubscriptionModal;
