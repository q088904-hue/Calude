-- Migration: 003_meentrack_v2
-- Description: MeenTrack V2 user state — onboarding profile + trip log.
-- Pairs with: src/lib/meentrack/store.ts (supabaseStore) and useMeenTrackSession().
--
-- Security note: unlike `subscriptions` (server-only, payment integrity),
-- profile and trip rows are user-owned, non-financial data. RLS lets an
-- authenticated user read/write ONLY their own rows directly from the client
-- (anon key) — this is exactly the shape src/lib/meentrack/store.ts expects,
-- so flipping getMeenTrackStore() to Supabase needs zero UI changes.
--
-- Depends on 002_subscriptions.sql for the shared update_updated_at() function.

-- ── meentrack_profiles ────────────────────────────────────────────────────────
-- One row per user. Mirrors MeenTrackProfile (src/lib/meentrack/types.ts).

create table meentrack_profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  harbor      text not null default '',
  boat_type   text not null default '',
  species     text[] not null default '{}',
  locale      text not null default 'en' check (locale in ('en', 'ta', 'ml')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Reuse the trigger fn defined in 002_subscriptions.sql.
create trigger meentrack_profiles_updated_at
  before update on meentrack_profiles
  for each row execute function update_updated_at();

-- ── meentrack_trips ───────────────────────────────────────────────────────────
-- Append-only trip log. Mirrors TripRecord (src/lib/meentrack/types.ts).
-- `catches` is jsonb: [{ "species": string, "count": number }, ...]

create table meentrack_trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  started_at    timestamptz not null,
  ended_at      timestamptz not null,
  duration_sec  integer not null default 0 check (duration_sec >= 0),
  zone_name     text not null default '',
  bite_score    integer not null default 0 check (bite_score between 0 and 100),
  catches       jsonb not null default '[]',
  harbor        text not null default '',
  created_at    timestamptz not null default now()
);

-- Newest-first listing per user (TripLog renders persisted trips on top).
create index meentrack_trips_user_recent
  on meentrack_trips (user_id, ended_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- User-owned data: the authenticated owner may read and write their own rows.

alter table meentrack_profiles enable row level security;

create policy "own profile read"
  on meentrack_profiles for select
  using (auth.uid() = user_id);

create policy "own profile upsert"
  on meentrack_profiles for insert
  with check (auth.uid() = user_id);

create policy "own profile update"
  on meentrack_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table meentrack_trips enable row level security;

create policy "own trips read"
  on meentrack_trips for select
  using (auth.uid() = user_id);

create policy "own trips insert"
  on meentrack_trips for insert
  with check (auth.uid() = user_id);

-- No update/delete policy: the trip log is append-only by design.
