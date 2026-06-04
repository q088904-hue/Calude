# Initiative 3.3 — Cross-Device Sync (Executable Plan)

> **Planning only — no implementation until this plan is approved.** REQUIRED SUB-SKILL on execution: superpowers:executing-plans. Commit per phase; verification gate after each; explicit merge gate at the end. Mirrors the 3.1/3.2 discipline.

**Approved decisions (from the 3.3 Architecture Review):** D1 **defer Supabase Realtime** · D2 **dedicated `stagecraft_activity`** table · D3 **append-item + optimistic-version** for sessions, **LWW-timestamp** for profile/config · D4 **online-graceful** (no write-queue/PWA yet) · D5 **first-party `stagecraft_events`**.

**Model:** single allowlisted user across their own devices. **Constraints held:** file store stays default; Supabase cutover stays an explicit deploy decision; additive only; store abstraction (`storeBackend.ts`) is the seam.

## Grounding facts (verified, don't re-derive)
- supabase store: SSR-anon client + `auth.uid()` RLS; reads per-request; writes `upsert` full `data` jsonb. No realtime.
- `stagecraft_sessions` has `data/summary/composite/started_at/ended_at/archived_at/created_at` — **no `updated_at`/version**. `profiles`/`config` have `updated_at` (002 trigger).
- Activity (streak dates, today's session/quickfire counts) lives ONLY in `localStorage` (`sc_streak_dates`, `sc_session_last_date`, `sc_session_today_count`, `sc_qf_date`, `sc_qf_count`). `computeStreak` (fixed in OBS-10) reads it.
- PI metrics pattern (`src/lib/pi/metrics.ts`) is the template for first-party events.

---

## 1. Schema — `supabase/migrations/007_stagecraft_sync.sql`
```sql
-- (D2) Per-user activity (streak + today's counts), server-authoritative.
create table stagecraft_activity (
  user_id    uuid primary key default '00000000-0000-0000-0000-000000000000',
  data       jsonb not null default '{}'::jsonb,  -- {streakDates:[], todayDate, todaySessions, todayQuickfires}
  updated_at timestamptz not null default now()
);

-- (D3) Optimistic concurrency for sessions.
alter table stagecraft_sessions add column updated_at timestamptz not null default now();
alter table stagecraft_sessions add column version    integer     not null default 0;

-- (D5) First-party analytics events (owner-scoped).
create table stagecraft_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default '00000000-0000-0000-0000-000000000000',
  created_at timestamptz not null default now(),
  event      text not null,
  props      jsonb not null default '{}'::jsonb
);
create index stagecraft_events_user_created_idx on stagecraft_events (user_id, created_at desc);

-- updated_at triggers (reuse 002 update_updated_at())
create trigger stagecraft_activity_updated_at before update on stagecraft_activity
  for each row execute function update_updated_at();
create trigger stagecraft_sessions_updated_at before update on stagecraft_sessions
  for each row execute function update_updated_at();

-- RLS owner-only (matches 006). No sentinel default drop needed — 006 already dropped
-- session defaults; new tables default to sentinel for the pre-3.2-style claim path,
-- but in practice rows are written under auth.uid().
alter table stagecraft_activity enable row level security;
alter table stagecraft_events   enable row level security;
create policy sc_activity_rw on stagecraft_activity for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_events_rw   on stagecraft_events   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```
**Down:** drop the two policies + two triggers + `stagecraft_activity` + `stagecraft_events`; `alter table stagecraft_sessions drop column updated_at, drop column version`.

## 2. Phases (commit per phase, gate after each)

### 3.3-A — Activity → server (closes G1)
- `src/lib/stagecraft/activityStore.ts` (provider-agnostic, behind `storeBackend`): `getActivity()` / `recordSession()` / `recordQuickfire()` reading/writing `stagecraft_activity` (supabase) or localStorage (file/dev).
- `computeStreak` sources from the activity store; **localStorage retained as offline cache** (read-through).
- One-time **activity claim/migration**: on first authenticated load, POST existing localStorage activity → `/api/stagecraft/activity` which merges (union of streak dates, max of today counts) into the server row. Idempotent.
- Wire the hub's `DailyPracticeTracker` + the session/quickfire increment sites (`page.tsx` ~641/655, quickfire) to the activity store.

### 3.3-B — Conflict-safe writes (closes G2)
- Sessions: `appendItem`/`setReport` become **optimistic-concurrency** writes — read `version`, write with `update … where id=? and version=?` (increment version); on conflict (0 rows), re-read and re-apply the append (idempotent by item `index`). Append dedupes an item whose `index` already exists.
- `profiles`/`config`: **LWW with `updated_at`** — include `updated_at` check; last writer wins but never clobbers unrelated fields (shallow-merge `data` instead of whole-doc replace where safe).
- File store keeps current behavior (single-host, no concurrency).

### 3.3-C — Convergence UX (mitigates G3, Realtime deferred)
- Client SPA: re-fetch session/profile/activity on `visibilitychange`→visible and window `focus` (debounced). No realtime client.

### 3.3-D — Analytics + retention (closes G5)
- `src/lib/stagecraft/events.ts` (mirrors `pi/metrics.ts`): `emit(event, props)` → `stagecraft_events` (supabase) / no-op or local log (file/dev). Server-side emit from route handlers: `login`, `session_start`, `session_complete`, `grade`, `export`, `error`.
- Retention queries/SQL views (read-only): active days, streak retention, sessions/week, readiness trend. Surfaced via a server route or the existing history aggregates — **no new UI required** in 3.3 (data first).

### 3.3-E — Offline posture (G4, minimal)
- Ensure all sync/store calls degrade to clear retry states (reuse Initiative 1 `LoopErrorState`); document online-graceful behavior. `file` stays default for local. **No write-queue/PWA** (deferred).

### 3.3-V — Verification (matrix below).

## 3. Migration order
1. Apply **007** to Supabase (after 005/006).
2. Ship code behind **file default** (no behavior change until `STAGECRAFT_STORE=supabase`).
3. First authenticated load runs the **activity migration** (localStorage→server), idempotent.
4. Parity + cross-device verification.
5. No cutover change required beyond what 3.2 already gated.

## 4. Rollback strategy
- **Additive:** new tables/columns + new store modules; 3.1/3.2 contracts untouched.
- **Down migration** (007 down) + revert phase commits restores prior behavior.
- **Activity:** localStorage retained as fallback → reverting server-activity falls back to local read; no data loss.
- **Flag-gated** reads (server-activity, poll-on-focus, events emit) so runtime disable is possible.
- Full rollback = redeploy pre-3.3 + `STAGECRAFT_STORE=file`.

## 5. Verification matrix
| Check | Method |
|---|---|
| tsc / eslint (touched) / build / check-answers 61/61 | CLI |
| 007 applied: `stagecraft_activity` + `stagecraft_events` + sessions `updated_at`/`version` + 2 policies | SQL |
| Activity parity: localStorage vs server (streak/today counts equal after migration) | seed + curl/SQL |
| Activity migration idempotent (2nd run = no dup streak dates, counts = max) | run twice |
| Cross-device: device B reflects device A's session/activity on focus/reload | two sessions (or service-role-seeded) |
| Conflict — sessions: concurrent appends → no lost items, version increments, no dup index | simulate stale write |
| Conflict — profile/config: concurrent edits → no clobber of unrelated fields | simulate |
| Analytics: events emitted for login/session_start/session_complete/grade/export/error | SQL on `stagecraft_events` |
| Retention queries return expected shapes on seeded data | SQL |
| Offline-graceful: network failure → retry state; reconnect → state intact | simulate |
| Export fidelity carry-over: activity/events don't alter the export contract unexpectedly | before/after diff |
| Rollback: 007 down + `STAGECRAFT_STORE=file` → prior behavior | staging |
| `computeStreak` still correct from server source (OBS-10 invariants hold) | deterministic test |

## 6. Out of scope (held)
Supabase Realtime push (D1), offline write-queue/PWA (D4), third-party analytics (D5), multi-user/collaboration, monetization, reminders (3.4).

## 7. Status
Awaiting approval of this executable plan. On approval I execute 3.3-A…V with a gate after each phase and stop at the merge gate. **No implementation begins until approved.** Note: live phases (007 apply, cross-device, analytics SQL) will need Supabase credentials + the one human magic-link step, same as the 3.2 live-verification flow.
