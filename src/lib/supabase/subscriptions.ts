// Subscription DB layer — all reads and writes for the monetization system.
//
// NOTE on `table()` helper below:
// supabase-js v2.104+ resolves .insert()/.update() to `never` on an un-generified
// client because it can't infer column shapes without a Database generic.
// The Database generic requires a Relationships field that can only be produced by
// `supabase gen types typescript --local` against a live project.
//
// The `table()` helper casts `.from(name)` to `any` once per call — all downstream
// .insert/.update/.select chains work normally. Type safety is enforced by the
// explicit return types on every exported function (the API boundary the app uses).
//
// Once you have a live Supabase project:
//   npx supabase gen types typescript --local > src/lib/supabase/generated.ts
// Replace `createClient()` → `createClient<GeneratedDatabase>()` and delete table().

import { getSupabaseAdmin } from "./admin";
import type {
  SubscriptionRow,
  PaymentEventInsert,
  SubStatus,
  PlanTier,
  PlanInterval,
  SubscriptionUpdate,
} from "./types";

function db() { return getSupabaseAdmin(); }

// One cast to escape the type impasse; everything else stays strictly typed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: string): any { return db().from(name); }

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getActiveSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await table("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["trialing", "active", "past_due", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { console.error("[db] getActiveSubscription:", error.message); return null; }
  return data as SubscriptionRow | null;
}

export async function hasUsedTrial(userId: string): Promise<boolean> {
  const { count, error } = await table("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("trial_started_at", "is", null);

  if (error) { console.error("[db] hasUsedTrial:", error.message); return false; }
  return (count ?? 0) > 0;
}

export async function getSubscriptionByProviderId(
  providerSubId: string
): Promise<SubscriptionRow | null> {
  const { data, error } = await table("subscriptions")
    .select("*")
    .eq("provider_subscription_id", providerSubId)
    .maybeSingle();

  if (error) { console.error("[db] getByProviderId:", error.message); return null; }
  return data as SubscriptionRow | null;
}

export async function isEventProcessed(providerEventId: string): Promise<boolean> {
  const { count, error } = await table("payment_events")
    .select("id", { count: "exact", head: true })
    .eq("provider_event_id", providerEventId);

  if (error) return false;
  return (count ?? 0) > 0;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createTrialSubscription(userId: string): Promise<SubscriptionRow | null> {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await table("subscriptions")
    .insert({
      user_id: userId,
      tier: "pro" as PlanTier,
      status: "trialing" as SubStatus,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      console.warn("[db] createTrialSubscription: already used for", userId);
      return null;
    }
    console.error("[db] createTrialSubscription:", error.message);
    return null;
  }
  return data as SubscriptionRow;
}

export async function activateSubscription(params: {
  userId: string;
  tier: PlanTier;
  interval: PlanInterval;
  providerSubscriptionId: string;
  providerCustomerId?: string;
  amountInr: number;
  periodStart: Date;
  periodEnd: Date;
}): Promise<SubscriptionRow | null> {
  const { data: existing } = await table("subscriptions")
    .select("id")
    .eq("user_id", params.userId)
    .maybeSingle();

  const payload: SubscriptionUpdate = {
    tier: params.tier,
    interval: params.interval,
    status: "active" as SubStatus,
    provider: "razorpay",
    provider_subscription_id: params.providerSubscriptionId,
    provider_customer_id: params.providerCustomerId ?? null,
    amount_inr: params.amountInr,
    current_period_start: params.periodStart.toISOString(),
    current_period_end: params.periodEnd.toISOString(),
  };

  if (existing) {
    const { data, error } = await table("subscriptions")
      .update(payload)
      .eq("id", (existing as { id: string }).id)
      .select()
      .single();

    if (error) { console.error("[db] activateSubscription update:", error.message); return null; }
    return data as SubscriptionRow;
  }

  const { data, error } = await table("subscriptions")
    .insert({ user_id: params.userId, ...payload })
    .select()
    .single();

  if (error) { console.error("[db] activateSubscription insert:", error.message); return null; }
  return data as SubscriptionRow;
}

export async function applyStateTransition(params: {
  providerSubscriptionId: string;
  newStatus: SubStatus;
  extendPeriod: boolean;
  gracePeriodHours?: number;
  periodStart?: Date;
  periodEnd?: Date;
}): Promise<void> {
  const payload: SubscriptionUpdate = { status: params.newStatus };

  if (params.extendPeriod && params.periodStart && params.periodEnd) {
    payload.current_period_start = params.periodStart.toISOString();
    payload.current_period_end = params.periodEnd.toISOString();
  }
  if (params.gracePeriodHours) {
    payload.grace_ends_at = new Date(
      Date.now() + params.gracePeriodHours * 3_600_000
    ).toISOString();
  }
  if (params.newStatus === "cancelled") {
    payload.cancelled_at = new Date().toISOString();
  }

  const { error } = await table("subscriptions")
    .update(payload)
    .eq("provider_subscription_id", params.providerSubscriptionId);

  if (error) { console.error("[db] applyStateTransition:", error.message); }
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function storePaymentEvent(params: {
  subscriptionId?: string;
  provider: string;
  eventType: string;
  providerEventId?: string;
  rawPayload: Record<string, unknown>;
}): Promise<void> {
  const insert: PaymentEventInsert = {
    subscription_id: params.subscriptionId ?? null,
    provider: params.provider,
    event_type: params.eventType,
    provider_event_id: params.providerEventId ?? null,
    raw_payload: params.rawPayload,
  };

  const { error } = await table("payment_events").insert(insert);

  if (error && error.code !== "23505") {
    console.error("[db] storePaymentEvent:", error.message);
  }
}

// ── Entitlement usage ─────────────────────────────────────────────────────────

export async function countFeatureUsage(
  userId: string,
  feature: string,
  windowStart: Date
): Promise<number> {
  const { count, error } = await table("entitlement_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("used_at", windowStart.toISOString());

  if (error) { console.error("[db] countFeatureUsage:", error.message); return 0; }
  return count ?? 0;
}

export async function recordFeatureUsage(
  userId: string,
  feature: string,
  costInr = 0
): Promise<void> {
  const { error } = await table("entitlement_usage")
    .insert({ user_id: userId, feature, cost_inr: costInr });

  if (error) { console.error("[db] recordFeatureUsage:", error.message); }
}

// ── Auth helper ───────────────────────────────────────────────────────────────

export async function getAuthUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return (user as { id: string } | null)?.id ?? null;
}
