# Stagecraft Stabilization Backlog

> **Mode:** Stabilization (post-Initiative-3). Living document.
> **Allowed:** small fixes, observations, backlog maintenance.
> **NOT allowed without an approved planning review:** architecture changes, persistence changes, auth changes, roadmap expansion (3.3 sync, 3.4 reminders, multi-user, monetization, growth).

## How to use
Log observations as they're found (real usage or review). Each item: category · severity · short description · where · suggested small fix (if any). Promote nothing to implementation beyond "small fix" without sign-off.

**Severity:** P1 broken/blocking · P2 notable friction/bug · P3 polish · P4 nice-to-have.
**Status:** `obs` (observation) · `fix-ready` (small safe fix identified) · `done` · `needs-review` (touches a frozen area → requires planning).

| Cat | Sev | Status | Item | Where | Note / suggested small fix |
|---|---|---|---|---|---|

---

## Categories
UX · Accessibility · Performance · Reliability · Content · Mobile · Analytics gaps

---

## Seed observations (from Initiative-3 implementation/verification — code-review level, NOT yet validated by real-user testing)
These are starting points to confirm during a real-usage pass; they are not user-reported yet.

### Reliability
- **R-seed-1** · P3 · obs — The Supabase dev-mock server client was accidentally *thenable* and hung `await getSupabaseServer()` on the no-creds path (fixed in `src/lib/supabase/server.ts` this cycle). No regression guard exists. *Small fix candidate:* a tiny unit assertion that the dev-mock returns `undefined` for `then`/`catch`/`finally`.

### UX
- **UX-seed-1** · P3 · obs — Header **"Sign out"** link (`StagecraftHeader.tsx`) renders unconditionally, including local/file-store mode where there's no real session. Confirm it isn't confusing when auth is off. *Small fix candidate:* hide it when unauthenticated/file-mode.
- **UX-seed-2** · P3 · obs — Login error copy + secrets serverless **409** message: review tone/clarity during real usage (`stagecraft/login/page.tsx`, `api/stagecraft/secrets/route.ts`).

### Performance
- **PERF-seed-1** · P3 · obs — History API supports `?limit/offset` pagination, but the client fetches the full list. Fine at current scale; revisit wiring client pagination only if session counts grow large. (No change now — observation only.)

### Accessibility
- **A11Y-seed-1** · P3 · obs — Login page uses `role="status"`/`role="alert"`; verify focus management + screen-reader announcement on send/error during a real a11y pass.

### Mobile
- **MOB-seed-1** · P3 · obs — Login card + header (with new Sign-out link) not yet visually checked at 320/375px. Confirm no overflow / adequate touch targets.

### Analytics gaps
- **AN-seed-1** · P2 · obs — No instrumentation for: login success/failure, sentinel-claim execution, export usage, or auth-gate redirects. Useful retention/funnel signal for the eventual 3.3 review. (Observation only — no instrumentation added under freeze without review.)

### Content
- *(none yet)*

---

## Pending: real-usage observation pass
A genuine "use Stagecraft as a real user" pass (friction, bugs, performance, onboarding, auth, export/history/profile) has **not** been run yet — it requires direction (and ideally the Supabase-backed build running locally for the auth/persistence surfaces). Findings will be appended above when that pass is authorized.

## Next milestone (after stabilization, on approval)
**Stagecraft 3.3 Architecture Review** — cross-device sync semantics · conflict resolution · activity synchronization · offline behavior · retention metrics · analytics instrumentation. Planning only; wait for approval before any implementation planning.
