# Initiative 3.2 — Authentication: Verification Report (at merge gate)

**Branch:** `stagecraft-auth` (8 commits, not merged). fileStore remains default; auth/Supabase enabled only when deployed with creds + `STAGECRAFT_STORE=supabase`.

## Files changed
| File | Change |
|---|---|
| `supabase/migrations/006_stagecraft_auth.sql` | **new** — owner-only RLS on stagecraft_*; drop sentinel default; down section |
| `src/lib/stagecraft/authShared.ts` | **new** — edge-safe allowlist, `DEV_USER_ID`, `isAllowed`, `devAuthEnabled` (fail-closed) |
| `src/lib/stagecraft/auth.ts` | **new** — `resolveStagecraftUser`, `requireStagecraftUser`; re-exports shared |
| `src/proxy.ts` | extended — `/stagecraft` + `/api/stagecraft` matcher; Supabase-session branch; PI gate untouched |
| `src/app/stagecraft/login/page.tsx` | **new** — magic-link sign-in (signInWithOtp) |
| `src/app/api/stagecraft/auth/callback/route.ts` | **new** — code exchange + allowlist + sentinel claim |
| `src/app/api/stagecraft/auth/logout/route.ts` | **new** — signOut + redirect |
| `src/components/stagecraft/StagecraftHeader.tsx` | + sign-out link |
| `src/lib/stagecraft/claimSentinel.ts` | **new** — idempotent admin re-key of sentinel rows |
| `src/lib/stagecraft/supabaseStore.ts` | store → SSR client + `auth.uid()` (RLS-enforced); admin only for claim; dev/no-session fallbacks |
| `src/app/api/stagecraft/*/route.ts` (15) | `requireStagecraftUser()` guard on every mutating handler |
| `src/lib/supabase/server.ts` | **fix** — dev-mock must not be thenable (async client hung on no-creds path) |

## Auth verification (local, production build)
| Check | Result |
|---|---|
| `/stagecraft` unauth → 307 redirect `/stagecraft/login?next=…` | ✅ |
| `/api/stagecraft/history` unauth → 401 | ✅ |
| `/api/stagecraft/grade` POST unauth → 401 | ✅ |
| `/stagecraft/login` public → 200 | ✅ |
| `/api/stagecraft/auth/logout` → 307 → login | ✅ |
| `/api/stagecraft/auth/callback?code=…` (not-allowed) → 307 → login?error=not-allowed | ✅ |
| PI gate intact: `/pi/govern` → 307 → `/pi/login` | ✅ |
| Non-gated untouched: `/` 200, `/meentrack` 200 | ✅ |
| Dev bypass (`next dev` + `STAGECRAFT_DEV_AUTH=1`): `/stagecraft` 200; mutating routes admit dev user (200/409, not 401) | ✅ |
| **Fail-closed**: `next start` (production) + `STAGECRAFT_DEV_AUTH=1` → still gated (307/401) | ✅ |
| tsc / eslint / build / check-answers 61/61 | ✅ |

## Persistence / workflow preservation (local, file backend default)
| Check | Result |
|---|---|
| History (file store) → 3 sessions, total 3, totalQuestions 8 (identical to 3.1) | ✅ |
| Export (file store) → 10 sessions incl. items, profile "John Viju" | ✅ |
| Config GET/POST round-trip (countdown source) unchanged | ✅ |
| fileStore remains default (no `STAGECRAFT_STORE` set) | ✅ |

## Bug found & fixed during verification
`getSupabaseServer()` is async; the no-credentials dev-mock returned a function for **every** property, including `then`, making the proxy *thenable* → the runtime tried to unwrap the returned "promise" and hung forever. New auth routes were the first to `await getSupabaseServer()` on that path, exposing it. Fixed: mock returns `undefined` for `then/catch/finally` and now implements `signOut`/`exchangeCodeForSession`/`signInWithOtp` as no-ops. (Also hardens PI/subscription dev paths.)

