# Stagecraft — Reliability, Activation & Onboarding (Planning)

> **Planning only. No implementation.** Covers Initiative 1 & 2 (detailed implementation plans) and Initiative 3 (architecture discovery only). Focus: core-loop reliability, user activation, onboarding. Explicitly out of scope: monetization, referrals, growth loops, pricing, multi-user.

Grounded in the actual code (audited 2026-05-17):
- Core APIs `POST /api/stagecraft/grade` (`ANTHROPIC_API_KEY`) and `/transcribe` (`OPENAI_API_KEY`) return **500** when the env key is absent; client shows a generic `[Grade error — please try again.]` with no cause/guidance/fallback.
- Persistence: server-side file JSON in `.stagecraft/` via `sessionStore.ts`, `profileStore.ts`, `configStore.ts` (single-tenant, no user-id, no auth). `profileStore` falls back to hardcoded `profile.ts`. Streak (`sc_streak_dates`) + quickfire counters live in **client localStorage**.
- Supabase already a project dependency with `src/lib/supabase/{client,server,admin,types}.ts` (used by MeenTrack + billing) — reusable for Stagecraft.
- `configStore` already persists `interviewDate` + `interviewCompany`.
- Deterministic suggested answers exist for the 4 fixed banks (`suggestedAnswers.ts`).

---

# INITIATIVE 1 — Core Loop Reliability (U1 + P2)

**Goal:** the practice loop never silently dies. When AI grading is unavailable, the user gets a clear cause + an actionable path + a useful fallback. Provide a key without server-env access.

## UX flows

### Flow A — Grade fails because no key is configured (U1)
1. User submits an answer in any loop (quickfire/drill/etc.).
2. Grade request returns a typed error `{ code: "NO_API_KEY" }` (new) instead of a bare 500.
3. Client renders an **inline status card** (not a dead error string):
   - "AI coaching isn't connected yet." + one-line cause.
   - Primary action: **"Connect AI" → Settings/Profile key section** (P2).
   - Fallback: if the question is in a fixed bank, auto-reveal the **deterministic Suggested Answer** ("Here's a model answer while AI coaching is offline") so the user still gets value.
4. After the key is set, a "Retry grading" affordance re-runs the same answer.

### Flow B — Grade fails transiently (network/rate-limit/provider)
1. Typed error `{ code: "PROVIDER_ERROR" | "RATE_LIMIT" | "TIMEOUT" }`.
2. Inline card: "Grading hit a snag — retry." + Retry button (re-sends same payload). No key prompt. Suggested-answer fallback still offered for fixed-bank questions.

### Flow C — Provide a key without server env (P2)
1. Profile/Settings gains an **"AI connection"** section showing status: `Anthropic: ● connected / ○ not set`, `OpenAI (voice): ● / ○`.
2. User pastes a key → POST to a new `/api/stagecraft/secrets` route → server writes to `.stagecraft/secrets.json` (gitignored, server-only, **never returned to the client**).
3. The section only ever shows connected/not-set + a "Replace" / "Clear" control — **never the key value**.
4. Grade/transcribe routes resolve the key by precedence: `process.env.ANTHROPIC_API_KEY` → `.stagecraft/secrets.json`.

**Security note (important):** the key is stored **server-side** in the gitignored data dir, never in client localStorage and never echoed back — this respects the ECC rule against client-side secret storage. The single-user file model makes this safe for v0; a multi-user version would require encryption-at-rest + per-user rows (out of scope here).

## Technical approach

- **New `lib/stagecraft/secrets.ts` (server-only):** `getAnthropicKey()` / `getOpenAIKey()` resolving env → `.stagecraft/secrets.json`; `setSecret(name, value)`, `getSecretStatus()` (returns booleans only). Mirrors `configStore.ts` file pattern.
- **New `POST /api/stagecraft/secrets`** (set) + **`GET`** (status booleans only). `runtime = "nodejs"`.
- **Grade route (`route.ts`):** replace `const apiKey = process.env.ANTHROPIC_API_KEY` with `await getAnthropicKey()`; replace the bare `{ status: 500 }` with a typed body `{ code: "NO_API_KEY", error }` and HTTP **409** (config-required, distinct from 500 transient). Map SDK errors to `PROVIDER_ERROR`/`RATE_LIMIT`/`TIMEOUT` with appropriate status.
- **Transcribe route:** same treatment with `getOpenAIKey()`.
- **Client:** a small shared helper `gradeAnswer()` (or inline) that parses the typed error and returns a discriminated union the UI switches on. A reusable `<LoopErrorState>` presentational component renders Flow A/B cards + Retry + suggested-answer fallback hook.

