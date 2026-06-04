-- Migration: 006_stagecraft_auth
-- Description: Initiative 3.2 — activate per-user ownership for Stagecraft.
--              Adds owner-only RLS keyed on auth.uid() and drops the sentinel
--              user_id default so authenticated inserts must carry a real owner.
--
-- Order: apply AFTER the 005 data exists in Supabase. The one-time sentinel
-- "claim" (src/lib/stagecraft/claimSentinel.ts, run from the auth callback)
-- reassigns the existing sentinel rows to the authenticated user's id. The claim
-- uses the service-role admin client, which bypasses RLS, so it can still see and
-- move the sentinel rows after these policies are in force.
--
-- Security model: authenticated access goes through the SSR anon client; RLS
-- below makes the DATABASE enforce ownership (auth.uid()). The service-role admin
-- client (claim only) bypasses RLS by design. Single-user allowlist is enforced
-- in app code (src/lib/stagecraft/auth.ts) at the callback + proxy.
--
-- Depends on 005_stagecraft_core.sql.

-- Drop the sentinel default: with the with-check policies below, an insert that
-- relied on the '0000…' default would FAIL (sentinel <> auth.uid()). Authed
-- inserts now set user_id = auth.uid() explicitly (supabaseStore).
alter table stagecraft_profiles alter column user_id drop default;
alter table stagecraft_sessions alter column user_id drop default;
alter table stagecraft_config   alter column user_id drop default;

-- Owner-only access for the authenticated user (read + write).
create policy sc_profiles_rw on stagecraft_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_sessions_rw on stagecraft_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_config_rw on stagecraft_config
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Down (rollback) ──────────────────────────────────────────────────────────
-- drop policy sc_profiles_rw on stagecraft_profiles;
-- drop policy sc_sessions_rw on stagecraft_sessions;
-- drop policy sc_config_rw   on stagecraft_config;
-- alter table stagecraft_profiles alter column user_id set default '00000000-0000-0000-0000-000000000000';
-- alter table stagecraft_sessions alter column user_id set default '00000000-0000-0000-0000-000000000000';
-- alter table stagecraft_config   alter column user_id set default '00000000-0000-0000-0000-000000000000';
