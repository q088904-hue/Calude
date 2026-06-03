# Initiative 3.2 — Authentication (Executable Plan)

> **Planning only — no implementation until approved.** REQUIRED SUB-SKILL on execution: superpowers:executing-plans. Commit per phase; verification gate after every phase; explicit merge gate at the end.

**Approved decisions:** D1 allowlist, single account `jsviju@gmail.com` · D2 SSR client + `auth.uid()` + RLS (DB-enforced) · D3 one-time idempotent sentinel claim · D4 proxy gate for `/stagecraft/*` + route-level checks on mutations · D5 secrets stay env-based (no DB keys, no user-managed keys) · D6 auth rollout = the Supabase cutover · **Dev bypass** `STAGECRAFT_DEV_AUTH=1` + `STAGECRAFT_DEV_USER` (disabled in production) · **Email** Supabase built-in magic link (no custom SMTP).

## Grounding facts (verified, do not re-derive)
- **Middleware = `src/proxy.ts`** (Next 16 renamed convention). It already gates `/pi/*` + `/api/pi/*` via the PI signed `pi_session` cookie, matcher `["/pi/:path*","/api/pi/:path*"]`. **One proxy only** → extend it; keep PI and Stagecraft auth independent (different cookies, different branches).
- SSR clients already wired: `getSupabaseServer()` (anon, cookie via `next/headers`, dev-mock returns `dev-user-id`), `src/lib/supabase/client.ts` (browser). Admin/service-role: `getSupabaseAdmin()`.
- 3.1 left: `stagecraft_*` rows on sentinel `00000000-…`, RLS **enabled, no policies**; `supabaseStore` uses **admin + SENTINEL**; file store is default; `STAGECRAFT_STORE` selector.
- Mutating `/api/stagecraft/*` routes (need route-level guard): `brief, grade, intro, memorize(POST), negotiate, plan, portfolio, recruiter, report, session(POST), star, transcribe, config(POST), profile(POST), secrets(POST/DELETE)`. Read-only: `history, patterns, export, state, config(GET), profile(GET), session(GET), memorize(GET)` (covered by proxy gate + RLS).
- Stagecraft is a single SPA at `/stagecraft` (+ sub-pages). Gate everything under `/stagecraft` except login + auth callback.

---

## 1. Schema migration — `supabase/migrations/006_stagecraft_auth.sql`
Activates per-user ownership. Run AFTER the 005 data is in Supabase; the claim (Phase 5) reassigns sentinel rows.

```sql
-- Drop the sentinel default so authed inserts must set a real user_id
-- (the RLS with-check below would otherwise reject sentinel inserts silently).
alter table stagecraft_profiles alter column user_id drop default;
alter table stagecraft_sessions alter column user_id drop default;
alter table stagecraft_config   alter column user_id drop default;

-- Owner-only RLS keyed on the authenticated user.
create policy sc_profiles_rw on stagecraft_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_sessions_rw on stagecraft_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_config_rw on stagecraft_config
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```
**Down:** `drop policy sc_*_rw …;` + re-add the sentinel `default '0000…'`. (Data preserved; 3.1 JSON + export remain as the file-store fallback.)

Supabase dashboard (config, not SQL): enable Email provider / magic link; set Site URL + redirect allowlist to the deploy origin + `http://localhost:3100` for local.

## 2. Auth module — `src/lib/stagecraft/auth.ts`
Single source for identity, allowlist, and the dev bypass.
```ts
export const STAGECRAFT_ALLOWLIST = ["jsviju@gmail.com"];          // D1
export const DEV_USER_ID = "00000000-0000-0000-0000-0000000000d5"; // stable dev uuid
export function devAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.STAGECRAFT_DEV_AUTH === "1";
}
export function isAllowed(email?: string|null): boolean {
  return !!email && STAGECRAFT_ALLOWLIST.includes(email.toLowerCase());
}
// Resolves the current user (or null) for route handlers / server components.
export async function resolveStagecraftUser(): Promise<{ id: string; email: string } | null> {
  if (devAuthEnabled()) return { id: DEV_USER_ID, email: process.env.STAGECRAFT_DEV_USER ?? STAGECRAFT_ALLOWLIST[0] };
  const { data } = await getSupabaseServer().auth.getUser();
  const u = data.user;
  return u && isAllowed(u.email) ? { id: u.id, email: u.email! } : null;
}
// Guard helper for mutating routes: returns the user or a 401 Response.
export async function requireStagecraftUser(): Promise<{ id:string; email:string } | Response> { … }
```
**Fail-closed:** `devAuthEnabled()` hard-checks `NODE_ENV !== "production"`, so the bypass can never authenticate in prod even if the env var leaks.

## 3. Middleware design — extend `src/proxy.ts`
Add a Stagecraft branch + matcher; leave the PI branch untouched.
- **Matcher:** add `"/stagecraft/:path*"`, `"/api/stagecraft/:path*"` to the existing PI entries.
- **Public Stagecraft paths** (no session): `/stagecraft/login`, `/api/stagecraft/auth/callback`, `/api/stagecraft/auth/login`, `/api/stagecraft/auth/logout`.
- **Branch by prefix:** PI paths → existing `pi_session` check (unchanged). Stagecraft paths → Supabase session check via a request-scoped SSR client (`createServerClient` with `req.cookies` + response cookie writeback — the standard `@supabase/ssr` middleware pattern; edge-safe). Dev bypass (`devAuthEnabled()`) short-circuits to allow.
- **Deny behavior:** `/api/stagecraft/*` → 401 JSON; `/stagecraft/*` pages → redirect `/stagecraft/login?next=<path>`.
- Allowlist is re-checked here (email from the session) so a valid-but-unlisted Supabase user is still denied.

