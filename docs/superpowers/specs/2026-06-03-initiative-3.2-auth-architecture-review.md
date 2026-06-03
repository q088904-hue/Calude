# Initiative 3.2 — Authentication Architecture Review

> **Planning only.** This is an architecture review, not an executable plan. No implementation until approved. Locked decision (Initiative 3 kickoff): **Auth = Supabase Magic Link**.

## 1. Purpose & scope

Secure Stagecraft behind authentication and convert the 3.1 single-tenant sentinel model into a real per-user model — the prerequisite for cross-device sync (3.3) and reminders (3.4), neither of which is in scope here.

**In scope (to design):** Magic Link login/logout, session management, route protection, sentinel→`auth.uid()` data migration, RLS policy activation, store/route client strategy, secrets posture under auth.
**Out of scope:** 3.3 sync, 3.4 reminders, multi-tenant team features, billing/entitlement rework beyond what auth strictly requires.

## 2. Current state (what 3.1 + the codebase already provide)

| Asset | State | 3.2 relevance |
|---|---|---|
| `stagecraft_*` tables | rows carry sentinel `user_id` `0000…`; RLS **enabled, deny-by-default, no anon policies** | 3.2 adds `auth.uid()` policies + migrates sentinel rows |
| Stagecraft route handlers | use the **service-role admin client** (RLS-bypassing) | 3.2 decides: switch to SSR anon (RLS-enforced) vs keep admin scoped by uid |
| `getSupabaseServer()` (`@supabase/ssr`) | cookie-based SSR anon client, **already wired**, dev-mock returns `dev-user-id` | the auth-aware client 3.2 builds on |
| `src/lib/supabase/client.ts` | browser client | magic-link initiation + callback |
| Existing **PI auth** (`/api/pi/auth/*`, signed Datamatics-only session) | **separate** custom cookie session for the PI tool | **do NOT reuse/merge** — Supabase Auth is a distinct system; keep them independent |
| `STAGECRAFT_STORE` selector + `supabaseStore` | file default; supabase backend works behind stable signatures | auth changes the *who*, not the store interface |

**Key implication:** the data layer is auth-ready. 3.2 is primarily an **identity + access-control** layer on top, plus a one-time data re-keying.

## 3. Target architecture (proposed)

```
Browser ──magic link──► Supabase Auth ──sets cookies──► getSupabaseServer()
   │                                                          │
   ▼                                                          ▼
/stagecraft/* (middleware gate) ──► route handlers ──► RLS-scoped queries (auth.uid())
```

1. **Login:** email → Supabase `signInWithOtp` (magic link) → callback route exchanges the code → SSR cookies set.
2. **Session:** `@supabase/ssr` cookie session; `getSupabaseServer().auth.getUser()` is the server-side source of truth.
3. **Authorization:** RLS policies keyed on `auth.uid()`; user-data routes use the **anon SSR client** so the database — not app code — enforces ownership (defense in depth).
4. **Identity model:** single-user allowlist (John) — auth secures access and enables per-user rows; not opening public signup.

## 4. Key decisions (need your ruling)

Each lists options + a recommendation. These shape the eventual executable plan.

### D1 — Identity model: allowlist vs open signup
- **A (recommended):** Single-user **email allowlist** (only `jsviju@gmail.com`). Magic link to any other address is rejected. Keeps it a personal tool; minimal attack surface.
- **B:** Open signup (any email). Needed only if Stagecraft becomes multi-user — out of current roadmap.
→ *Recommend A.*

### D2 — Route client strategy for user data
- **A (recommended):** Switch Stagecraft user-data routes from the admin client to the **SSR anon client**, add `auth.uid()` RLS policies → DB enforces ownership. Admin client retained only for privileged/maintenance ops.
- **B:** Keep admin client, scope every query by a server-resolved `user_id`. Faster to ship but app-code-enforced only (one missed filter = data leak); RLS stays inert.
→ *Recommend A (defense in depth; RLS becomes real).*

### D3 — Sentinel → real user migration
- **A (recommended):** **One-time claim** — on John's first authenticated login, reassign all sentinel-`user_id` rows to his `auth.uid()` (idempotent server action, guarded so it runs once). Preserves all existing history.
- **B:** Start fresh under the new uid; sentinel rows abandoned (export/re-import if needed).
→ *Recommend A.*

