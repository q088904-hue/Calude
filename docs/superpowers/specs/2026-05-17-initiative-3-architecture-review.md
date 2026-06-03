# Initiative 3 — Persistence, Sync, Auth & Retention: Architecture Review & Execution Roadmap

> Planning only. No implementation. Produced after Initiatives 1 & 2 shipped. Covers persistence, cross-device sync, Supabase migration strategy, authentication architecture, and retention mechanics. Approve before any implementation.

## 0. Audited current state (ground truth)

- **Stagecraft persistence = server-side flat-file JSON** under `<cwd>/.stagecraft/`:
  - `sessions.json` (via `sessionStore.ts`), `profile.json` (via `profileStore.ts`, falls back to hardcoded `profile.ts`), `config.json` (`configStore.ts`, holds `interviewDate`/`interviewCompany`), and `secrets.json` (`secrets.ts`, API keys — added in Initiative 1).
  - All stores expose small async function interfaces: `listSessions/getSession/upsertSession/appendItem/setReport`, `getProfile/saveProfile/profileFileExists`, `getConfig/saveConfig`, `getAnthropicKey/getOpenAIKey/getSecretStatus`.
- **Single-tenant:** no user identifier anywhere; every function returns the one global record set.
- **No auth** on any Stagecraft route. (Supabase auth/SSR exists in the repo for MeenTrack + billing — reusable, not yet applied to Stagecraft.)
- **Client-local state (won't sync):** streak (`sc_streak_dates`), quickfire/session daily counters — all in `localStorage`, device-bound.
- **Supabase already a dependency:** `@supabase/ssr`, `@supabase/supabase-js`; `src/lib/supabase/{client,server,admin,types}.ts` present; `.env.example` has the Supabase section.
- **`/api/stagecraft/state`** (Initiative 2) already aggregates profile/session signals — a convenient seam.

**Deploy implication:** the flat-file model only persists on a single long-lived host. On serverless/multi-instance the FS is ephemeral/per-instance → writes vanish or desync. Cross-device today works *only* if all devices hit one persistent server, and even then there is no per-user partitioning.

---

## 1. Architecture review

### 1.1 The decisive design choice — swap the store implementation, not the call-sites
Every consumer (grade route, all API routes, pages, the new `/state` and onboarding surfaces) imports **functions**, never a storage client. This is the highest-leverage fact in the whole initiative: **persistence can become a backend swap behind stable signatures**, not a rewrite. Introduce a `supabaseStore` implementing the identical function signatures and select the backend by env (`STAGECRAFT_STORE=file|supabase`). Call-site churn ≈ zero.

### 1.2 Authentication architecture
- **Reuse the existing Supabase SSR client** (`src/lib/supabase/server.ts`) — no new auth stack.
- **Single-account gate for v0** (the one user). This satisfies cross-device (R1) and retention (R2/R3) without the explicitly-out-of-scope multi-user build. Recommended auth method: **Supabase magic-link email** (lowest friction, no password handling, aligns with the "no client-side secrets" rule) OR a single-user passcode if email infra isn't desired yet.
- **Add a `user_id` column now** even with one user — so multi-user later is a config change + RLS, not a migration.
- A thin `middleware.ts` (or per-route guard) protects `/stagecraft/*` + `/api/stagecraft/*`. Auth check is server-side; never trust client gating.

### 1.3 Data model (Postgres / Supabase)
Store the already-nested TypeScript objects as `jsonb` (avoid premature normalization for v0):

| Table | Columns | Notes |
|---|---|---|
| `stagecraft_profiles` | `user_id PK`, `data jsonb`, `updated_at` | the `Profile` object as-is |
| `stagecraft_sessions` | `id PK`, `user_id`, `started_at`, `ended_at`, `report text`, `items jsonb`, `composite numeric` | matches `SessionRecord`; index `(user_id, started_at desc)` |
| `stagecraft_config` | `user_id PK`, `interview_date date`, `interview_company text` | |
| `stagecraft_activity` | `user_id`, `date PK` | absorbs the localStorage streak so it syncs (R1) |

- **Secrets:** API keys should **not** move to a shared DB as plaintext. Keep `secrets.ts` server-file for v0, or (if multi-host) use Supabase Vault / encrypted column — flagged, not blocking.
- **RLS:** `user_id = auth.uid()` on every table; deny-by-default.

### 1.4 Migration strategy
- One-off idempotent script reads `.stagecraft/*.json` → inserts rows under the authenticated user. Safe to re-run.
- **Keep the file backend as the default dev path** (`STAGECRAFT_STORE=file`); flip to `supabase` in deployed/multi-device environments. No data loss; reversible.
- Backfill: the existing `getProfile` read-merge (`{...defaultProfile, ...parsed}`) pattern carries over to the DB impl so new fields keep backfilling.

### 1.5 Cross-device sync (R1)
- Once persistence is server-DB + auth, cross-device is inherent (any device with the session reads the same rows).
- **Migrate the localStorage streak + daily counters into `stagecraft_activity`** — otherwise streak/retention signals stay device-local and contradict cross-device.
- Conflict model: last-write-wins per record is acceptable for a single user across devices (no concurrent multi-user edits). Note for future multi-device simultaneous edits (rare for one user).

### 1.6 Retention mechanics
- **R3 interview-date countdown — shippable now, no persistence dependency.** `config.interviewDate` already exists; this is a UI surface ("6 days to your Kohler interview — today's 10-minute plan"). Highest ROI / lowest effort; can ship independent of the DB work.
- **R2 return nudges** — needs a delivery channel + scheduler. Options: Supabase Edge Function + cron (pg_cron) + an email provider (Resend/Postmark) or web push. This is the **only genuinely new infrastructure** in the initiative.
- **R1 cross-device** — gated on persistence + auth (above).

---

## 2. Feasibility & complexity

| Item | Feasibility | Complexity | Gated on |
|---|---|---|---|
| R3 countdown | High / now | **S** (UI only) | nothing |
| P1 persistence (supabaseStore behind signatures + schema + migration) | High (scaffolding present, interface abstracted) | **M** | Supabase project tables |
| Auth (single-account, Supabase SSR magic-link) | High (SSR client exists) | **M** | email provider or passcode |
| R1 cross-device (auth + activity migration + RLS) | Medium | **M–L** | P1 + auth |
| R2 reminders (channel + scheduler + prefs/unsubscribe) | Medium–Low | **L** | email/push infra |

**Overall:** P1 is low-risk and well-scaffolded; R3 is immediate; auth is a reuse; R1 layers on P1+auth; R2 is the heavy, net-new piece.

---

## 3. Execution roadmap (recommended sequence)

> Each phase ships independently and is verified (tsc/eslint/build/coverage + the relevant behavioral checks) before the next.

**Phase 3.0 — R3 interview-date countdown (independent quick win)**
- A countdown surface on the hub + a "today's plan" nudge, sourced from `config.interviewDate`. No persistence/auth work. Ships value immediately while the DB work is planned.

**Phase 3.1 — Persistence foundation (P1), file-default**
- Provision Supabase tables + RLS. Implement `supabaseStore` behind the existing store signatures. Env switch `STAGECRAFT_STORE`. One-off migration script. Keep `file` as default; prove parity (file vs supabase return identical shapes) before flipping anything.

**Phase 3.2 — Authentication (single-account)**
- Supabase SSR magic-link (or passcode). `middleware.ts` guard on `/stagecraft/*` + `/api/stagecraft/*`. Add `user_id` to all tables + RLS `auth.uid()`. Server-side enforcement.

**Phase 3.3 — Cross-device sync (R1)**
- Flip deployed env to `STAGECRAFT_STORE=supabase`. Migrate localStorage streak/counters → `stagecraft_activity`. Verify same data across two sessions/devices.

**Phase 3.4 — Return nudges (R2, last)**
- Channel (email via Resend/Postmark or web push) + scheduler (Supabase Edge Function + pg_cron) + preferences + unsubscribe. Tie cadence to streak + interview-date countdown.

**Dependency graph:** 3.0 ⟂ (independent) · 3.1 → 3.2 → 3.3 · 3.4 after 3.1+3.2.

---

## 4. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Serverless deploy with file store → silent data loss | High | P1 is a prerequisite for any serverless deploy; until then stay single-host; document |
| 2 | Migration corrupts/loses existing `.stagecraft/*.json` | High | Idempotent script; back up `.stagecraft/` first; keep file backend intact as fallback; parity test before flip |
| 3 | Secrets (API keys) in a shared DB as plaintext | High | Do NOT migrate `secrets.json` to plain columns; keep server-file or use Vault/encryption (flagged) |
| 4 | Auth added but client-gating trusted | High | Server-side enforcement (middleware + RLS); never gate solely in JSX |
| 5 | localStorage streak not migrated → retention signals desync cross-device | Med | Phase 3.3 explicitly migrates activity into the synced table |
| 6 | R2 infrastructure (email/cron) over-built before retention is proven | Med | Sequence R2 last; ship R3 + activation first; measure return behavior before investing |
| 7 | RLS misconfiguration leaks data when multi-user arrives | Med (future) | `user_id`+RLS from day one even at single-user; deny-by-default policies |
| 8 | Scope creep into multi-user / monetization | Med | Explicitly out of scope; `user_id` added for future-proofing only, not multi-user features |

---

## 5. Decisions needed before Phase 3.1
1. **Deploy target** — staying single persistent host, or moving serverless? (Determines whether P1 is urgent or merely recommended.)
2. **Auth method** — Supabase magic-link email (needs email provider) vs single-user passcode (no infra). 
3. **Supabase project** — use the existing project (shared with MeenTrack/billing) with `stagecraft_*` table prefix, or a separate project? (Recommend same project, prefixed tables + RLS.)
4. **R2 channel** — email vs web push vs both (only relevant at Phase 3.4).

## 6. Scope guard
In scope: persistence, cross-device sync, Supabase migration, single-account auth, retention (R1/R2/R3). **Out of scope:** multi-user accounts, monetization, referrals, pricing, growth loops — `user_id`/RLS are added only to avoid a future migration, not to build multi-user now.