## 4. Login / callback / logout
- **`src/app/stagecraft/login/page.tsx`** (public): email field → browser client `supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: <origin>/api/stagecraft/auth/callback }})`. Shows "check your email". Pre-rejects non-allowlisted email client-side (UX only).
- **`src/app/api/stagecraft/auth/callback/route.ts`** (public): exchange `code` → session (`exchangeCodeForSession`), **enforce allowlist server-side** (sign out + redirect to login with error if not allowed), then **run the sentinel claim (Phase 5)**, then redirect to `/stagecraft`.
- **`src/app/api/stagecraft/auth/logout/route.ts`**: `auth.signOut()` → clear cookies → redirect `/stagecraft/login`.
- Optional `auth/login` route only if we prefer server-initiated OTP; default is client `signInWithOtp`.

## 5. Sentinel claim flow — `src/lib/stagecraft/claimSentinel.ts`
One-time, idempotent re-keying of 3.1 data to the real user. Uses the **admin** client (service-role) because reassigning `user_id` across owners must bypass RLS.
```ts
export async function claimSentinelRows(userId: string, email: string) {
  if (!isAllowed(email)) return { claimed: 0, skipped: "not-allowed" };
  // idempotent: only rows still on the sentinel are moved
  for (const t of ["stagecraft_profiles","stagecraft_sessions","stagecraft_config"])
    await admin.from(t).update({ user_id: userId }).eq("user_id", SENTINEL_USER_ID);
  return { claimed: … };
}
```
Invoked from the auth callback after allowlist passes. Running twice is a no-op (no sentinel rows remain). Reversible (admin can move uid→sentinel for rollback).

## 6. Route migration strategy
- **Store (central change):** `supabaseStore` switches from `admin + SENTINEL` to the **SSR anon client** (`getSupabaseServer()`) with `user_id = resolveStagecraftUser().id` on writes; reads rely on RLS (`auth.uid()`), so list/get auto-scope. Admin client retained ONLY for `claimSentinelRows`. Dev bypass: when `devAuthEnabled()`, the store still typically runs on the **file backend** (default) so user id is irrelevant; if `STAGECRAFT_STORE=supabase` locally with dev-auth, the store falls back to admin scoped by `DEV_USER_ID` (documented dev-only path — RLS not exercised; real RLS is verified in staging with a true session).
- **Mutating routes (~15):** add 2-line guard `const u = await requireStagecraftUser(); if (u instanceof Response) return u;` at the top. Read routes unchanged (proxy + RLS suffice).
- **Secrets routes:** keep the existing `isServerless()` 409 behavior (D5 — env-only); add the user guard for consistency. No DB key storage introduced.
- **No UI/workflow/countdown changes** beyond adding the login page + a header sign-out affordance (small, additive).
- **File backend stays default**; selecting it bypasses all RLS/auth-store logic (auth still gates the page via proxy, but data is local) — this keeps local dev frictionless.

## 7. Rollback strategy
- **Runtime (fastest):** redeploy the pre-3.2 build and set `STAGECRAFT_STORE=file` → unauthenticated, file-backed, instantly. (Auth+Supabase are coupled per D6, so a true rollback is a redeploy, not just an env flip.)
- **Proxy:** remove the `/stagecraft` matcher entries → gate lifts without touching PI.
- **Schema:** run 006 down (drop policies, restore sentinel default). Rows already claimed to the uid remain valid; the 3.1 JSON/export is the file-store fallback.
- **Claim:** reversible via admin (uid→sentinel) if ever needed.
- No data loss in any direction (3.1 JSON retained + export endpoint).

## 8. Verification matrix
| Check | Method |
|---|---|
| tsc / eslint (touched) / build / check-answers 61/61 | CLI |
| 006 applied: policies present, sentinel default dropped | SQL |
| RLS enforced: anon (no session) → 0 rows; valid session → own rows only | curl + second test uid in staging |
| Magic-link E2E: request → callback → session cookie → `/stagecraft` reachable → logout clears | browser (staging) |
| Allowlist: non-listed email rejected at callback (signed out, error) | staging |
| Proxy: unauth `/stagecraft/*` → redirect login; `/api/stagecraft/*` → 401; PI gate unaffected; other paths untouched | curl |
| Sentinel claim: sentinel rows → uid; **idempotent** (2nd run no-op); only allowlisted user | run twice |
| Mutating routes return 401 without session | curl each |
| Post-claim parity with 3.1: history / profile / config / export identical for John | side-by-side vs archived 3.1 results |
| Dev bypass: `STAGECRAFT_DEV_AUTH=1` local → access without email; `NODE_ENV=production` → bypass disabled (fail-closed) | local + prod-mode run |
| Rollback: 006 down + file store + proxy matcher revert → app usable unauthenticated | staging |

## 9. Phase order (commit per phase, gate after each)
1. `006_stagecraft_auth.sql` (+ enable Supabase email provider).
2. `auth.ts` (allowlist, resolve, requireUser, dev bypass).
3. `proxy.ts` extension (matcher + Stagecraft branch).
4. Login page + callback + logout + header sign-out.
5. `claimSentinel.ts` + wire into callback.
6. `supabaseStore` → SSR+uid; admin only for claim.
7. Route guards on the ~15 mutating routes.
8. Verification (matrix) + rollback rehearsal + report.

## 10. Out of scope (held)
3.3 cross-device sync, 3.4 reminders, multi-user/teams, per-user API keys, billing/entitlement rework. No production enablement of the dev bypass.

## 11. Status
Awaiting approval of this plan. On approval I execute phases 1–8 with a verification gate after each and stop at the merge gate. **No implementation begins until approved.**
