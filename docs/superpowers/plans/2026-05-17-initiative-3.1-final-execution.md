# Initiative 3.1 — Final Execution Plan (Supabase Persistence)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. `- [ ]` steps. **Planning only — nothing implemented yet.** Wait for approval.

**Approved scope:** Supabase persistence layer · store-abstraction swap · migration tooling · env selector · verification · **+ export endpoint** · **+ secrets-UI serverless gating** · **+ read-amplification mitigation**. **Out of scope (do not start):** 3.2 auth, cross-device sync, reminders, multi-user, monetization.

**Anchors (audited):** migration convention `supabase/migrations/NNN_*.sql` (next = **005**). `getSupabaseAdmin()` = service-role, RLS-bypass, server-only, dev-mock when keys absent. History route already returns server-computed `SessionSummary` but calls `listSessions()` → loads **all full `items` jsonb** (the amplification). Stores expose stable function signatures (swap behind them). Types: `Profile`, `SessionRecord`, `QAItem`, `StagecraftConfig`.

**Bridge:** rows carry `user_id uuid` default sentinel `00000000-0000-0000-0000-000000000000`; server uses the admin client; RLS deny-by-default. 3.2 later swaps sentinel→`auth.uid()` + anon policies.

**Gates (no unit suite):** `tsc --noEmit`, `eslint <touched>`, `npm run build` (+ `check-answers` 61/61), preview behavioral checks, store parity (file vs supabase), perf checks.

---

## Schema (`supabase/migrations/005_stagecraft_core.sql`)

```sql
-- Stagecraft persistence. Sentinel user until Magic Link (3.2). Summary columns
-- denormalized at write-time so history list reads never load items jsonb.
create table if not exists stagecraft_profiles (
  user_id    uuid primary key default '00000000-0000-0000-0000-000000000000',
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists stagecraft_sessions (
  id            text primary key,
  user_id       uuid not null default '00000000-0000-0000-0000-000000000000',
  started_at    timestamptz,
  ended_at      timestamptz,
  report        text,
  items         jsonb not null default '[]'::jsonb,   -- full Q&A; read only on detail/export
  summary       jsonb,                                 -- {role,round,difficulty,questionCount,avgContent,avgEnglish,avgDelivery,patterns}
  composite     numeric,                               -- precomputed 0.4c+0.3e+0.3d
  archived_at   timestamptz,                           -- soft-delete / retention (no UI yet)
  created_at    timestamptz not null default now()
);
create index if not exists stagecraft_sessions_user_started_idx
  on stagecraft_sessions (user_id, started_at desc) where archived_at is null;

create table if not exists stagecraft_config (
  user_id           uuid primary key default '00000000-0000-0000-0000-000000000000',
  interview_date    date,
  interview_company text,
  updated_at        timestamptz not null default now()
);

alter table stagecraft_profiles enable row level security;
alter table stagecraft_sessions enable row level security;
alter table stagecraft_config   enable row level security;
-- No anon policies yet — only the service-role server client touches these in v0.
-- 3.2 adds: create policy p_sel on <t> for select using (user_id = auth.uid()); (+ ins/upd)
```

**Down migration (rollback):** `drop table if exists stagecraft_profiles, stagecraft_sessions, stagecraft_config cascade;` — isolated by prefix; touches nothing else.

---

## Tasks

### 3.1-1 Schema migration
- [ ] Create `supabase/migrations/005_stagecraft_core.sql` (above). Apply to the existing project (SQL editor / migration runner). Verify tables + RLS + index present. Commit `feat(stagecraft): 3.1-1 — stagecraft_* schema (summary cols, archived_at, RLS)`.

### 3.1-2 `supabaseStore` (signatures + summary denormalization)
**File:** `src/lib/stagecraft/supabaseStore.ts`
- [ ] Implement matching the existing signatures via `getSupabaseAdmin()` + `SENTINEL_USER_ID`:
  - `listSessions()` → full rows (incl. `items`) → `SessionRecord[]` (used by export only).
  - **`listSessionSummaries(opts?: { limit?: number; offset?: number })`** → selects `id, started_at, ended_at, report, summary, composite` (NO `items`) ordered `started_at desc`, `archived_at is null`. New efficient path.
  - `getSession(id)` → full row incl items.
  - `upsertSession(record)` / `appendItem(id,item)` / `setReport(id,report)` → write items AND recompute+write `summary` + `composite` in the same write (denormalize at write-time).
  - `getProfile()` (merge `{...defaultProfile, ...data}`; no row → default), `saveProfile`, `profileExists()`.
  - `getConfig()`, `saveConfig()`.
