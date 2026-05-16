// Feature: Entitlements Resolver — single source of truth for feature access
// Outcome: #4 Earn more (revenue correctness) + #1 Safety first (never block safety)
// Success metric: 0 safety-feature gatings in prod logs; <50ms p99 resolve latency
//
// INVARIANT: Safety features are ALWAYS allowed, regardless of tier or quota.
// Any other resolve path is secondary to this rule.

import {
  Feature,
  EntitlementResult,
  PlanTier,
  SubStatus,
  FREE_QUOTAS,
  PRO_QUOTAS,
  QuotaConfig,
  SAFETY_FREE_FEATURES,
} from "@/lib/payments/types";
import {
  countFeatureUsage,
  recordFeatureUsage,
} from "@/lib/supabase/subscriptions";

// ── Tier → feature access map ─────────────────────────────────────────────────

const TIER_FEATURES: Record<PlanTier, Set<Feature>> = {
  free: new Set<Feature>([]),
  pro: new Set<Feature>([
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
  ]),
  fleet: new Set<Feature>([
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
  ]),
  fleet_plus: new Set<Feature>([
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
  ]),
};

const REQUIRED_TIER: Partial<Record<Feature, PlanTier>> = {
  pfz_layer: "pro",
  bathymetry_layer: "pro",
  advisor_query: "pro",
  species_id: "pro",
  bitetime_today_full: "pro",
  bitetime_forecast: "pro",
  route_planner: "pro",
  waypoint_create: "pro",
  catch_analytics: "pro",
  pdf_export: "pro",
  price_ticker_full: "pro",
  fleet_dashboard: "fleet",
  api_access: "fleet_plus",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function effectiveTier(
  sub: {
    tier: PlanTier;
    status: SubStatus;
    trial_ends_at?: string | null;
    current_period_end?: string | null;
    grace_ends_at?: string | null;
  } | null,
  isOffline = false
): PlanTier {
  if (!sub) return "free";

  const now = new Date();

  if (sub.status === "trialing") {
    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
    if (trialEnd && trialEnd > now) return "pro";
    return "free"; // trial expired
  }

  if (sub.status === "active") return sub.tier;

  if (sub.status === "cancelled") {
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
    if (periodEnd && periodEnd > now) return sub.tier;
    return "free";
  }

  if (sub.status === "past_due") {
    const graceEnd = sub.grace_ends_at ? new Date(sub.grace_ends_at) : null;
    if (graceEnd && graceEnd > now) return sub.tier;
    // Extra offline grace: 48h beyond server grace for users at sea
    if (isOffline && sub.current_period_end) {
      const offlineGrace = new Date(
        new Date(sub.current_period_end).getTime() + 72 * 60 * 60 * 1000
      );
      if (offlineGrace > now) return sub.tier;
    }
  }

  return "free";
}

function featureInTier(feature: Feature, tier: PlanTier): boolean {
  return TIER_FEATURES[tier].has(feature);
}

function requiredTierFor(feature: Feature): PlanTier {
  return REQUIRED_TIER[feature] ?? "pro";
}

function quotaWindowStart(quota: QuotaConfig): Date {
  const now = new Date();
  if (quota.daily) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (quota.monthly) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(0); // lifetime — epoch
}

function nextResetIso(quota: QuotaConfig): string {
  const now = new Date();
  if (quota.daily) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
  if (quota.monthly) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  }
  return new Date(8640000000000000).toISOString(); // lifetime → far future
}

// ── Main resolver ──────────────────────────────────────────────────────────────

export async function resolve(
  userId: string,
  feature: Feature,
  sub: Parameters<typeof effectiveTier>[0],
  options: { isOffline?: boolean } = {}
): Promise<EntitlementResult> {
  // ── SAFETY INVARIANT ────────────────────────────────────────────────────────
  if (SAFETY_FREE_FEATURES.has(feature as string)) return { allowed: true };

  const tier = effectiveTier(sub, options.isOffline);

  // Trial expired
  if (
    sub?.status === "trialing" &&
    sub.trial_ends_at &&
    new Date(sub.trial_ends_at) < new Date()
  ) {
    return { allowed: false, reason: "trial_expired" };
  }

  // Tier check
  if (!featureInTier(feature, tier)) {
    return { allowed: false, reason: "tier", requiredTier: requiredTierFor(feature) };
  }

  // Quota check
  const quota = tier === "free" ? FREE_QUOTAS[feature] : PRO_QUOTAS[feature];
  if (quota) {
    const windowStart = quotaWindowStart(quota);
    const used = await countFeatureUsage(userId, feature, windowStart);
    const limit = quota.daily ?? quota.monthly ?? quota.lifetime ?? Infinity;

    if (used >= limit) {
      return {
        allowed: false,
        reason: "quota",
        resetAt: nextResetIso(quota),
        used,
        limit,
      };
    }
    return { allowed: true, usage: { used, limit } };
  }

  return { allowed: true };
}

// Re-export for convenience — callers import from one place
export { recordFeatureUsage };
