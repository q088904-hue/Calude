-- Migration: 005_stagecraft_core
-- Description: Stagecraft interview-practice persistence (profile, sessions,
--              config). Pairs with src/lib/stagecraft/supabaseStore.ts, which is
--              selected at runtime via STAGECRAFT_STORE=supabase (file store
--              remains the default backend).
--
-- Security model: these tables are written ONLY server-side via the service-role
-- admin client (src/lib/supabase/admin.ts) from Stagecraft route handlers.
-- Single-tenant v0: rows carry a fixed sentinel user_id until Initiative 3.2
-- introduces Magic Link auth (which will swap the sentinel for auth.uid() and
-- add anon RLS policies). RLS is enabled deny-by-default; no anon policies yet.
--
-- Storage shape: every table keeps the exact application object in `data` jsonb
-- for byte-perfect round-trip parity with the file store. Sessions additionally
-- denormalize a precomputed `summary` (the SessionSummary object) + `composite`
-- + `started_at` so the history list reads NEVER deserialize full item arrays
-- (read-amplification mitigation). `data` is read only for detail + export.
--
-- Depends on 002_subscriptions.sql for the shared update_updated_at() trigger fn.

-- Sentinel user for the pre-auth single-tenant phase. 3.2 migrates these rows.
-- '00000000-0000-0000-0000-000000000000'

-- ── stagecraft_profiles ─────────────────────────────────────────────────────
-- One row (sentinel) holding the full Profile object.
create table stagecraft_profiles (
  user_id    uuid primary key default '00000000-0000-0000-0000-000000000000',
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── stagecraft_sessions ─────────────────────────────────────────────────────
-- One row per practice session. `data` = full SessionRecord (config, warmUp,
-- items, report, startedAt, endedAt). The denormalized columns are recomputed on
-- every write so list/history reads can ignore `data` entirely.
create table stagecraft_sessions (
  id          text primary key,
  user_id     uuid not null default '00000000-0000-0000-0000-000000000000',
  started_at  timestamptz,
  ended_at    timestamptz,
  composite   numeric,           -- 0.4*content + 0.3*english + 0.3*delivery (null if 0 items)
  summary     jsonb,             -- precomputed SessionSummary (null if 0 items)
  data        jsonb not null,    -- full SessionRecord; read only on detail/export
  archived_at timestamptz,       -- soft-delete / retention (no UI yet)
  created_at  timestamptz not null default now()
);

-- Cheap, newest-first list scan that skips archived rows and never touches `data`.
create index stagecraft_sessions_user_started_idx
  on stagecraft_sessions (user_id, started_at desc)
  where archived_at is null;

-- ── stagecraft_config ───────────────────────────────────────────────────────
-- One row (sentinel) holding the StagecraftConfig object (interviewDate +
-- interviewCompany). Stored as jsonb to guarantee the countdown's exact
-- 'YYYY-MM-DD' string survives the round-trip with zero coercion.
create table stagecraft_config (
  user_id    uuid primary key default '00000000-0000-0000-0000-000000000000',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── updated_at triggers (reuse 002's update_updated_at()) ────────────────────
create trigger stagecraft_profiles_updated_at
  before update on stagecraft_profiles
  for each row execute function update_updated_at();

create trigger stagecraft_config_updated_at
  before update on stagecraft_config
  for each row execute function update_updated_at();

-- ── RLS: deny-by-default, server-only (service role bypasses RLS) ────────────
-- No anon policies in v0. Initiative 3.2 adds:
--   create policy <t>_sel on <t> for select using (user_id = auth.uid());
--   (+ insert/update/delete) once the sentinel rows are migrated to real users.
alter table stagecraft_profiles enable row level security;
alter table stagecraft_sessions enable row level security;
alter table stagecraft_config   enable row level security;