- [ ] Extract the summary computation (today inlined in `history/route.ts:summarise`) into a shared `lib/stagecraft/sessionSummary.ts` (`summarise(record): SessionSummary`) so both the write-path and the file store reuse it (DRY, single source).
- [ ] Dev-mock safety: null admin → empty arrays/defaults, never throw.
- [ ] tsc/eslint clean. Commit `feat(stagecraft): 3.1-2 — supabaseStore + write-time summary denormalization`.

### 3.1-3 File-store parity + history read path + pagination
**Files:** `sessionStore.ts`, `history/route.ts`
- [ ] Add `listSessionSummaries(opts?)` to the file store (maps existing in-memory `summarise`; supports limit/offset). Public `listSessions` unchanged.
- [ ] Switch `history/route.ts` to `listSessionSummaries()` (+ default limit, e.g. 50, newest first) instead of `listSessions()` + summarise. Keep `kohlerReadiness`/`totalQuestions` aggregates (compute from summaries — they carry composite + questionCount + patterns).
- [ ] tsc/eslint/build green; history page renders identically. Commit `feat(stagecraft): 3.1-3 — summary read path + history pagination (no items in list reads)`.

### 3.1-4 Backend selector (env, file default)
**Files:** new `storeBackend.ts`; `sessionStore.ts`, `profileStore.ts`, `configStore.ts`
- [ ] `export const useSupabaseStore = () => process.env.STAGECRAFT_STORE === "supabase";`
- [ ] Each public store function: `if (useSupabaseStore()) return supa.<fn>(...);` else existing file logic. `import * as supa from "./supabaseStore"`. Call-sites unchanged. Default (no env) = file.
- [ ] `profileFileExists()` → supabase backend returns `supa.profileExists()`.
- [ ] tsc/eslint/build + coverage 61/61. Commit `feat(stagecraft): 3.1-4 — STAGECRAFT_STORE selector (file default)`.

### 3.1-5 Migration tooling
**File:** `scripts/stagecraft-migrate-to-supabase.mjs`
- [ ] Idempotent: read `.stagecraft/{profile,sessions,config}.json` (skip absent) → upsert into tables under `SENTINEL_USER_ID` via admin client; compute `summary`+`composite` per session on insert. Refuse if `SUPABASE_SERVICE_ROLE_KEY` unset. Print per-table counts. **Does not delete the JSON** (fallback retained). Run from a dev machine/CI, NOT serverless. Commit `feat(stagecraft): 3.1-5 — idempotent .stagecraft → supabase migration`.

### 3.1-6 Export endpoint
**File:** `src/app/api/stagecraft/export/route.ts`
- [ ] `GET` → `{ exportedAt, version: 1, profile, config, sessions }` (full sessions incl items), `Content-Disposition: attachment; filename="stagecraft-export-<date>.json"`. Server-side via the active store. Commit `feat(stagecraft): 3.1-6 — GET /api/stagecraft/export (data portability + backup)`.

### 3.1-7 Secrets UI serverless gating
**Files:** `secrets.ts` (+ `isServerless` helper), `api/stagecraft/secrets/route.ts`, `profile/page.tsx`
- [ ] Add `isServerless()` (`process.env.STAGECRAFT_SERVERLESS === "1" || process.env.VERCEL === "1"`). Secrets `GET` returns `{ ANTHROPIC_API_KEY, OPENAI_API_KEY, writable: !isServerless() }`.
- [ ] AI-connection Settings: when `!writable`, hide the paste field + Save; show "Configured via server environment" + status. POST still guarded server-side (reject writes when `!isServerless` is false... i.e. when serverless, return 409 "set via env"). Prevents the misleading save.
- [ ] tsc/eslint/build. Commit `fix(stagecraft): 3.1-7 — gate secrets paste UI on serverless (reflect deploy reality)`.

