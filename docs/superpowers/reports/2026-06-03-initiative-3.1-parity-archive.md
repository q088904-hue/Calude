# Initiative 3.1 — Persistence Migration & Parity Archive

**Status:** Merged to main (`d4169b4`, 2026-06-03). fileStore remains the default backend; `STAGECRAFT_STORE=supabase` is **not** enabled in production. Cutover is an explicit deployment-time env flip.

This document archives the migration and parity verification that gated the merge.

## Schema applied
`supabase/migrations/005_stagecraft_core.sql` applied to the existing Supabase project: `stagecraft_profiles`, `stagecraft_sessions` (data jsonb + denormalized `summary`/`composite`/`started_at`/`ended_at`/`archived_at`, partial index `(user_id, started_at desc) where archived_at is null`), `stagecraft_config`. RLS enabled deny-by-default; sentinel user `00000000-0000-0000-0000-000000000000`; no anon policies (service-role only in v0).

## Migration
- `npm run stagecraft:migrate:dry` → 10 records → 10 upserts (3 with items → summaries computed, 7 empty shells), config `{}`, no saved profile.
- `npm run stagecraft:migrate` → idempotent upsert; local `.stagecraft/*.json` retained.

## Live parity verification (`npm run stagecraft:verify`)
Run by the operator against the live Supabase project — all PASS:

| Report | Result |
|---|---|
| Profile parity | ✅ PASS |
| Config parity | ✅ PASS |
| Session parity | ✅ PASS |
| Export parity | ✅ PASS |

Confirmed: row counts match · session counts match · composite scores match · summary records match · export output matches source.

## Side-by-side validation (`STAGECRAFT_STORE=file` vs `=supabase`)
API surfaces diffed; all identical (export differs only in the `exportedAt` timestamp, stripped before diff):

| Surface | Result |
|---|---|
| History page | ✅ identical |
| Profile page | ✅ identical |
| Countdown (config) | ✅ identical |
| Export endpoint | ✅ identical |

No functional differences between backends.

## Pre-merge offline validation (this environment, no DB)
Transform simulation + live-app cross-check on the file backend, performed before credentials were available:
- Full record round-trips byte-identically in `data` jsonb.
- Migration-stored composite === live-app-displayed composite for all 3 summarized sessions (`7.9 / 2.7 / 4.9`).
- `summarise()` output === stored `summary` record.
- A transient composite "mismatch" was traced to an IEEE-754 rounding-mode artifact in a throwaway 4th-implementation check (`Math.round(79.5)`=8 vs canonical `(7.95).toFixed(1)`=7.9); the system uses one `summarise()` everywhere and is internally consistent.

## Verification gates
`npx tsc --noEmit` clean · `npm run build` (prebuild `check-answers` ✅ 61/61) · ESLint clean on all touched paths · dev-mock safe (supabase store, no creds → HTTP 200, empty/defaults) · rollback validated (unset env → file backend resumes original data).

## Rollback
- Runtime: unset/flip `STAGECRAFT_STORE` → file backend resumes from retained JSON (instant, no redeploy).
- Schema: `drop table stagecraft_profiles, stagecraft_sessions, stagecraft_config cascade;`
- Data: JSON retained + idempotent migration + export snapshot → no loss either direction.

## Deferred (not started)
Initiative 3.2 authentication, 3.3 cross-device sync, 3.4 reminders, multi-user, monetization.
