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
| Mobile | P2 | obs | Hub overflows horizontally at **narrow mobile (≤~414px)**; scrollWidth 600 at 375 | `/stagecraft` (hub `page.tsx`) | A `div.flex.items-center` row measures 414px and the page scrolls to 600px. `grain-overlay` (fixed `inset:0`, decorative) reports the inflated width but is a **symptom, not the cause**. **Refined (pass 2): tablet (768) has NO overflow — mobile-only.** *Needs a focused layout pass* to find the unwrapped flex row — NOT a blind `overflow-x:hidden`. Left as obs deliberately. |
| Mobile | P3 | obs | Horizontal overflow on interior pages (414 vs 375) | `/stagecraft/quickfire` (likely all interior) | Same root cause as above (unwrapped row), milder. Bundle with the hub layout pass. |
| Reliability | P2 | obs | React hydration mismatch (8× on load) — **root site, OUT OF STAGECRAFT SCOPE** | `/` (Datamatics homepage) → `<HeroLanding>` (`src/app/page.tsx`, framer-motion) | Re-traced: `HeroLanding` is the Datamatics root `/` hero, not a Stagecraft page. The 8 errors came from the initial `/` load. Logged for awareness; **not a Stagecraft stabilization item** — belongs to a root-site cleanup track. |
| Content | P3 | **done** | All Stagecraft routes shared the generic root `<title>` | `src/app/stagecraft/layout.tsx` | FIXED: segment `metadata` sets default "Stagecraft" + `"%s · Stagecraft"` template. Per-page titles (e.g. "Quickfire · Stagecraft") remain a follow-up since pages are client components. |
| UX | P3 | **done** | No "Sign out" on the hub/landing header | `src/app/stagecraft/page.tsx` | FIXED: sign-out link added to the hub header right cluster (matches interior `StagecraftHeader` style). |
| Reliability | P3 | obs | `setState` called synchronously within an effect (cascading renders) | `src/app/stagecraft/page.tsx:~1111` | Surfaced by ESLint (`react-hooks`), pre-existing. Not build-blocking. *Small fix candidate:* move the update into an event handler or guard it; verify no render loop. Needs care in the large hub file. |
| UX / Reliability | P2 | **done** | Data export had **no UI entry point** | `src/app/stagecraft/profile/page.tsx` | FIXED: "Your data → ↓ Export my data (JSON)" link added to the profile, pointing at `/api/stagecraft/export` (downloads via attachment header). Verified: link renders in DOM, endpoint returns 200 + `Content-Disposition`. |
| Accessibility | P3 | **done** | History session rows lacked `aria-expanded` | `src/app/stagecraft/history/page.tsx` | FIXED: session expander `<button>`s now carry `aria-expanded={open}` + `aria-controls`, with a matching `id` on the panel. Verified: attributes render bound to the open state. (Note: `/stagecraft/history/[id]` direct route still not linked from the list — left as a confirm-intent item, not addressed.) |
| UX | P4 | obs | App ignores OS `prefers-color-scheme` (dark is toggle-only) | global theme | Emulated dark scheme did not switch the theme; dark mode only via the header toggler. Likely intentional per design rules ("don't default to dark") — **confirm intent**, no action assumed. |

**Observed-OK (recorded, no action):** all 8 pages load 200 (no error boundary) · config/state/history/export APIs 200 · countdown chip renders correctly (`◷ 8 days left` when date set) · auth gate + dev bypass behave as designed.

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

## Observation pass 1 — 2026-06-04 (dev mode, dev-auth bypass, file store)
**Setup:** `next dev` + `STAGECRAFT_DEV_AUTH=1` on an assigned port; browsed via preview DOM inspection. Auth/persistence flows that need a real Supabase session (live magic-link login/logout, RLS-scoped reads) were **not** re-exercised here — they were verified live during the 3.2 merge gate. This pass covered hub, loop pages, history, profile, export, countdown, and responsive layout.

**Findings → logged as rows OBS in the table above:**
- Mobile P2: hub horizontal overflow at 375px (scrollWidth 600). Repro: load `/stagecraft` at 375px wide → page scrolls horizontally; offender `div.grain-overlay` (600px) + a flex row (414px).
- Mobile P3: same overlay overflows interior pages (`/stagecraft/quickfire`, 414 vs 375).
- Reliability P2: hydration mismatch ×8 in `<HeroLanding>` on `/stagecraft` load (framer-motion subtree). Repro: open `/stagecraft`, check console → "A tree hydrated but some attributes… didn't match".
- Content P3: generic shared `<title>` on all routes.
- UX P3: no sign-out on the hub/landing header.

**Not yet observed (future passes):** real magic-link login/logout UX, Recruiter/STAR/Quickfire *interactive answer* flows (require API keys for grading), profile editing round-trip, export download UX in-browser, history detail pages, tablet/desktop breakpoints, reduced-motion, dark mode. These need a follow-up pass (and AI keys for the grading loop).

## Observation pass 2 — 2026-06-04 (dev mode, dev-auth bypass, file store, AI keys present)
**Setup:** same dev-auth harness; both AI keys configured this time, so the grade loop was exercised. Local data mutated during testing was **restored** afterward (test session removed → 10, profile.json deleted, config reset to `{}`).

**New findings → rows in the table above:** OBS-7 (export has no UI entry point, P2), OBS-8 (history rows lack `aria-expanded`, P3), OBS-9 (ignores `prefers-color-scheme`, P4). OBS-1 refined → mobile-only (tablet clean).

**Observed-OK (recorded, no action):**
- Quickfire **answer→grade flow completes** — Content/English/Delivery scoring + feedback rendered, session counter increments, no errors.
- Profile **edit→save→reload round-trip** persists correctly (file store).
- History renders readiness, score-trend chart, pattern insights, and a clickable session list.
- Dark mode via the header toggler works (`.dark`, bg #0D0D0F); crude contrast scan flagged only 2/124 elements (unconfirmed — verify in a focused a11y pass).
- Tablet (768px): no horizontal overflow.
- Recruiter loads with an answer input; Login page renders its email form.

**Still not observed (harness/keys limits):** full Recruiter/STAR grade interactions, in-browser export download (no UI exists), real magic-link login/logout E2E (verified at the 3.2 merge gate), **reduced-motion** (not emulable through this preview harness — needs a manual OS-level pass), `/stagecraft/history/[id]` direct route, desktop ≥1280 width.

## Next milestone (after stabilization, on approval)
**Stagecraft 3.3 Architecture Review** — cross-device sync semantics · conflict resolution · activity synchronization · offline behavior · retention metrics · analytics instrumentation. Planning only; wait for approval before any implementation planning.