### 3.1-8 Verification (see matrix)
- [ ] Full gate + parity + perf + export + gating + dev-mock. Commit verification marker.

---

## Migration order
1. Apply **005 schema** to Supabase (3.1-1).
2. Ship code: `supabaseStore` (3.1-2), summary read path (3.1-3), selector (3.1-4), export (3.1-6), secrets gating (3.1-7) — all behind **file default** (no behavior change until env flips).
3. Run **data migration** (3.1-5) from dev/CI → populates Supabase from retained JSON.
4. **Parity-verify** file vs supabase (3.1-8).
5. **Cutover:** set `STAGECRAFT_STORE=supabase` (+ `STAGECRAFT_SERVERLESS=1`) in the serverless env. Dev stays file.

## Rollback plan
- **Runtime:** unset/flip `STAGECRAFT_STORE` → file backend resumes from retained `.stagecraft/*.json` (single-host) — instant, no code redeploy.
- **Schema:** run the down migration (drops only `stagecraft_*`).
- **Data:** JSON retained + migration idempotent → re-runnable; export endpoint gives an independent snapshot. No data lost in either direction.

## Export format
```json
{ "exportedAt": "2026-06-03T...Z", "version": 1,
  "profile": { ...Profile },
  "config": { "interviewDate": "...", "interviewCompany": "..." },
  "sessions": [ { "id","startedAt","endedAt","report","items":[...QAItem],"composite" } ] }
```
Full fidelity (includes `items`) so it doubles as a backup + the restore input.

## Query strategy
- **History list:** `listSessionSummaries({limit,offset})` → no `items` loaded (summary+composite columns only); index `(user_id, started_at desc) where archived_at is null`.
- **Session detail:** `getSession(id)` → single row incl items.
- **Recurring patterns (grade):** keep last-10 cap; may read `summary.patterns` instead of items (optional optimization).
- **Export:** full `listSessions()` — acceptable (infrequent, user-initiated).
- **Writes:** `upsert`/`appendItem`/`setReport` recompute summary+composite in the same statement (denormalized).

## Performance expectations
- History list: O(rows) but **lightweight** (no items deserialization) + paginated → bounded payload regardless of total sessions.
- Detail/grade: single-row reads, indexed.
- Write: one upsert per answer (append + summary recompute) — negligible.
- Single-user scale: total data low-MB; all operations sub-100ms server-side barring network. Read-amplification eliminated as the dominant cost.

## Verification matrix
| Check | Method |
|---|---|
| tsc / eslint (touched) / build / coverage 61/61 | CLI |
| Schema applied: 3 tables + RLS + index | Supabase / SQL |
| supabaseStore parity vs file (profile/config/session/summary shapes identical) | curl both backends |
| Non-destructive partial profile save on supabase | curl (I2-1 guarantee) |
| History list loads NO items (payload size; summary-only) | network inspect |
| Pagination (limit/offset) returns correct slice newest-first | curl |
| Export returns full {profile,config,sessions} + attachment header | curl |
| Secrets UI: writable=false on serverless → paste hidden, "env-configured" shown; POST 409 | preview + curl |
| Dev-mock (no Supabase env, STORE=supabase) does not crash | run |
| File backend remains default with no env (zero behavior change) | run |
| Migration idempotent; JSON retained | run twice |
| Rollback: flip env → file backend resumes | run |

## Risks (delta from readiness review)
| # | Risk | Mitigation |
|---|---|---|
| 1 | Summary denormalization drifts from items | Single shared `summarise()`; recompute on every item write; export carries raw items as source of truth |
| 2 | Migration miscomputes summaries | Reuse the same `summarise()`; idempotent re-run; parity test |
| 3 | Forgetting `STAGECRAFT_SERVERLESS` on serverless → secrets UI misleads again | Default `writable` to false when `STAGECRAFT_STORE=supabase` too (supabase implies durable/serverless intent) — belt-and-suspenders |
| 4 | RLS blocks server reads if a route used anon client | All Stagecraft routes use admin client in v0; audited |
| 5 | Service-role key exposure | server-only; not `NEXT_PUBLIC`; audit in PR |

**Out of scope (held):** 3.2 authentication, 3.3 cross-device sync, 3.4 reminders, multi-user, monetization.
