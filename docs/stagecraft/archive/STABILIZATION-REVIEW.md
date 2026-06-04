# Stagecraft Stabilization Review

**Date:** 2026-06-04 · **Inputs:** Observation passes 1 & 2 (`STABILIZATION-BACKLOG.md`) · **Mode:** Stabilization (no architecture/persistence/auth/schema/roadmap changes).

## Summary
Two observation passes covered the full surface: hub, Quickfire (answer→grade), Recruiter, STAR, History (+detail), Profile edit/save/reload, Export, Login/logout, plus responsive (mobile/tablet), dark mode. **The core product works** — grade loop, persistence round-trip, history analytics, auth gating, dark mode all function. Findings are polish/robustness, not breakage. **9 findings**; 2 already fixed.

## Health snapshot (observed-OK)
Quickfire grade loop ✅ · Profile round-trip ✅ · History + trend chart ✅ · Dark mode (toggler) ✅ · Tablet layout ✅ · auth gate + dev bypass + fail-closed ✅ · all 8 pages 200, no error boundaries ✅.

## Findings & priority
| ID | Cat | Sev | Status | One-line | Fix scope |
|----|-----|-----|--------|----------|-----------|
| OBS-4 | Content | P3 | ✅ done | Generic shared `<title>` | done (segment metadata) |
| OBS-5 | UX | P3 | ✅ done | No sign-out on hub | done (header link) |
| OBS-7 | UX/Reliability | **P2** | open | **Export has no UI entry point** | Small — add "Export my data" link → `/api/stagecraft/export` |
| OBS-1 | Mobile | **P2** | open | Hub horizontal overflow at ≤~414px (tablet clean) | Medium — focused layout pass to find the unwrapped 414px flex row (no blind clip) |
| OBS-2 | Mobile | P3 | open | Same narrow-mobile overflow on interior pages | Bundle with OBS-1 |
| OBS-6 | Reliability | P3 | open | `setState` synchronously in effect (`page.tsx:~1111`) | Small-medium — move to handler/guard; verify no loop |
| OBS-8 | A11y | P3 | open | History expanders lack `aria-expanded` | Small — add ARIA state; consider linking `/history/[id]` |
| OBS-9 | UX | P4 | open | Ignores `prefers-color-scheme` (toggle-only) | None unless intent changes — **confirm intent** |
| OBS-3 | Reliability | P2 | out-of-scope | Hydration mismatch in **root `/` HeroLanding** | Datamatics root site, not Stagecraft — separate track |

## Recommended fix order (within Stabilization Mode)
1. **OBS-7 (P2, small, high value)** — restore data portability/backup access. Quick win.
2. **OBS-8 (P3, small)** — `aria-expanded` on history rows; cheap a11y correctness.
3. **OBS-1/OBS-2 (P2/P3, medium)** — dedicated narrow-mobile layout session for the hub/interior overflow; the highest-impact UX issue but needs care (not a blind clip).
4. **OBS-6 (P3)** — fix the effect-setState pattern with verification it doesn't regress the hub loop.
5. **OBS-9 (P4)** — product decision only; no code unless you want auto dark.
6. **OBS-3** — hand to a Datamatics root-site cleanup track (outside Stagecraft).

## Coverage gaps (recommend a pass 3 if you want them closed before 3.3)
Full Recruiter/STAR grade interactions · in-browser export download (blocked by OBS-7 — no UI) · real magic-link login/logout E2E (was verified at the 3.2 merge gate) · **reduced-motion** (not emulable in this harness — needs a manual OS-level pass) · `/stagecraft/history/[id]` direct route · desktop ≥1280.

## Recommendation
The product is stable. Suggested path: apply the **small safe fixes (OBS-7, OBS-8)** now, schedule the **OBS-1/2 mobile layout session** and **OBS-6** as focused tasks, get a **product call on OBS-9**, and route OBS-3 out of scope. After that the backlog is drained to deliberate-defer items — a reasonable point to open the **3.3 Architecture Review** discussion.

**Holding for your direction** — no fixes beyond OBS-4/5 applied; 3.3 not started.
