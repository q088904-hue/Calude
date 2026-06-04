-- Migration: 007_stagecraft_sync
-- Description: Initiative 3.3 — cross-device sync foundations.
--   • stagecraft_activity  : server-authoritative streak + today's counts (was localStorage-only)
--   • stagecraft_sessions  : + updated_at / version for optimistic-concurrency writes
--   • stagecraft_events    : first-party, owner-scoped analytics events
--
-- Single-user model; owner-only RLS keyed on auth.uid() (matches 006). Additive:
-- the file store remains default and nothing here changes 3.1/3.2 contracts.
-- Depends on 002 (update_updated_at()), 005, 006.

-- ── stagecraft_activity (D2) ─────────────────────────────────────────────────
-- data: { streakDates: string[], todayDate: string, todaySessions: int, todayQuickfires: int }
create table stagecraft_activity (
  user_id    uuid primary key default '00000000-0000-0000-0000-000000000000',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── stagecraft_sessions: optimistic concurrency (D3) ─────────────────────────
alter table stagecraft_sessions add column updated_at timestamptz not null default now();
alter table stagecraft_sessions add column version    integer     not null default 0;

-- ── stagecraft_events (D5) ───────────────────────────────────────────────────
create table stagecraft_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default '00000000-0000-0000-0000-000000000000',
  created_at timestamptz not null default now(),
  event      text not null,
  props      jsonb not null default '{}'::jsonb
);
create index stagecraft_events_user_created_idx
  on stagecraft_events (user_id, created_at desc);

-- ── updated_at triggers (reuse 002 update_updated_at()) ──────────────────────
create trigger stagecraft_activity_updated_at before update on stagecraft_activity
  for each row execute function update_updated_at();
create trigger stagecraft_sessions_updated_at before update on stagecraft_sessions
  for each row execute function update_updated_at();

-- ── RLS owner-only (matches 006) ─────────────────────────────────────────────
alter table stagecraft_activity enable row level security;
alter table stagecraft_events   enable row level security;
create policy sc_activity_rw on stagecraft_activity
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_events_rw on stagecraft_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Down (rollback) ──────────────────────────────────────────────────────────
-- drop policy sc_activity_rw on stagecraft_activity;
-- drop policy sc_events_rw   on stagecraft_events;
-- drop trigger stagecraft_activity_updated_at on stagecraft_activity;
-- drop trigger stagecraft_sessions_updated_at on stagecraft_sessions;
-- alter table stagecraft_sessions drop column updated_at, drop column version;
-- drop table stagecraft_events;
-- drop table stagecraft_activity;
