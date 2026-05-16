# Stagecraft Visual Overhaul — "Cinematic Editorial"

**Date:** 2026-05-17
**Status:** Approved (brainstorming) — pending spec review → implementation plan

## Goal

Elevate Stagecraft to a premium, cinematic-editorial visual experience inspired by
giganticmedia.net and enerblock.net, with a working dark/light theme, without
sacrificing the deliberately friction-free practice loop that is the product's core.

## Non-Goals / Explicit Rejections

- **"Caveman Claude Code" plugin** — not in the verified plugin registry. An unvetted
  third-party plugin that hooks token/context handling is a security and
  maintainability risk and contradicts the "clean, trustworthy codebase" requirement.
  Token efficiency is achieved via the existing AGENTS.md discipline (grep-before-read,
  scoped diffs, delegated surveys), not a plugin.
- **Live npm dependencies from 21st.dev** — those are copy-in patterns, not a package.
  Selected effects are rebuilt as local, token-aware components (no supply-chain risk).
- **Scroll-jacking / immersive scroll on the practice loop** — contradicts the product
  plan ("zero typing friction, one question on screen, fast loop"). Cinematic motion is
  targeted at showcase surfaces only.
- **Text-arc effect and other 21st.dev components** — no natural home; would be
  decoration, not value. YAGNI.

## Scope (Decision 1 → Option A)

**Full cinematic treatment** (hero motion, scroll-reveal, immersive layout):
`/stagecraft` (landing/home), `/stagecraft/history`, `/stagecraft/patterns`,
`/stagecraft/companies` and `/stagecraft/companies/[id]`.

**Look + theme + micro-motion only** (stays fast, no scroll-jacking):
session loop, `quickfire`, `drill`, `debrief`, `negotiate`, `intro`, `star`,
`recruiter`, `memorize`, `checklist`, `profile`, `plan`.

## Design System

### Typography
- Add **Fraunces** (editorial high-contrast serif) via `next/font/google` as
  `--font-fraunces`, used for hero and section display headers.
- Keep **JetBrains Mono** for labels/system text (existing signature).
- Keep existing sans (Inter/Plus Jakarta) for body. No generic-sans headers.

### Color / Theming
- The `--color-sc-*` tokens currently live in a single dark-only `@theme { … }` block
  (globals.css ~line 388). The rest of the app already uses a `:root` (light) + `.dark`
  (dark) redefinition pattern alongside `@theme inline`.
- **Approach:** convert the sc `@theme` block to `@theme inline` referencing semantic
  custom properties, and define those properties under `:root` (new warm-paper light
  values) and `.dark` (current dark values). `sc-*` Tailwind utilities continue to
  generate unchanged; every component gets light mode for free.
- Light palette: warm paper background (~`#F4EFE4`), deep warm ink (~`#1F1B16`),
  gold accent retained (works on both), red/green status colors retuned for light
  contrast (WCAG AA).

### Motion
- One reusable scroll-reveal primitive (IntersectionObserver-driven, CSS class toggle),
  extending the existing `.sc-entry` stagger system.
- Kinetic hero on the landing surface.
- All motion CSS-driven; honors `prefers-reduced-motion: reduce` (no transforms/opacity
  animation when set).

### Architecture
- New `src/app/stagecraft/layout.tsx` wrapping all Stagecraft routes.
- New shared `<StagecraftHeader>` (wordmark · nav · theme toggle) — removes header
  chrome currently duplicated across ~16 page files.
- Mount the **existing** `components/ui/animated-theme-toggler.tsx` in the header
  (already manages `.dark` + `localStorage`; no rebuild).
- New `<ScrollReveal>` (or hook) primitive in `components/stagecraft/`.
- Each unit single-purpose, independently testable, communicates via props.

## 21st.dev Components (3, rebuilt locally)
1. **Animated theme toggler** → shared header. Already implemented; mount only.
2. **Gooey text morphing** → landing hero headline rotating role identities
   (e.g. "Creative Director" / "Brand Leader" / "AI-native Operator").
3. **Gallery hover carousel** → company packs grid (Kohler / MBS / Pidilite / …).

## Delivery Phases (each verified before next)

- **P1 Foundation:** theme-aware sc-tokens (light+dark), `stagecraft/layout.tsx` +
  `StagecraftHeader` + mounted toggler, Fraunces font, `<ScrollReveal>` primitive,
  reduced-motion handling. Playwright baseline screenshots.
- **P2 Showcase:** landing hero (gooey morph), companies (gallery hover carousel),
  history + patterns cinematic polish.
- **P3 Loop pass:** apply tokens/type/toggle/micro-motion across the remaining
  practice routes; verify no light-mode contrast regressions; keep loop fast.
- **P4 Verification:** Playwright screenshots every route × {light, dark} × 3
  breakpoints; `code-review` skill; `simplify` pass; `tsc --noEmit`, `eslint` on
  touched paths, `next build` all green.

## Success Criteria
- Dark/light toggle works on every Stagecraft route with no FOUC and AA contrast.
- Showcase surfaces feel cinematic and premium; practice loop latency/interaction
  unchanged (no added blocking JS, no scroll-jacking).
- Header chrome defined once (shared component), not per-page.
- `tsc`, `eslint` (touched paths), `next build` green; Playwright visual pass across
  breakpoints and themes.
- `prefers-reduced-motion` fully respected.

## Risks / Mitigations
- **Light-mode contrast regressions** in components with hardcoded assumptions →
  Playwright light/dark screenshot diff across all routes in P4.
- **Token migration breaking utilities** → keep `@theme` registration; only move
  values to `:root`/`.dark`; verify a sample route renders identically in dark first.
- **Motion jank on low-end devices** → CSS-only transforms, IntersectionObserver
  (not scroll listeners), reduced-motion escape hatch.
