// Feature: Subscription & Monetization System
// Outcome: #4 Earn more — sustainable revenue to keep the product alive
// Success metric: 8% trial-to-paid conversion within 30 days of launch
//
// Safety invariant: NO safety feature (SOS, Sea Status, geofence, trip plan, offline cache)
// is ever gated by subscription tier. If you add a feature here, check SAFETY_FREE_FEATURES
// below before adding it to any paid tier.

import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const PLAN_TIERS = ["free", "pro", "fleet", "fleet_plus"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PLAN_INTERVALS = ["monthly", "yearly"] as const;
export type PlanInterval = (typeof PLAN_INTERVALS)[number];

export const SUB_STATUSES = [
  "free",        // no trial, no sub — default
  "trialing",    // 7-day free trial active
  "active",      // paid and current
  "past_due",    // payment failed, in 72h grace period
  "cancelled",   // user cancelled; access until period end
  "expired",     // period ended, no payment
] as const;
export type SubStatus = (typeof SUB_STATUSES)[number];

// ── Features ──────────────────────────────────────────────────────────────────

export const ALL_FEATURES = [
  // Map layers
  "pfz_layer",
  "bathymetry_layer",
  // AI Advisor
  "advisor_query",
  "species_id",
  // BiteTime
  "bitetime_today_full",   // 0-100 score + explanation (simplified 3-band is free)
  "bitetime_forecast",     // +12/24/48h forecast
  // Navigation
  "route_planner",
  // Waypoints
  "waypoint_create",
  // Insights (V1.1)
  "catch_analytics",
  "pdf_export",
  "price_ticker_full",
  // Fleet
  "fleet_dashboard",
  // API (V2)
  "api_access",
] as const;
export type Feature = (typeof ALL_FEATURES)[number];

/**
 * These features are FREE FOREVER. This function is the safety belt.
 * Any call to resolve() for these returns { allowed: true } without checking tier.
 */
export const SAFETY_FREE_FEATURES = new Set([
  "sos",
  "sea_status_banner",
  "nogo_modal",
  "predeparture_checklist",
  "trip_plan_broadcast",
  "geofence_alert",
  "offline_safety_cache",
  "take_me_home_nav",
  "audio_safety_alerts",
  "basic_map",
  "harbor_pins",
  "imbl_line",
  "current_position",
  "distance_ruler",
  "own_catch_history_map",
]);

// ── Pricing ───────────────────────────────────────────────────────────────────

export const PRICES_INR = {
  pro: { monthly: 49, yearly: 499 },     // intro cohort; bump to 99/899 post-validation
  fleet: { monthly: 499, yearly: 4799 },
  fleet_plus: { monthly: 1499, yearly: 14399 },
} as const;

export const YEARLY_SAVINGS_PERCENT = {
  pro: Math.round((1 - PRICES_INR.pro.yearly / (PRICES_INR.pro.monthly * 12)) * 100),
  fleet: Math.round((1 - PRICES_INR.fleet.yearly / (PRICES_INR.fleet.monthly * 12)) * 100),
  fleet_plus: Math.round(
    (1 - PRICES_INR.fleet_plus.yearly / (PRICES_INR.fleet_plus.monthly * 12)) * 100
  ),
} as const;

// ── Quota config ──────────────────────────────────────────────────────────────

export interface QuotaConfig {
  daily?: number;
  monthly?: number;
  lifetime?: number;
}

export const FREE_QUOTAS: Partial<Record<Feature, QuotaConfig>> = {
  advisor_query: { daily: 3 },
  species_id: { monthly: 5 },
  waypoint_create: { lifetime: 5 },
};

export const PRO_QUOTAS: Partial<Record<Feature, QuotaConfig>> = {
  advisor_query: { daily: 20 },
  species_id: { daily: 20 },
};

// ── Subscription record ───────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  tier: PlanTier;
  interval?: PlanInterval;
  status: SubStatus;
  provider?: "razorpay" | "stripe";
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  trialStartedAt?: Date;
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelledAt?: Date;
  graceEndsAt?: Date; // 72h after period_end for offline grace
  amountInr?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Entitlement result ────────────────────────────────────────────────────────

export type EntitlementResult =
  | { allowed: true; usage?: { used: number; limit: number } }
  | { allowed: false; reason: "tier"; requiredTier: PlanTier }
  | { allowed: false; reason: "quota"; resetAt: string; used: number; limit: number }
  | { allowed: false; reason: "trial_expired" };

// ── Webhook events ────────────────────────────────────────────────────────────

export const WebhookEventSchema = z.object({
  event: z.string(),
  payload: z.object({
    subscription: z
      .object({
        entity: z.record(z.string(), z.unknown()),
      })
      .optional(),
    payment: z
      .object({
        entity: z.record(z.string(), z.unknown()),
      })
      .optional(),
  }),
});
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// ── Checkout ──────────────────────────────────────────────────────────────────

export const CheckoutArgsSchema = z.object({
  userId: z.string().uuid(),
  tier: z.enum(["pro", "fleet", "fleet_plus"]),
  interval: z.enum(["monthly", "yearly"]),
  locale: z.enum(["en", "ta", "ml"]).default("ta"),
});
export type CheckoutArgs = z.infer<typeof CheckoutArgsSchema>;

// ── Provider interface ────────────────────────────────────────────────────────

export interface PaymentProvider {
  createSubscription(args: CheckoutArgs): Promise<{
    subscriptionId: string;
    orderId?: string;
    keyId: string;
    amount: number;
    currency: string;
  }>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
  verifyWebhookSignature(body: string, signature: string): boolean;
  parseWebhookEvent(body: string): WebhookEvent;
}
