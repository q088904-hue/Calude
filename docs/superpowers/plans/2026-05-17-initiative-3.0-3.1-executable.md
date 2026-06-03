# Initiative 3.0 + 3.1 — Executable Plan (Countdown + Persistence)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. `- [ ]` steps. **Planning only — nothing implemented yet.**

**Locked decisions:** serverless-compatible · Supabase Magic Link (auth NOT built here, deferred to 3.2) · reuse existing Supabase project with `stagecraft_`-prefixed tables · reminders deferred. **Not in this plan:** authentication, cross-device sync, reminders.

**Audited facts:**
- `CountdownStrip` (`page.tsx:1685`) **already exists** on the landing hero (days-left, urgency colors, pace hints, ≤3-day sprint actions). 3.0 is therefore *surfacing*, not rebuilding.
- Persistence = flat-file JSON (`sessionStore`/`profileStore`/`configStore`), single-tenant, server-only. **Flat-file does not survive serverless** (ephemeral FS) — this is why 3.1 is required for the serverless target.
- `getSupabaseAdmin()` (`src/lib/supabase/admin.ts`) = service-role client, bypasses RLS, server-only, **dev-mock when keys absent** (returns null data, no crash).
- Env present: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Migration convention: `NNN_name.sql`.
- Types: `Profile`, `SessionRecord`, `QAItem` (`types.ts`).

**Bridge design (serverless durable, no auth yet):** all rows carry a `user_id uuid` defaulting to a **sentinel** `00000000-0000-0000-0000-000000000000`. Server routes read/write via the **admin (service-role) client** (works serverless, bypasses RLS). RLS is enabled deny-by-default now; when 3.2 adds Magic Link, rows migrate from the sentinel to `auth.uid()` and reads switch to the SSR client — a config/data change, not a rewrite.

**Verification gates (no unit-test suite):** `npx tsc --noEmit`, `npx eslint <touched>`, `npm run build` (+ `check-answers` 61/61), preview-MCP behavioral checks, and store **parity tests** (file vs supabase identical shapes).

---

# 3.0 — Interview Date Countdown (quick win, no persistence dependency)

**Goal:** the interview-date countdown follows the user across Stagecraft (retention), reusing the existing hub logic. DRY: extract the day-math once.

## Task 3.0-1: Extract countdown math to a shared util
**Files:** Create `src/lib/stagecraft/countdown.ts`; refactor `page.tsx` `CountdownStrip` to use it.
- [ ] Create `countdown.ts`:
```ts
export interface CountdownInfo {
  days: number;            // whole days until target (negative if past)
  label: string;           // "Today" | "1 day left" | "N days left"
  urgency: "today" | "urgent" | "soon" | "far" | "past";
}
export function computeCountdown(isoDate: string, now: Date = new Date()): CountdownInfo {
  const t0 = new Date(now); t0.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const days = Math.round((target.getTime() - t0.getTime()) / 86_400_000);
  const urgency = days < 0 ? "past" : days === 0 ? "today" : days <= 3 ? "urgent" : days <= 7 ? "soon" : "far";
  const label = days < 0 ? "" : days === 0 ? "Today" : days === 1 ? "1 day left" : `${days} days left`;
  return { days, label, urgency };
}
```
- [ ] Refactor `CountdownStrip` to call `computeCountdown(date)` for `days`/`label`/urgency (keep its existing rich rendering + sprint actions). Behaviour identical.
- [ ] `npx tsc --noEmit && npx eslint` clean. Commit `feat(stagecraft): 3.0-1 — extract countdown math to shared util`.