## Component changes

- **New:** `src/lib/stagecraft/secrets.ts`, `src/app/api/stagecraft/secrets/route.ts`, `src/components/stagecraft/LoopErrorState.tsx`, an "AI connection" block in `profile/page.tsx`.
- **Modified:** `grade/route.ts`, `transcribe/route.ts` (key resolution + typed errors). The ~6 client call-sites that today render `[Grade error — please try again.]` (quickfire, drill, star, negotiate, recruiter, debrief, the main session loop) swap the bare string for `<LoopErrorState>` driven by the typed error. The suggested-answer fallback reuses existing `getSuggestedAnswer()` + `renderSampleAnswer()`.
- `.gitignore`: add `.stagecraft/secrets.json` (the `.stagecraft/` dir is already gitignored — verify).

## Risk analysis

| Risk | Severity | Mitigation |
|---|---|---|
| Key written to a world-readable file | Med | `.stagecraft/` gitignored; file perms 600; never returned to client; document that this is single-user v0 only |
| Typed-error refactor touches ~6 call-sites → regression | Med | Keep the discriminated-union helper centralized; one call-site converted + verified before the rest; the loop stays functional if a site still shows the old string |
| Suggested-answer fallback only covers fixed banks (not the dynamic session loop) | Low | Acceptable — fallback shown only where an answer exists; dynamic loop shows the retry/connect card without a sample |
| 409 vs 500 semantics break existing `!res.ok` checks | Low | Clients already branch on `!res.ok`; typed body is additive |

## Verification strategy

- `tsc` + `eslint` (touched) + `npm run build` (+ coverage gate).
- **Reliability matrix (preview MCP + curl):** (a) no key → grade returns 409 `NO_API_KEY`, UI shows Connect card + suggested-answer fallback on a fixed-bank question; (b) key set via Settings → status flips to connected, retry succeeds; (c) simulate provider error → retry card, no key prompt.
- Confirm the key value is **never** present in any client response (grep the network payloads / `GET /secrets` returns booleans only).
- Light/dark + mobile render of `<LoopErrorState>`.

---

# INITIATIVE 2 — Activation & Onboarding (U2 + U3 + C1 + C2)

**Goal:** a new user reaches first value in <3 minutes, and the profile (coaching-quality engine) fills progressively through use rather than as a cold 21-field gate.

## UX flows

