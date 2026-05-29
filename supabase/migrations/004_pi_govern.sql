-- Migration: 004_pi_govern
-- Description: Presentation Intelligence (Govern + Fix) persistence + governance
--              audit trail. Pairs with src/lib/pi/metrics.ts (supabaseStore).
--
-- Security model: these tables are written ONLY server-side via the service-role
-- admin client (src/lib/supabase/admin.ts) from authenticated PI route handlers.
-- The PI access gate (signed Datamatics-only session, src/middleware.ts) is the
-- auth boundary; rows carry `user_email` for attribution + audit. No client-side
-- (anon) access — RLS denies all by default and we add no anon policies.
--
-- Depends on 002_subscriptions.sql for the shared update_updated_at() function.

-- ── pi_runs ───────────────────────────────────────────────────────────────────
-- One row per Auto-Fix run. Doubles as the governance audit trail:
-- who · when · which deck · score before/after · fixes · editability.
create table pi_runs (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  user_email          text not null,
  filename            text not null,
  mode                text not null check (mode in ('snap', 'enforce')),
  slide_count         int  not null default 0,
  before_score        int  not null,
  after_score         int  not null,
  violations_detected int  not null default 0,
  violations_fixed    int  not null default 0,
  editability_passed  boolean not null default true
);

create index pi_runs_created_at_idx on pi_runs (created_at desc);
create index pi_runs_user_email_idx on pi_runs (user_email);

-- ── pi_feedback ───────────────────────────────────────────────────────────────
-- Optional one-line user feedback per governed deck (KPI inputs).
create table pi_feedback (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  user_email              text not null,
  filename                text not null,
  satisfaction            int  not null check (satisfaction between 1 and 5),
  estimated_minutes_saved int  not null default 0,
  manual_still_needed     boolean not null default false,
  notes                   text
);

create index pi_feedback_created_at_idx on pi_feedback (created_at desc);

-- ── RLS: deny-all to anon/authenticated; service role bypasses RLS ─────────────
alter table pi_runs     enable row level security;
alter table pi_feedback enable row level security;
-- (No policies added on purpose — only the service-role admin client writes/reads.)