## Task 3.0-2: Persistent countdown chip in the shared header
**Files:** Create `src/components/stagecraft/CountdownChip.tsx`; render in `StagecraftHeader` (as a `children` element on sub-pages, or internally).
- [ ] `CountdownChip` (client): fetch `GET /api/stagecraft/config`; if `interviewDate` set and not past, render a compact mono chip — e.g. `◷ 6 days left` colored by `urgency` (text-sc-red ≤3, text-sc-gold ≤7, text-sc-dim else), title=company. Renders nothing if no date/past. Uses `computeCountdown`.
```tsx
// shape
const cfg = await fetch("/api/stagecraft/config").then(r=>r.json());
const info = cfg.interviewDate ? computeCountdown(cfg.interviewDate) : null;
if (!info || info.urgency === "past") return null;
```
- [ ] Render `<CountdownChip />` inside `StagecraftHeader` (left cluster, after the label, or in the right cluster before the toggler). It shows on every Stagecraft sub-page automatically.
- [ ] Verify: with a date set in config, chip appears on quickfire/drill/history etc.; no date → absent; past date → absent. light/dark, ≥non-interactive (it's a label, no target rule). `tsc`/`eslint`/`build` green.
- [ ] Commit `feat(stagecraft): 3.0-2 — persistent interview countdown chip in header`.

## Task 3.0-3: Verification
- [ ] tsc/eslint/build/coverage; preview: chip on ≥3 routes, urgency colors at 2/6/20 days; existing hub CountdownStrip unchanged. Commit verification marker.

**3.0 scope note:** the rich hub strip + sprint actions already exist and are retained; 3.0 adds the omnipresent chip + DRY math. No persistence/auth needed.

---

# 3.1 — Persistence Layer Migration (file → Supabase, serverless-durable)

**Goal:** durable storage that survives serverless, behind the existing store function signatures, selectable by env, with the file store retained as default/fallback. Single sentinel user; auth-ready schema.

## Task 3.1-1: Schema migration (SQL)
**Files:** Create `supabase/migrations/<NNN>_stagecraft_core.sql` (match existing numbering).
- [ ] Author the migration:
```sql
-- Stagecraft core persistence. Sentinel user until Magic Link (3.2) lands.
create table if not exists stagecraft_profiles (
  user_id    uuid primary key default '00000000-0000-0000-0000-000000000000',
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists stagecraft_sessions (
  id          text primary key,
  user_id     uuid not null default '00000000-0000-0000-0000-000000000000',
  started_at  timestamptz,
  ended_at    timestamptz,
  report      text,
  items       jsonb not null default '[]'::jsonb,
  composite   numeric,
  created_at  timestamptz not null default now()
);
create index if not exists stagecraft_sessions_user_started_idx
  on stagecraft_sessions (user_id, started_at desc);
create table if not exists stagecraft_config (
  user_id           uuid primary key default '00000000-0000-0000-0000-000000000000',
  interview_date    date,
  interview_company text,
  updated_at        timestamptz not null default now()
);
-- RLS: deny anon; service-role (server admin client) bypasses RLS.
alter table stagecraft_profiles enable row level security;
alter table stagecraft_sessions enable row level security;
alter table stagecraft_config   enable row level security;
-- (No anon policies yet — only the server service-role touches these in v0.
--  3.2 adds: create policy ... using (user_id = auth.uid());)
```
- [ ] Apply to the existing Supabase project (via the repo's migration runner / Supabase SQL editor). Verify tables exist + RLS on.
- [ ] Commit the migration file: `feat(stagecraft): 3.1-1 — stagecraft_* tables (RLS, sentinel user)`.

## Task 3.1-2: `supabaseStore` (identical signatures)
**Files:** Create `src/lib/stagecraft/supabaseStore.ts`.
- [ ] Implement, using `getSupabaseAdmin()` + `SENTINEL_USER_ID`, functions matching the file stores exactly:
  - sessions: `listSessions(): Promise<SessionRecord[]>`, `getSession(id)`, `upsertSession(record)`, `appendItem(id,item)`, `setReport(id,report)`
  - profile: `getProfile(): Promise<Profile>` (merge `{...defaultProfile, ...row.data}`; if no row → `defaultProfile`), `saveProfile(p)`, `profileFileExists()` → rename concept to `profileExists()` (row presence)
  - config: `getConfig()`, `saveConfig(c)`
- [ ] Map row↔type: sessions row `{id,user_id,started_at,ended_at,report,items,composite}` ↔ `SessionRecord`; profile `data jsonb` ↔ `Profile`; config columns ↔ `StagecraftConfig`.
- [ ] Handle the dev-mock (admin client returns null) gracefully: treat null as empty/default (never throw) so dev without keys still runs.
- [ ] `tsc`/`eslint` clean. Commit `feat(stagecraft): 3.1-2 — supabaseStore behind existing signatures`.

## Task 3.1-3: Backend selector (env switch, file default)
**Files:** Modify `sessionStore.ts`, `profileStore.ts`, `configStore.ts` (+ a tiny `storeBackend.ts`).
- [ ] Add `src/lib/stagecraft/storeBackend.ts`: `export const useSupabaseStore = () => process.env.STAGECRAFT_STORE === "supabase";`
- [ ] In each existing store, delegate per function: at the top of each public function, `if (useSupabaseStore()) return supa.<fn>(...args);` else run the existing file logic. Import `* as supa from "./supabaseStore"`. Call-sites unchanged.
- [ ] `profileFileExists()` → when supabase backend, return `supa.profileExists()`; keep file-existence for file backend. (Consumed by `/state`.)
- [ ] Default (no env) = file backend — zero behavioral change in dev.
- [ ] `tsc`/`eslint`/`build` green; `check-answers` 61/61. Commit `feat(stagecraft): 3.1-3 — STAGECRAFT_STORE selector (file default, supabase opt-in)`.

## Task 3.1-4: One-off data migration script
**Files:** Create `scripts/stagecraft-migrate-to-supabase.mjs`.
- [ ] Read `.stagecraft/{profile,sessions,config}.json` (skip if absent) → upsert into the tables under `SENTINEL_USER_ID` via the admin client. **Idempotent** (upsert on PK). Does NOT delete the JSON files (file mode stays a fallback).
- [ ] Print a summary (rows migrated per table). Guard: refuse to run if `SUPABASE_SERVICE_ROLE_KEY` unset.
- [ ] Document run command in the script header + the migration doc. Commit `feat(stagecraft): 3.1-4 — idempotent .stagecraft → supabase migration script`.

## Task 3.1-5: Parity + serverless verification
- [ ] **Parity test:** with `STAGECRAFT_STORE=file` capture GET /state, profile, a session; switch to `supabase` (after migration), capture same → identical shapes/values. (Script or manual curl.)
- [ ] **Non-destructive profile save** (the I2-1 guarantee) holds on supabase backend: partial POST preserves other fields (merge over `getProfile()` reads the row).
- [ ] **Dev-mock safety:** with Supabase env unset + `STAGECRAFT_STORE=supabase`, app does not crash (admin mock → empty/default).
- [ ] tsc/eslint/build/coverage; commit verification marker.

---

## Schema design (summary)
- 3 tables, `stagecraft_` prefixed, in the existing Supabase project. `jsonb` for nested objects (`profile.data`, `session.items`) — matches the TS types, no premature normalization. `user_id uuid` sentinel default now; becomes `auth.uid()` in 3.2. RLS enabled deny-by-default; service-role server access only in v0. Index on `(user_id, started_at desc)` for the history list.

## Migration strategy
- **Schema:** additive SQL migration (`stagecraft_*` only — cannot affect MeenTrack/billing tables). Apply to existing project.
- **Data:** idempotent one-off script copies `.stagecraft/*.json` → rows under the sentinel user. JSON files retained.
- **Cutover:** set `STAGECRAFT_STORE=supabase` in the serverless env. Dev stays file-default. Reversible by unsetting the env.

## Rollback strategy
- **Instant code/runtime rollback:** unset/flip `STAGECRAFT_STORE` → file backend resumes (the `.stagecraft/*.json` files are never deleted by the migration). No redeploy of code logic required, just the env.
- **Schema rollback:** a `down` migration `drop table if exists stagecraft_profiles, stagecraft_sessions, stagecraft_config cascade;` — safe because tables are prefixed/isolated; only destroys Stagecraft rows. Run only if abandoning the migration before real multi-device use.
- **Data safety:** because the file JSON is retained and the migration is idempotent, no state is lost in either direction during 3.1.

## Verification matrix
| Check | 3.0 | 3.1 |
|---|---|---|
| `tsc --noEmit` | ✓ | ✓ |
| `eslint` (touched) | ✓ | ✓ |
| `npm run build` + coverage 61/61 | ✓ | ✓ |
| Countdown chip on ≥3 routes, urgency colors (2/6/20d), past→hidden | ✓ | — |
| Hub CountdownStrip unchanged | ✓ | — |
| Schema applied; tables + RLS present | — | ✓ |
| supabaseStore parity vs file (state/profile/session shapes identical) | — | ✓ |
| Non-destructive partial profile save on supabase backend | — | ✓ |
| Dev-mock (no Supabase env) doesn't crash | — | ✓ |
| File backend remains default with no env | — | ✓ |
| Light/dark + mobile (chip) | ✓ | — |

## Risk assessment
| # | Risk | Sev | Mitigation |
|---|---|---|---|
| 1 | Flat-file silently loses data on serverless before 3.1 lands | High | 3.1 is the prerequisite for serverless deploy; until cutover, stay single-host; documented |
| 2 | Migration data loss / corruption | High | Idempotent upserts; JSON files retained (never deleted); parity test before cutover; service-role-key guard |
| 3 | Secrets file (`secrets.json`, Initiative 1) also won't persist on serverless | Med | Out of scope here; on serverless rely on **env-var** keys (the Settings paste UI no-ops without persistent FS). Flag: encrypted-DB key storage is a separate future item — do NOT put plaintext keys in shared DB |
| 4 | RLS deny-by-default + no auth → only service-role can read; if any route used the SSR/anon client it would get nothing | Med | v0 Stagecraft routes use the admin client exclusively; 3.2 adds anon policies with auth.uid() |
| 5 | Sentinel user collides if multi-user added carelessly | Low | 3.2 migrates sentinel rows to real auth uids before enabling multi-user; `user_id` already uuid |
| 6 | Shared Supabase project — accidental impact on MeenTrack/billing tables | Low | `stagecraft_`-prefixed tables only; migration touches nothing else; RLS isolated |
| 7 | Admin (service-role) client used in request path — key exposure | Med | Server-only (`admin.ts` already warns/never client-exposed); routes are `runtime=nodejs`; never imported by client components |
| 8 | `jsonb` drift vs evolving TS types | Low | `getProfile` keeps the `{...defaultProfile, ...data}` backfill; sessions/config are append-only shapes |

## Out of scope (held)
Authentication (3.2), cross-device sync (3.3), reminders (3.4), multi-user, monetization. `user_id` + RLS scaffolding added now only to make 3.2 a config/data change rather than a migration.
