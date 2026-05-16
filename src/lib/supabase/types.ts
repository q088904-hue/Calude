// Supabase database types — hand-written from 002_subscriptions.sql migration
// In production, generate with: npx supabase gen types typescript --local > src/lib/supabase/types.ts
// Re-run after any migration that adds/modifies columns.

export type PlanTier = "free" | "pro" | "fleet" | "fleet_plus";
export type PlanInterval = "monthly" | "yearly";
export type SubStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

// ── Row shapes (DB → TS) ──────────────────────────────────────────────────────

export interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: PlanTier;
  interval: PlanInterval | null;
  status: SubStatus;
  provider: "razorpay" | "stripe" | null;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  grace_ends_at: string | null;
  amount_inr: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInsert {
  user_id: string;
  tier?: PlanTier;
  interval?: PlanInterval | null;
  status?: SubStatus;
  provider?: "razorpay" | "stripe" | null;
  provider_subscription_id?: string | null;
  provider_customer_id?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancelled_at?: string | null;
  grace_ends_at?: string | null;
  amount_inr?: number | null;
  id?: string;
}

export interface SubscriptionUpdate {
  tier?: PlanTier;
  interval?: PlanInterval | null;
  status?: SubStatus;
  provider?: "razorpay" | "stripe" | null;
  provider_subscription_id?: string | null;
  provider_customer_id?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancelled_at?: string | null;
  grace_ends_at?: string | null;
  amount_inr?: number | null;
}

export interface FleetMembershipRow {
  id: string;
  fleet_owner_user_id: string;
  member_user_id: string;
  boat_registration: string | null;
  role: "owner" | "deckhand";
  added_at: string;
  removed_at: string | null;
}

export interface PaymentEventRow {
  id: string;
  subscription_id: string | null;
  provider: string;
  event_type: string;
  provider_event_id: string | null;
  raw_payload: Record<string, unknown> | null;
  processed_at: string;
}

export interface PaymentEventInsert {
  subscription_id?: string | null;
  provider: string;
  event_type: string;
  provider_event_id?: string | null;
  raw_payload?: Record<string, unknown> | null;
  id?: string;
}

export interface EntitlementUsageRow {
  id: string;
  user_id: string;
  feature: string;
  used_at: string;
  cost_inr: number;
}

export interface EntitlementUsageInsert {
  user_id: string;
  feature: string;
  cost_inr?: number;
  id?: string;
}

export interface RazorpayPlanRow {
  id: number;
  tier: PlanTier;
  interval: PlanInterval;
  plan_id: string;
  amount_inr: number;
  active: boolean;
  created_at: string;
}

// ── Database type (Supabase generic parameter) ────────────────────────────────

export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: SubscriptionRow;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
        Relationships: [];
      };
      fleet_memberships: {
        Row: FleetMembershipRow;
        Insert: {
          fleet_owner_user_id: string;
          member_user_id: string;
          boat_registration?: string | null;
          role?: "owner" | "deckhand";
          removed_at?: string | null;
          id?: string;
        };
        Update: {
          removed_at?: string | null;
          role?: "owner" | "deckhand";
        };
        Relationships: [];
      };
      payment_events: {
        Row: PaymentEventRow;
        Insert: PaymentEventInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      entitlement_usage: {
        Row: EntitlementUsageRow;
        Insert: EntitlementUsageInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      razorpay_plans: {
        Row: RazorpayPlanRow;
        Insert: {
          tier: PlanTier;
          interval: PlanInterval;
          plan_id: string;
          amount_inr: number;
          active?: boolean;
        };
        Update: {
          plan_id?: string;
          amount_inr?: number;
          active?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      user_effective_tiers: {
        Row: {
          user_id: string;
          effective_tier: PlanTier;
          status: SubStatus;
          trial_ends_at: string | null;
          current_period_end: string | null;
          grace_ends_at: string | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      plan_tier: PlanTier;
      plan_interval: PlanInterval;
      sub_status: SubStatus;
    };
  };
}