## Rollback validation
- **Path intact:** all 3.2 changes are additive (new files + proxy extension + store `ctx()` + route guards). Reverting the 8 commits restores 3.1 exactly; the 006 down section restores schema; 3.1 JSON + export are retained.
- **Runtime rollback:** redeploy pre-3.2 build + `STAGECRAFT_STORE=file` → unauthenticated, file-backed (this exact file-backend-serves-data path was proven in the 3.1 archive).
- **Proxy-only lift:** removing the `/stagecraft` matcher entries lifts the gate without touching PI.

---

## ⚠️ Live-only items — require Supabase credentials (externally blocked here)
The following could **not** be executed in this environment (no creds, no reachable project — same constraint as 3.1). They must be run by the operator before merge. I will not fabricate results.

### Operator runbook
```bash
git checkout stagecraft-auth
export NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=…
# 1. Enable Email/Magic-link provider in Supabase dashboard; set Site URL + redirect allowlist
#    (deploy origin + http://localhost:3100).
# 2. Apply schema (005 already applied in 3.1):
psql "$SUPABASE_DB_URL" -f supabase/migrations/006_stagecraft_auth.sql
```

**A. Export fidelity BEFORE claim** (admin view of the sentinel-owned 3.1 data = baseline; export omits user_id, so this equals the 3.1 archive export):
```bash
# Baseline = the 3.1 export already archived, or re-read via file backend:
STAGECRAFT_STORE=file npx next start -p 3100 &      # 3.1 data
curl -s localhost:3100/api/stagecraft/export | sed 's/"exportedAt":"[^"]*"/"exportedAt":"X"/' > /tmp/export-before.json
```

**B. Magic-link E2E + claim:** load `/stagecraft` on the deployed/Supabase build → redirected to login → request link for `jsviju@gmail.com` → open link → callback exchanges, **allowlist passes**, **sentinel claim runs**, lands on `/stagecraft`.

**C. Row-ownership change (proves the claim):**
```sql
select user_id, count(*) from stagecraft_sessions group by user_id;
-- expect: 0 rows on 00000000-… ; N rows on the real auth.uid()
select count(*) from stagecraft_profiles where user_id = '00000000-0000-0000-0000-000000000000'; -- 0
```

**D. Export fidelity AFTER claim** (John's authenticated, RLS-scoped export):
```bash
STAGECRAFT_STORE=supabase npx next start -p 3200 &  # authenticated session cookie required
curl -s localhost:3200/api/stagecraft/export | sed 's/"exportedAt":"[^"]*"/"exportedAt":"X"/' > /tmp/export-after.json
diff /tmp/export-before.json /tmp/export-after.json && echo "EXPORT FIDELITY: structure + content IDENTICAL"
```
**Expected:** identical. **Structural proof of why:** the export body is `{version, exportedAt, profile, config, sessions}` — none of these contain `user_id`. The claim mutates only the `user_id` column. Therefore export content is invariant under the claim; only DB row ownership changes (proven by C).

**E. RLS enforcement:**
```sql
-- as anon (no JWT): returns 0 rows
set role anon; select count(*) from stagecraft_sessions; reset role;
```
And via the app: a second (non-allowlisted) Supabase user sees 0 Stagecraft rows.

**F. Claim idempotency:** sign out, sign in again → callback re-runs claim → 0 sentinel rows remain → no-op (counts unchanged).

### Live verification checklist (operator to confirm)
- [ ] 006 applied; 3 policies present; sentinel default dropped
- [ ] Magic link delivered + login succeeds for allowlisted email; non-allowlisted rejected
- [ ] Row ownership changed: sentinel → 0, auth.uid() → N (C)
- [ ] Export structure unchanged (D diff clean)
- [ ] Export content unchanged (D diff clean)
- [ ] RLS: anon/other user → 0 rows (E)
- [ ] Claim idempotent on second login (F)
- [ ] Post-claim history/profile/config/countdown match the 3.1 archive

## Status
Stopped at merge gate. **Not merged.** Awaiting operator completion of the live runbook (A–F) and approval to merge.