### Flow A — First-run / time-to-first-value (U2 + C1)
1. **First-run detection:** new `GET /api/stagecraft/state` returns `{ hasProfileFile, sessionCount }`. If no saved profile file **and** 0 sessions → treat as first run. (Note: `profileStore` currently falls back to John's hardcoded profile; first-run is keyed on *file existence + session count*, not profile content.)
2. Landing shows a **first-run hero**: one primary CTA → **"Try a 60-second Quick Fire"** (zero setup). Secondary: "Set up your profile."
3. User does one Quickfire answer → sees grade + coaching (or, if AI not connected, the suggested answer via Initiative 1 fallback). **This is the activation "aha."**
4. After the first graded answer, a non-blocking prompt: "Want answers tailored to *your* numbers? Add your profile →" (links to the wizard, U3).

### Flow B — Profile setup wizard (U3)
1. New `/stagecraft/profile/setup` (or a modal) — **stepwise**, not the 21-field wall:
   - Step 1 — Identity (name, current role, target role) — 3 fields.
   - Step 2 — **3 real numbers** (the highest-leverage coaching input).
   - Step 3 — **1 STAR story** (situation/task/action/result).
   - "Finish later" allowed at every step; each completed step immediately improves coaching.
2. Progress indicator ("Step 2 of 3 — this unlocks number-anchored answers").
3. On finish → redirect to the recommended session. The full editor at `/stagecraft/profile` remains for power editing.

### Flow C — Progressive profiling (C2)
1. During practice, when the grader detects a missing input it surfaces a **contextual micro-prompt**: e.g. after a vague answer, "Add a real number to make this concrete →" opens a 1-field inline capture that appends to `profile.realNumbers` (server save) without leaving the loop.
2. Capture is always optional and dismissable; never blocks the next question.

## Technical approach

- **First-run signal:** new `GET /api/stagecraft/state` reading `profileStore` file existence (add a `profileFileExists()` helper) + `listSessions().length`. Client caches in component state.
- **Wizard:** new route `src/app/stagecraft/profile/setup/page.tsx` reusing the existing `Field`/`TextInput`/`TextArea` components and the existing `POST /api/stagecraft/profile` (partial saves merge server-side via the existing `{...defaultProfile, ...parsed}` merge — confirm partial PATCH semantics; if the route replaces wholesale, add merge-on-save or a PATCH).
- **Progressive capture:** a small `<InlineProfileAppend field="realNumbers">` client component that POSTs an append to profile; reuses the merge logic. Triggered by a grader signal already present in the META footer / pattern tags (e.g. a "missing number" / "vague" pattern) — confirm the grader emits a usable signal; if not, trigger heuristically client-side (answer has no digit + content score < 6).
- **Landing first-run hero:** conditional block in `stagecraft/page.tsx` gated on the first-run signal; reuses existing CTA styling.

## Component changes

- **New:** `src/app/stagecraft/profile/setup/page.tsx`, `src/app/api/stagecraft/state/route.ts`, `<InlineProfileAppend>`, a first-run hero block in `page.tsx`.
- **Modified:** `profile/page.tsx` (extract reusable step fields if needed; keep full editor), `profileStore.ts` / `profile` route (ensure partial-merge save), landing `page.tsx` (first-run branch), quickfire (host the post-first-answer profile prompt + inline append).
- **Reused:** `Field`/`TextInput`/`TextArea`, `getSuggestedAnswer`, recommended-next-session logic, the grouped nav.

## Risk analysis

| Risk | Severity | Mitigation |
|---|---|---|
| `profileStore` defaults to John's profile → "first run" is ambiguous for the seeded user | Med | Key first-run on **file existence + 0 sessions**, not profile content; for John (already seeded) first-run simply won't trigger — correct behavior |
| Partial profile save overwrites unsaved fields | High | Verify the profile route merges (`{...existing, ...patch}`) rather than replacing; add a PATCH path if it replaces. Test save-one-field-keeps-others |
| Progressive prompts feel naggy → hurt the friction-free loop | Med | Strictly optional, dismissable, post-answer only (never pre-question); cap frequency; respect a "don't ask again" |
| Wizard duplicates the full editor → drift | Low | Wizard composes the same `Field` components + same save endpoint; no parallel form logic |
| New `/state` + `/setup` add routes to verify across light/dark/mobile | Low | Standard verification matrix |

## Verification strategy

- `tsc` + `eslint` (touched) + `npm run build` (+ coverage gate).
- **Activation flow test (preview MCP):** simulate first run (no profile file, 0 sessions via a temp `.stagecraft`) → landing shows first-run hero → Quickfire → first graded answer (or suggested-answer fallback) → post-answer profile prompt appears.
- **Wizard test:** complete steps 1–3, confirm each partial save persists and does not clobber other fields; "finish later" preserves progress.
- **Progressive capture test:** vague answer triggers the optional number prompt; appending updates `profile.realNumbers`; dismiss works; next question never blocked.
- a11y (labels on all new inputs — reuse the Initiative-Q2 `Field` association), light/dark, mobile 375.

---

# INITIATIVE 3 — Persistence & Sync (P1 + R1 + R2 + R3) — ARCHITECTURE DISCOVERY ONLY

> No implementation. Feasibility, complexity, recommended architecture.

## Current-state audit

- **Storage:** server-side **flat-file JSON** in `<cwd>/.stagecraft/` (`sessions.json`, `profile.json`, `config.json`) via `node:fs`. Atomic-ish whole-file read/rewrite. **Single-tenant** — no user identifier anywhere; `getProfile()`/`listSessions()` return the one global record set.
- **Auth:** **none** for Stagecraft. (Supabase auth/SSR exists in the repo for MeenTrack + billing but is not applied here.)
- **Client-local state:** streak (`sc_streak_dates`) and quickfire daily counters in **localStorage** — device-bound, not in the server store.
- **Deploy implication:** the file model **only persists on a single long-lived host**. On serverless/multi-instance (e.g. Vercel) the FS is ephemeral and per-instance → writes vanish or desync. Cross-device works *today* only if all devices hit one persistent server.
- **Supabase readiness:** deps installed; `src/lib/supabase/{client,server,admin,types}.ts` present; `.env.example` has the Supabase section. Auth helpers (`@supabase/ssr`) already used elsewhere → **reusable**.

## What each item needs

- **P1 (real persistence):** move the 3 stores from files to a durable DB. Supabase (Postgres) is already in-repo → lowest-friction target.
- **R1 (cross-device):** requires per-user identity (auth) + server DB (P1). Also requires migrating the **localStorage streak/counters** into the synced store, or they won't follow the user.
- **R2 (return nudges):** needs a delivery channel — email (Supabase + a mail provider / scheduled function) or web push. Net-new infra; the hardest piece.
- **R3 (interview-date countdown):** **nearly free today** — `configStore` already holds `interviewDate`. A countdown UI + "today's plan" needs no new persistence. Can ship independent of P1.

## Feasibility assessment

| Item | Feasibility | Notes |
|---|---|---|
| R3 countdown | **High / now** | Data already exists (`config.interviewDate`); pure UI. No P1 dependency. |
| P1 persistence | **High** | Supabase scaffolding present; the store interface (`listSessions`/`getSession`/`upsertSession`/`appendItem`/`getProfile`/`saveProfile`/`getConfig`) is small and already abstracted — swap file impl for Supabase impl behind the same function signatures. |
| R1 cross-device | **Medium** | Gated on P1 + auth. Single-user-today means auth could be a lightweight single-account gate initially; true multi-user is explicitly out of scope. Must also migrate localStorage streak/counters server-side. |
| R2 reminders | **Medium–Low** | Requires email/push infra + scheduling (Supabase Edge Functions + cron, or a mail service). Most net-new surface; sequence last. |

## Estimated complexity

- **R3:** S (hours) — UI only.
- **P1:** M (1–3 days) — implement a `supabaseStore` behind the existing store function signatures; create `stagecraft_profiles` / `stagecraft_sessions` / `stagecraft_config` tables; migration of existing `.stagecraft/*.json` → DB (one-off script); flip an env flag to choose backend (preserves local-file dev).
- **R1:** M–L — auth gate (reuse Supabase SSR), per-user row partitioning (add `user_id`), migrate localStorage streak/counters into a synced `stagecraft_activity` table, RLS policies.
- **R2:** L — channel + scheduler + preferences + unsubscribe; behavioral, not just CRUD.

## Recommended architecture

1. **Keep the store interface; swap the implementation.** The current `sessionStore`/`profileStore`/`configStore` already expose clean async functions. Introduce a `supabaseStore` with identical signatures and select via env (`STAGECRAFT_STORE=file|supabase`) — zero changes at call-sites (the grade route, API routes, pages all keep importing the same functions). This is the single most important design decision: **persistence becomes a backend swap, not a rewrite.**
2. **Data model (Postgres / Supabase):**
   - `stagecraft_profiles (user_id PK, data jsonb, updated_at)` — store the `Profile` as `jsonb` (it's already a single nested object; avoids over-normalizing v0).
   - `stagecraft_sessions (id PK, user_id, started_at, ended_at, report, items jsonb, composite numeric)` — `items` as `jsonb` (matches `SessionRecord`).
   - `stagecraft_config (user_id PK, interview_date date, interview_company text)`.
   - `stagecraft_activity (user_id, date PK)` — absorbs the localStorage streak so it syncs (R1).
   - RLS: `user_id = auth.uid()` on every table.
3. **Auth:** reuse the existing `src/lib/supabase/server.ts` SSR client. For this stage, a **single-account gate** (the one user) is sufficient and avoids the explicitly-out-of-scope multi-user work; the `user_id` column is added now so multi-user is a later config flip, not a migration.
4. **Migration:** one-off script reads `.stagecraft/*.json` → inserts rows under the authenticated user. Idempotent; safe to re-run. Keep file backend as the default dev path.
5. **Sequencing recommendation:** **R3 first (independent, high value, hours)** → **P1 (backend swap)** → **R1 (auth + activity migration)** → **R2 (reminders, last)**. R2's channel/scheduler is the only genuinely new infrastructure and should not block the durable-data win.
6. **Serverless caveat:** if deploying serverless, P1 is a **prerequisite** (file store will not work). If staying on a single persistent host, file store remains viable but still loses cross-device per-user partitioning — so P1 is recommended regardless once activation/reliability land.

## Discovery conclusion

P1 is **low-risk and well-scaffolded** (Supabase already present; store interface already abstracted) — it's a backend implementation behind stable signatures plus a schema + one migration. R3 is shippable immediately with no persistence work. R1 layers auth + activity migration on top of P1. R2 is the only item needing net-new infrastructure and should be sequenced last. No persistence work should begin until Initiatives 1 & 2 (reliability + activation) are delivered, per the stated focus.
