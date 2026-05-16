"use client";

// usePaywall — central hook that ties subscription state + trigger logic + modal together
//
// Usage:
//   const { check, modal } = usePaywall();
//   const result = await check("pfz_layer");
//   if (!result.allowed) { modal.open(result.trigger); return; }
//   // proceed with feature

import { useState, useCallback, useEffect } from "react";
import { Feature, Subscription, SubStatus, PlanTier } from "@/lib/payments/types";
import { ModalTrigger } from "@/components/paywall/SubscriptionModal";

// ── Subscription store (replace with Zustand when wired) ─────────────────────

interface SubscriptionState {
  isLoaded: boolean;
  tier: PlanTier;
  status: SubStatus;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

const DEFAULT_STATE: SubscriptionState = {
  isLoaded: false,
  tier: "free",
  status: "free",
  isTrialing: false,
  trialDaysLeft: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
};

// ── Paywall trigger suppression ───────────────────────────────────────────────

interface AppContext {
  seaStatus?: "green" | "amber" | "red" | "nogo";
  sosActive?: boolean;
  tripActive?: boolean;
  distanceFromHarborNm?: number;
  isOffline?: boolean;
}

function shouldSuppressPaywall(ctx: AppContext): boolean {
  if (ctx.seaStatus === "red" || ctx.seaStatus === "nogo") return true;
  if (ctx.sosActive) return true;
  if (ctx.tripActive && (ctx.distanceFromHarborNm ?? 0) > 1) return true;
  return false;
}

// ── Feature → tier gating (client-side optimistic check, server always confirms) ─

const FEATURE_REQUIRES_PRO = new Set<Feature>([
  "pfz_layer",
  "bathymetry_layer",
  "advisor_query",
  "species_id",
  "bitetime_today_full",
  "bitetime_forecast",
  "route_planner",
  "waypoint_create",
  "catch_analytics",
  "pdf_export",
  "price_ticker_full",
  "fleet_dashboard",
  "api_access",
]);

// ── Main hook ─────────────────────────────────────────────────────────────────

export function usePaywall(ctx: AppContext = {}) {
  const [sub, setSub] = useState<SubscriptionState>(DEFAULT_STATE);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    trigger: ModalTrigger;
  }>({
    isOpen: false,
    trigger: { kind: "deliberate" },
  });

  // Load subscription state from server on mount
  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (data?.subscription) {
          setSub({
            isLoaded: true,
            tier: data.subscription.tier,
            status: data.subscription.status,
            isTrialing: data.subscription.isTrialing,
            trialDaysLeft: data.subscription.trialDaysLeft,
            trialEndsAt: data.subscription.trialEndsAt,
            currentPeriodEnd: data.subscription.currentPeriodEnd,
          });
        }
      })
      .catch(() => {
        // Offline or error — assume free, don't block anything
        setSub({ ...DEFAULT_STATE, isLoaded: true });
      });
  }, []);

  // Check whether a feature is accessible
  const check = useCallback(
    (featureId: Feature): { allowed: boolean; trigger?: ModalTrigger } => {
      if (!sub.isLoaded) return { allowed: false }; // loading state — block optimistically

      // Pro or fleet tier active → allowed
      if (
        sub.tier === "pro" ||
        sub.tier === "fleet" ||
        sub.tier === "fleet_plus"
      ) {
        return { allowed: true };
      }

      // Trialing → allowed (trial is pro-equivalent)
      if (sub.isTrialing && sub.trialDaysLeft !== null && sub.trialDaysLeft >= 0) {
        return { allowed: true };
      }

      // Trial expired (had trial, now on free)
      if (sub.status === "trialing") {
        return {
          allowed: false,
          trigger: { kind: "trial_expired" },
        };
      }

      // Free tier → check if feature needs pro
      if (FEATURE_REQUIRES_PRO.has(featureId)) {
        return {
          allowed: false,
          trigger: { kind: "locked_feature", featureId },
        };
      }

      return { allowed: true };
    },
    [sub]
  );

  // Open modal (respects suppression rules)
  const openModal = useCallback(
    (trigger: ModalTrigger) => {
      if (shouldSuppressPaywall(ctx)) return; // safety suppressor
      setModal({ isOpen: true, trigger });
    },
    [ctx]
  );

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Gate a feature: check → auto-open modal if blocked
  const gate = useCallback(
    (featureId: Feature): boolean => {
      const result = check(featureId);
      if (!result.allowed && result.trigger) {
        openModal(result.trigger);
      }
      return result.allowed;
    },
    [check, openModal]
  );

  // Start trial — call API, update local state
  const startTrial = useCallback(async () => {
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start_trial" }),
    });
    if (!res.ok) throw new Error("Failed to start trial");
    const data = await res.json();
    setSub((prev) => ({
      ...prev,
      tier: "pro",
      status: "trialing",
      isTrialing: true,
      trialDaysLeft: data.trialDaysLeft ?? 7,
      trialEndsAt: data.trialEndsAt ?? null,
    }));
    closeModal();
  }, [closeModal]);

  // Open Razorpay checkout
  const subscribe = useCallback(
    async (tier: "pro" | "fleet", interval: "monthly" | "yearly") => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "dev-user", // TODO(auth): replace with real user ID
          tier,
          interval,
          locale: "ta", // TODO: pass from app locale store
        }),
      });

      if (!res.ok) throw new Error("Checkout failed");
      const { subscriptionId, keyId, amount, currency, prefill } = await res.json();

      // Load Razorpay checkout SDK dynamically (not bundled — saves ~30KB initial JS)
      if (!(window as unknown as Record<string, unknown>).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.head.appendChild(script);
        });
      }

      // Open Razorpay checkout
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        amount,
        currency,
        name: "MeenTrack",
        description: `${tier.toUpperCase()} · ${interval}`,
        prefill,
        theme: { color: "#00E5FF" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          // Verify payment server-side
          await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          // Optimistic update — server webhook will confirm
          setSub((prev) => ({
            ...prev,
            tier,
            status: "active",
            isTrialing: false,
          }));
          closeModal();
        },
      });
      rzp.open();
    },
    [closeModal]
  );

  return {
    sub,
    modal: {
      isOpen: modal.isOpen,
      trigger: modal.trigger,
      open: openModal,
      close: closeModal,
    },
    check,
    gate,
    startTrial,
    subscribe,
  };
}

export type UsePaywallReturn = ReturnType<typeof usePaywall>;
