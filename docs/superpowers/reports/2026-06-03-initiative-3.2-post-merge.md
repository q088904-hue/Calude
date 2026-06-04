# Initiative 3.2 — Post-Merge Report ✅ COMPLETE

## Merge
- **Merge commit:** `63a9e32` — `merge: Initiative 3.2 — Supabase Magic Link auth (allowlist, RLS, sentinel claim)`
- Strategy: `--no-ff` (history preserved). Feature branch `stagecraft-auth` deleted post-verification.
- `main` now contains Initiative 3.2; fileStore remains the default backend.

## Files changed (merge diff: 28 files, +777 / −65)
- **Schema:** `supabase/migrations/006_stagecraft_auth.sql`
- **Auth core:** `src/lib/stagecraft/authShared.ts`, `auth.ts`, `claimSentinel.ts`
- **Gate:** `src/proxy.ts` (stagecraft branch added; PI gate untouched)
- **Flows:** `src/app/stagecraft/login/page.tsx`, `src/app/api/stagecraft/auth/{callback,logout}/route.ts`, header sign-out
- **Store:** `src/lib/stagecraft/supabaseStore.ts` (SSR + `auth.uid()`), `src/lib/supabase/server.ts` (dev-mock thenable fix)
- **Guards:** 15 mutating `src/app/api/stagecraft/*/route.ts`
- **Docs:** auth verification + final merge reports

## Verification summary (post-merge, on `main`)
| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| ESLint (3.2 surface) | ✅ clean |
| `npm run build` | ✅ compiled |
| Coverage / `check-answers` | ✅ 61/61 |
| Auth gate `/stagecraft` → 307 login | ✅ |
| `/api/stagecraft/history` → 401 (no session) | ✅ |
| `/api/stagecraft/export` → 401 (no session) | ✅ |
| `/stagecraft/login` public → 200 | ✅ |
| PI gate `/pi/govern` → `/pi/login` | ✅ (unchanged) |

## Live verification (pre-merge, project `xxgbehlzzolomuoumjog`) — recap
Migration 005+006 applied · 10 sessions migrated · magic-link login OK · sentinel claim transferred ownership `sentinel→d9dbd0c1…` (sessions 0→10) · claim idempotent (re-run moved 0) · RLS denies anon (0 rows) · **export fidelity byte-identical (18059 == 18059)**.

## Authentication status
- **Live and verified** on the Supabase project. Magic-link login, allowlist (`jsviju@gmail.com`), SSR `auth.uid()` RLS ownership, and the one-time sentinel claim all confirmed.
- History / export / authenticated reads function through RLS (operator-confirmed); unauthenticated access is correctly blocked at the proxy.

## Deployment notes
- **fileStore remains the default backend.** Stagecraft runs unauthenticated on local file storage unless `STAGECRAFT_STORE=supabase` is set.
- **Supabase cutover is an explicit deployment decision** — enabling it activates auth + per-user RLS persistence. Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in the deploy env, plus the Supabase email provider + redirect allowlist configured.
- **`STAGECRAFT_DEV_AUTH` must never be enabled in production** — it is fail-closed on `NODE_ENV==='production'`, but should not be set regardless.
- **Rollback:** redeploy pre-3.2 + `STAGECRAFT_STORE=file`; `006` has a down section; 3.1 JSON + export retained.

## Status: Initiative 3.2 COMPLETE
Not started (await a new approved planning cycle): 3.3 cross-device sync, 3.4 reminders, multi-user support, monetization.