### D4 — Route protection mechanism
- **A (recommended):** **Middleware** gate on `/stagecraft/*` (redirect unauthenticated → login), plus `getUser()` checks in mutating API routes. Note: Stagecraft is a single client SPA at `/stagecraft` — middleware guards the page + its `/api/stagecraft/*` calls.
- **B:** Per-route checks only (no middleware). More repetition, easier to miss a route.
→ *Recommend A.* (Independent of the existing PI middleware gate — coexist, don't merge.)

### D5 — Secrets posture under auth
- **A (recommended):** **Unchanged from 3.1** — keys via server env on serverless; the gated paste-UI stays. Auth doesn't change key custody for a single-user tool.
- **B:** Per-user secrets table. Only meaningful for multi-user — defer.
→ *Recommend A.*

### D6 — Backend coupling: does 3.2 force the Supabase cutover?
- **A (recommended):** Auth requires the Supabase backend for *auth*, but Stagecraft data can still run on either store. However, RLS-enforced per-user data realistically implies `STAGECRAFT_STORE=supabase`. Treat **3.2 enablement = the deliberate cutover** (the explicit deployment decision deferred in 3.1).
- **B:** Keep file store for data while auth runs on Supabase — awkward (file store has no user concept). Not recommended.
→ *Recommend A — 3.2 is the moment fileStore-default ends in production.*

## 5. RLS policy design (sketch, pending D2)

```sql
-- After migrating sentinel rows to auth.uid():
create policy sc_profiles_rw on stagecraft_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_sessions_rw on stagecraft_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_config_rw on stagecraft_config
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```
Shipped as `006_stagecraft_auth.sql`. The sentinel default on `user_id` is dropped/replaced once rows are claimed.

## 6. Security considerations
- **Allowlist enforcement** server-side at the callback (don't rely on hiding the login form).
- **Cookie session**: httpOnly, secure, SameSite — handled by `@supabase/ssr`; verify config.
- **Service-role key** stays server-only; admin client usage shrinks to privileged paths only (D2-A).
- **CSRF**: state-changing `/api/stagecraft/*` routes rely on SameSite cookies; confirm or add token.
- **The claim migration** (D3-A) must be idempotent and authorize that the caller is the allowlisted user before re-keying sentinel rows.
- **Dev-mock parity**: `getSupabaseServer` already returns `dev-user-id` with no creds — ensure local dev still works unauthenticated or with a mock user.

## 7. Risks & open questions
| # | Item | Note |
|---|---|---|
| R1 | RLS lockout | A wrong policy locks John out of his own data. Stage on a branch; verify with `:verify`-style parity before cutover. |
| R2 | Sentinel claim run twice / by wrong user | Guard with allowlist check + idempotent reassignment keyed on sentinel constant. |
| R3 | Two auth systems (PI custom + Supabase) | Confirm they don't share cookies/scope; document the boundary. |
| R4 | Magic link deliverability | Supabase email vs custom SMTP — decide before launch. |
| Q1 | Local dev login | Magic link needs email; provide a dev bypass / mock user for local work. |
| Q2 | Logout + session expiry UX | Define redirect + expiry behavior. |

## 8. Proposed phase outline (for the eventual executable plan — NOT yet tasks)
1. `006_stagecraft_auth.sql` — RLS policies + sentinel handling.
2. Auth client + login/callback/logout routes + allowlist enforcement.
3. Middleware gate for `/stagecraft/*`.
4. Route handlers → SSR anon client (D2-A); admin client scoped to privileged ops.
5. Idempotent sentinel→`auth.uid()` claim action.
6. Dev-mock / local-login path.
7. Verification: RLS parity, login E2E, claim idempotency, side-by-side with 3.1 data, rollback.

## 9. Status
Awaiting your decisions on **D1–D6** and approval of this review. On approval I'll produce the executable 3.2 plan (schema, migration order, rollback, verification matrix) — and only then implement. **No 3.2 implementation begins until that plan is approved.**
