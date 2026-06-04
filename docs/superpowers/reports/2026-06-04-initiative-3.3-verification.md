# Initiative 3.3 — Cross-Device Sync: Verification Report (at merge gate)

**Branch:** `stagecraft-sync` (6 commits, not merged, additive over `main`). fileStore stays default; activity/events/sync only engage on the supabase backend.

## Phase status
| Phase | What | Status |
|---|---|---|
| 3.3-1 | `007` schema (activity, events, sessions `updated_at`/`version`, RLS) | ✅ written (apply = operator) |
| 3.3-A | Server activity store + client sync (streak/counts cross-device; localStorage cache; mount/focus reconcile; idempotent merge) | ✅ static-verified |
| 3.3-B | Optimistic-concurrency session writes (version-guarded, idempotent append-by-index, LWW fallback) | ✅ static-verified |
| 3.3-C | Convergence UX | ✅ via 3.3-A activity focus-sync; broader per-page refetch **deferred** (sessions converge on navigation) |
| 3.3-D | First-party `stagecraft_events` (login/session_start/session_complete/export) | ✅ static-verified |
| 3.3-E | Offline posture | ✅ online-graceful: activity sync is best-effort (degrades silently); grade/transcribe use `LoopErrorState`. No write-queue/PWA (deferred per plan) |

## Files changed (12 files, +397/−13)
`007_stagecraft_sync.sql` · `activityStore.ts` · `activitySync.ts` · `events.ts` · `supabaseStore.ts` (activity methods + optimistic session writes) · `api/stagecraft/activity/route.ts` · `page.tsx` + `quickfire/page.tsx` (sync wiring) · `export`/`session`/`report`/`auth/callback` routes (events).

## Static verification (this environment)
- tsc clean · ESLint clean on all touched files (the 2 pre-existing setState-in-effect errors are unrelated components) · `npm run build` compiled · check-answers **61/61** · `/api/stagecraft/activity` route built.
- **Design safety:** all changes additive + behind the store abstraction; **file store path untouched** (single-host, no concurrency); activity/events/optimistic-writes engage only on `STAGECRAFT_STORE=supabase`. Dev-mock safe (no creds → ctx null → no-ops).

## ⚠️ Live-only verification — requires Supabase creds + one human magic-link (same as 3.2)
Cannot run here (no credentials). Operator runbook:
```bash
# 1. Apply schema
psql "$SUPABASE_DB_URL" -f supabase/migrations/007_stagecraft_sync.sql   # or SQL editor
# 2. Run the Supabase-backed build, log in (magic link), then:
```
**A. Activity cross-device:** on device A do a quickfire → streak/today increments; on device B reload/focus `/stagecraft` → same streak/counts appear. SQL: `select data from stagecraft_activity;` reflects union.
**A-idempotent:** trigger sync twice → no duplicate streak dates; counts = max for the day.
**B. Conflict (sessions):** seed two stale appends at the same `version` → second retries, no lost items, `version` increments, no duplicate item `index`. `select id, version, jsonb_array_length(data->'items') from stagecraft_sessions;`
**D. Events:** after login + a session + an export → `select event, count(*) from stagecraft_events group by event;` shows `login`, `session_start`, `session_complete`, `export`.
**Retention queries (read-only, ready to run):**
```sql
-- active days (last 30)
select count(distinct date(created_at)) from stagecraft_events where event in ('session_complete','grade') and created_at > now() - interval '30 days';
-- sessions per ISO week
select date_trunc('week', created_at) wk, count(*) from stagecraft_events where event='session_complete' group by wk order by wk;
-- streak (server-authoritative)
select data->'streakDates' from stagecraft_activity;
-- readiness trend (from sessions summaries)
select started_at::date d, composite from stagecraft_sessions where summary is not null order by d desc limit 20;
```
**Export fidelity carry-over:** export contract unchanged (activity/events NOT added to export) → before/after diff clean. *(Note: adding activity to the export is a deliberate future option, not done here.)*

### Live checklist (operator to confirm)
- [ ] 007 applied: `stagecraft_activity` + `stagecraft_events` + sessions `updated_at`/`version` + 2 policies
- [ ] Activity converges cross-device (A) + idempotent
- [ ] Session conflict: no lost items, version increments (B)
- [ ] Events land for login/session_start/session_complete/export (D)
- [ ] Retention queries return sane shapes
- [ ] computeStreak correct from server source (OBS-10 invariants hold)
- [ ] Rollback rehearsal: 007 down + `STAGECRAFT_STORE=file` → prior behavior

## Rollback
Additive; `007` has a full down section; revert the 6 commits restores 3.2. Activity keeps localStorage fallback; events/optimistic-writes are supabase-only. Full rollback = redeploy pre-3.3 + `STAGECRAFT_STORE=file`.

## Deferred (per plan / scope)
Supabase Realtime push, offline write-queue/PWA, third-party analytics, profile field-level merge (single-user low-concurrency — sessions got the real conflict treatment), broader per-page focus-refetch, multi-user.

## Status
Stopped at merge gate. **Not merged.** Code phases A/B/C/D/E complete + static-verified; live verification (A/B/D + 007 apply) pending operator creds + magic-link. Awaiting your decision: run the live runbook before merge (recommended, matches 3.1/3.2 discipline), or merge code-now with live verification at deploy.
