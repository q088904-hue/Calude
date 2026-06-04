# Initiative 3.2 — Final Merge Report (Authentication)

**Branch:** `stagecraft-auth` — not merged, purely additive over `main` (0 divergence).
**Recommendation: APPROVE for merge.** All eight approval criteria met (local + live).

## Files changed (10 new / modified, + 1 dev-mock fix)
| File | Change |
|---|---|
| `supabase/migrations/006_stagecraft_auth.sql` | owner-only RLS on `stagecraft_*`; drop sentinel default; down section |
| `src/lib/stagecraft/authShared.ts` | edge-safe allowlist / `DEV_USER_ID` / `isAllowed` / `devAuthEnabled` (fail-closed) |
| `src/lib/stagecraft/auth.ts` | `resolveStagecraftUser`, `requireStagecraftUser` |
| `src/proxy.ts` | `/stagecraft` + `/api/stagecraft` matcher + Supabase-session branch; PI gate untouched |
| `src/app/stagecraft/login/page.tsx` | magic-link sign-in |
| `src/app/api/stagecraft/auth/callback/route.ts` | code exchange + allowlist + sentinel claim |
| `src/app/api/stagecraft/auth/logout/route.ts` | sign-out |
| `src/components/stagecraft/StagecraftHeader.tsx` | sign-out link |
| `src/lib/stagecraft/claimSentinel.ts` | idempotent admin re-key of sentinel rows |
| `src/lib/stagecraft/supabaseStore.ts` | SSR client + `auth.uid()` (RLS-enforced); admin only for claim; dev/no-session fallbacks |
| `src/app/api/stagecraft/*/route.ts` ×15 | `requireStagecraftUser()` guard on every mutating handler |
| `src/lib/supabase/server.ts` | fix: dev-mock must not be thenable (async client hung on no-creds path) |

## Migration results (live, project `xxgbehlzzolomuoumjog`)
- `005_stagecraft_core.sql` + `006_stagecraft_auth.sql` applied via SQL Editor. Verified: 3 tables (`stagecraft_profiles/sessions/config`) + 3 policies (`sc_*_rw`) present; RLS enabled.
- Data migrated (`stagecraft-migrate-to-supabase.mjs`): config + **10 sessions** upserted. 3.1 parity re-verify: **Profile / Config / Session / Export = ALL PASS** (10 local / 10 remote).

## Claim results (live)
- Magic-link login by operator (`jsviju@gmail.com`) → callback exchanged, allowlist passed, **sentinel claim ran**.
- Owner uid: `d9dbd0c1-1c28-4280-8a85-ddea66b0e45c`.

## Row-count / ownership transfer (actual output)
```
BEFORE claim:  stagecraft_sessions 10 rows → {sentinel: 10};  stagecraft_config 1 → {sentinel: 1};  profiles 0
AFTER  claim:  stagecraft_sessions 10 rows → {d9dbd0c1…: 10};  stagecraft_config 1 → {d9dbd0c1…: 1};  profiles 0
sentinel sessions = 0   |   uid sessions = 10        ✓ ownership transferred
```

## Claim idempotency (actual output)
```
re-run claim: profiles moved 0, sessions moved 0, config moved 0
total rows moved on re-run: 0  → NO-OP ✓ idempotent
```

## RLS verification (actual output — anon key, no session)
```
anon stagecraft_profiles: status=200 rows=0
anon stagecraft_sessions: status=200 rows=0
anon stagecraft_config:   status=200 rows=0     ✓ RLS denies non-owner
```
Authenticated reads confirmed working by operator (history page showed sessions).

## Export-fidelity verification (actual output — before vs after claim)
```
before bytes: 18059   after bytes: 18059
EXPORT CONTENT IDENTICAL: ✓ YES
```
Structure + content unchanged across the claim; only DB row ownership changed (export body carries no `user_id`).

## Auth verification (local, prod + dev builds)
- Unauth `/stagecraft` → 307 login; `/api/stagecraft/*` → 401; login/callback/logout work; PI gate intact; `/`, `/meentrack` untouched.
- Dev bypass (`next dev` + `STAGECRAFT_DEV_AUTH=1`) admits the dev user; **fail-closed** under `next start` (production) even with the flag set.
- tsc / eslint / build / check-answers 61/61 clean.

## Rollback validation
- Branch purely additive (9 commits ahead, 0 divergent); `main`'s `proxy.ts` has no stagecraft gate.
- `006` has a down section; 3.1 file data retained; runtime rollback = redeploy pre-3.2 + `STAGECRAFT_STORE=file`.

## Approval criteria — final
| Criterion | Result |
|---|---|
| Migration successful | ✅ |
| Login successful | ✅ (operator-confirmed) |
| Claim successful | ✅ |
| Claim idempotent | ✅ |
| RLS enforced | ✅ |
| Export unchanged | ✅ |
| Ownership transferred | ✅ |
| Rollback validated | ✅ |

**Recommendation: APPROVE merge of Initiative 3.2 to `main`.**

Post-merge operational notes:
- Production cutover (enable `STAGECRAFT_STORE=supabase` + auth) remains an explicit deployment decision; fileStore stays the default until then.
- `STAGECRAFT_DEV_AUTH` must never be set in production (fail-closed regardless).
- Out of scope / not started: 3.3 cross-device sync, 3.4 reminders, multi-user, monetization.
