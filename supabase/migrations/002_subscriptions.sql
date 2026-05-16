-- Migration: 002_subscriptions
-- Description: Subscription & monetization tables for MeenTrack
-- Safety invariant: No safety feature access is gated by subscription tier.
--   See src/lib/payments/types.ts → SAFETY_FREE_FEATURES for the permanent free list.

-- ── Enums ──────────────────────────────────────────────────────────────────────

create type plan_tier as enum ('free', 'pro', 'fleet', 'fleet_plus');
create type plan_interval as enum ('monthly', 'yearly');
create type sub_status as enum (
  'free',        -- default — no trial, no sub
  'trialing',    -- 7-day free trial active
  'active',      -- paid and current
  'past_due',    -- payment failed, in 72h grace period
  'cancelled',   -- user cancelled; access until period end
  'expired'      -- period ended, no payment
);

-- ── subscriptions ─────────────────────────────────────────────────────────────

create table subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  tier                      plan_tier not null default 'free',
  interval                  plan_interval,
  status                    sub_status not null default 'free',
  provider                  text check (provider in ('razorpay', 'stripe')),
  provider_subscription_id  text,
  provider_customer_id      text,
  trial_started_at          timestamptz,
  trial_ends_at             timestamptz,
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancelled_at              timestamptz,
  grace_ends_at             timestamptz,    -- 72h after period_end
  amount_inr                numeric,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- One active row per user (enforced by partial unique index)
create unique index subscriptions_one_per_user
  on subscriptions (user_id)
  where status in ('trialing', 'active', 'past_due', 'cancelled');

-- One trial per phone number ever (trial_started_at IS NOT NULL = has used trial)
create unique index subscriptions_one_trial_per_user
  on subscriptions (user_id)
  where trial_started_at is not null;

-- Fast lookups
create index subscriptions_user_status on subscriptions (user_id, status);
create index subscriptions_provider_id on subscriptions (provider_subscription_id)
  where provider_subscription_id is not null;

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

-- ── fleet_memberships ─────────────────────────────────────────────────────────

create table fleet_memberships (
  id                    uuid primary key default gen_random_uuid(),
  fleet_owner_user_id   uuid not null references auth.users(id) on delete cascade,
  member_user_id        uuid not null references auth.users(id) on delete cascade,
  boat_registration     text,
  role                  text not null check (role in ('owner', 'deckhand')) default 'deckhand',
  added_at              timestamptz not null default now(),
  removed_at            timestamptz,
  unique (fleet_owner_user_id, member_user_id)
);

create index fleet_memberships_member on fleet_memberships (member_user_id)
  where removed_at is null;

-- ── payment_events ────────────────────────────────────────────────────────────
-- Audit log of every incoming webhook event. Never delete from this table.

create table payment_events (
  id                    uuid primary key default gen_random_uuid(),
  subscription_id       uuid references subscriptions(id) on delete set null,
  provider              text not null,
  event_type            text not null,
  provider_event_id     text unique,       -- idempotency key
  raw_payload           jsonb,
  processed_at          timestamptz not null default now()
);

create index payment_events_sub on payment_events (subscription_id);
create index payment_events_type on payment_events (event_type);

-- ── entitlement_usage ─────────────────────────────────────────────────────────
-- Per-user per-feature usage tracking for quota enforcement and AI cost reconciliation.

create table entitlement_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  feature     text not null,         -- matches Feature type in types.ts
  used_at     timestamptz not null default now(),
  cost_inr    numeric default 0      -- for AI calls: token cost in INR
);

create index entitlement_usage_user_feature_time
  on entitlement_usage (user_id, feature, used_at desc);

-- Partial index for fast daily quota checks
create index entitlement_usage_today
  on entitlement_usage (user_id, feature)
  where used_at > now() - interval '1 day';

-- ── RLS policies ──────────────────────────────────────────────────────────────

alter table subscriptions enable row level security;

-- Users read their own subscription
create policy "own subscription read"
  on subscriptions for select
  using (auth.uid() = user_id);

-- No direct client writes — all mutations via server (service role)
-- Admin / server bypass RLS with service role key

alter table fleet_memberships enable row level security;

-- Fleet owner sees all their members
create policy "fleet owner read"
  on fleet_memberships for select
  using (auth.uid() = fleet_owner_user_id);

-- Member sees their own membership
create policy "fleet member read"
  on fleet_memberships for select
  using (auth.uid() = member_user_id);

alter table payment_events enable row level security;
-- payment_events: no client access (server role only)

alter table entitlement_usage enable row level security;

create policy "own usage read"
  on entitlement_usage for select
  using (auth.uid() = user_id);

-- ── Utility view — effective tier ─────────────────────────────────────────────
-- Convenience view for the "what tier is this user effectively on right now?"
-- question. Used in server-side checks.

create or replace view user_effective_tiers as
select
  user_id,
  case
    when status = 'trialing'
      and trial_ends_at > now()               then 'pro'
    when status = 'active'                     then tier::text
    when status = 'cancelled'
      and current_period_end > now()           then tier::text
    when status = 'past_due'
      and grace_ends_at > now()               then tier::text
    else 'free'
  end as effective_tier,
  status,
  trial_ends_at,
  current_period_end,
  grace_ends_at
from subscriptions;

-- ── Seed: intro pricing config (read by API if not using env vars) ─────────────
-- Actual Razorpay plan IDs must be created in the Razorpay dashboard first.
-- This table is a lookup so the API can validate plan IDs without hardcoding.

create table razorpay_plans (
  id          serial primary key,
  tier        plan_tier not null,
  interval    plan_interval not null,
  plan_id     text not null,            -- e.g. plan_xxxxxxxxxxxxxxxx
  amount_inr  integer not null,
  active      boolean not null default true,
  created_at  timestamptz default now(),
  unique (tier, interval)
);

-- Insert placeholder plan IDs — replace with real Razorpay plan IDs after creation
insert into razorpay_plans (tier, interval, plan_id, amount_inr) values
  ('pro',        'monthly', 'plan_REPLACE_PRO_MONTHLY',         49),
  ('pro',        'yearly',  'plan_REPLACE_PRO_YEARLY',         499),
  ('fleet',      'monthly', 'plan_REPLACE_FLEET_MONTHLY',      499),
  ('fleet',      'yearly',  'plan_REPLACE_FLEET_YEARLY',      4799),
  ('fleet_plus', 'monthly', 'plan_REPLACE_FLEET_PLUS_MONTHLY', 1499),
  ('fleet_plus', 'yearly',  'plan_REPLACE_FLEET_PLUS_YEARLY', 14399);
