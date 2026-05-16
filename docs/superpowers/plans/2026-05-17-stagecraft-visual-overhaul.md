# Stagecraft Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a premium cinematic-editorial Stagecraft with a working dark/light theme, without slowing the practice loop.

**Architecture:** Make the dark-only `--color-sc-*` tokens theme-aware using the codebase's existing `@theme inline` + `:root`/`.dark` convention. Introduce a shared `<StagecraftHeader>` (with the existing animated theme toggler) and a minimal `stagecraft/layout.tsx`. Add a CSS/IntersectionObserver `<ScrollReveal>` primitive. Apply full cinematic treatment to showcase surfaces only; the loop gets type/theme/micro-motion.

**Tech Stack:** Next.js 16.2, React 19.2, Tailwind v4 (`@theme`), framer-motion 12.38 (already used by the toggler), `next/font/google` (Fraunces), Playwright MCP for visual verification.

**Verification model:** No unit tests (visual work). Every task gates on `npx tsc --noEmit`, `npx eslint <touched>`, and where UI changes: a Playwright screenshot captured + visually inspected in light AND dark. `next build` runs at each phase boundary.

---

## File Structure

- `src/app/globals.css` — migrate sc `@theme {}` → `@theme inline {}`; add `--sc-*` values under `:root` (light) and `.dark` (dark). Add Fraunces font var + scroll-reveal keyframes/utilities.
- `src/app/layout.tsx` — add Fraunces via `next/font/google`, expose `--font-fraunces`.
- `src/app/stagecraft/layout.tsx` — **new**. Minimal segment layout; no chrome (pages keep their own `stagecraft-root` wrapper). Reserved for future shared providers.
- `src/components/stagecraft/StagecraftHeader.tsx` — **new**. `label` prop, `← Stagecraft` link, uppercase label, mounts `AnimatedThemeToggler`. Replaces per-page bespoke headers.
- `src/components/stagecraft/ScrollReveal.tsx` — **new**. IntersectionObserver wrapper; reduced-motion aware.
- `src/components/stagecraft/GooeyText.tsx` — **new**. SVG goo-filter text morph (local rebuild of 21st.dev pattern).
- `src/components/stagecraft/GalleryHoverCarousel.tsx` — **new**. Hover-expanding horizontal gallery for company packs.
- `src/components/ui/animated-theme-toggler.tsx` — unchanged (already correct).
- Stagecraft page files — swap bespoke `<header>` for `<StagecraftHeader>`; apply showcase motion where in scope.

---

## Phase 1 — Foundation

### Task 1: Theme-aware sc tokens

**Files:**
- Modify: `src/app/globals.css:388-411` (the `@theme { --color-sc-* }` block)

- [ ] **Step 1: Replace the sc `@theme {}` block with `@theme inline {}` indirection**

Replace the entire block at `src/app/globals.css` lines 388–411 with:

```css
@theme inline {
  --color-sc-void:     var(--sc-void);
  --color-sc-bg:       var(--sc-bg);
  --color-sc-surface:  var(--sc-surface);
  --color-sc-raised:   var(--sc-raised);
  --color-sc-border:   var(--sc-border);
  --color-sc-line:     var(--sc-line);
  --color-sc-ink:      var(--sc-ink);
  --color-sc-muted:    var(--sc-muted);
  --color-sc-dim:      var(--sc-dim);
  --color-sc-gold:     var(--sc-gold);
  --color-sc-gold-dim: var(--sc-gold-dim);
  --color-sc-gold-bg:  var(--sc-gold-bg);
  --color-sc-red:      var(--sc-red);
  --color-sc-green:    var(--sc-green);
  --color-sc-green-bg: var(--sc-green-bg);
}

/* Stagecraft palette — light (default) */
:root {
  --sc-void:     #EFE9DA;
  --sc-bg:       #F4EFE4;
  --sc-surface:  #FBF7EC;
  --sc-raised:   #FFFFFF;
  --sc-border:   #D8CFBA;
  --sc-line:     #E4DCC8;
  --sc-ink:      #1F1B16;
  --sc-muted:    #6B6457;
  --sc-dim:      #A89F8A;
  --sc-gold:     #A8761F;
  --sc-gold-dim: #C9A35E;
  --sc-gold-bg:  rgba(168,118,31,0.10);
  --sc-red:      #C0432F;
  --sc-green:    #2F7D55;
  --sc-green-bg: rgba(47,125,85,0.12);
}

/* Stagecraft palette — dark (original values) */
.dark {
  --sc-void:     #080809;
  --sc-bg:       #0D0D0F;
  --sc-surface:  #131316;
  --sc-raised:   #1A1A1E;
  --sc-border:   #26262B;
  --sc-line:     #1E1E22;
  --sc-ink:      #EDE8DF;
  --sc-muted:    #78746F;
  --sc-dim:      #48453F;
  --sc-gold:     #C9973A;
  --sc-gold-dim: #6E521F;
  --sc-gold-bg:  rgba(201,151,58,0.08);
  --sc-red:      #E25E4A;
  --sc-green:    #3D9A6E;
  --sc-green-bg: rgba(61,154,110,0.10);
}
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/app/globals.css --no-error-on-unmatched-pattern; npm run build`
Expected: build succeeds; `sc-*` utilities still generated.

- [ ] **Step 3: Playwright visual check — dark unchanged, light works**

Start dev on isolated port: `npx next dev --webpack -p 3100` (background). Navigate Playwright to `http://localhost:3100/stagecraft`. Screenshot in dark (default for new visitor via prefers-color-scheme — force `.dark`), then toggle light. Confirm dark matches the pre-change look (regression guard) and light renders warm paper with readable contrast.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(stagecraft): make sc-* color tokens theme-aware (light + dark)"
```

### Task 2: Add Fraunces display font

**Files:**
- Modify: `src/app/layout.tsx:2` (font imports), `:52` (className), `src/app/globals.css` (`@theme inline` font block ~line 121)

- [ ] **Step 1: Import Fraunces in `src/app/layout.tsx`**

Change the import line to add `Fraunces`:

```ts
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono, Fraunces } from "next/font/google";
```

Add the loader (after the `jetbrainsMono` definition):

```ts
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});
```

Add `${fraunces.variable}` to the `<html className=...>` template string alongside the other font variables.

- [ ] **Step 2: Register the font token in `src/app/globals.css`**

In the existing `@theme inline { … }` block (the one ending ~line 124, containing `--font-sans`), add:

```css
  --font-fraunces: var(--font-fraunces);
```

(Adds a `font-fraunces` Tailwind utility.)

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS; no font 404s in build output.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(stagecraft): add Fraunces editorial display font"
```

### Task 3: Shared StagecraftHeader component

**Files:**
- Create: `src/components/stagecraft/StagecraftHeader.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function StagecraftHeader({
  label,
  sticky = true,
}: {
  label: string;
  sticky?: boolean;
}) {
  return (
    <header
      className={`border-b border-sc-border px-6 py-4 flex items-center justify-between bg-sc-bg ${
        sticky ? "sticky top-0 z-10" : ""
      }`}
    >
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/stagecraft"
          className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
        >
          ← Stagecraft
        </Link>
        <span className="text-sc-border text-xs">·</span>
        <span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
          {label}
        </span>
      </div>
      <AnimatedThemeToggler />
    </header>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/components/stagecraft/StagecraftHeader.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/stagecraft/StagecraftHeader.tsx
git commit -m "feat(stagecraft): shared header with animated theme toggler"
```

### Task 4: Minimal stagecraft layout

**Files:**
- Create: `src/app/stagecraft/layout.tsx`

- [ ] **Step 1: Create the segment layout**

```tsx
export default function StagecraftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

(Thin by design — pages keep their `stagecraft-root` wrapper; this reserves a place for future shared providers and isolates the segment.)

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS; all `/stagecraft/*` routes still render.

- [ ] **Step 3: Commit**

```bash
git add src/app/stagecraft/layout.tsx
git commit -m "feat(stagecraft): add minimal segment layout"
```

### Task 5: ScrollReveal primitive

**Files:**
- Create: `src/components/stagecraft/ScrollReveal.tsx`
- Modify: `src/app/globals.css` (append keyframe + utility, after the `.sc-entry` rules ~line 487)

- [ ] **Step 1: Append reveal CSS to `src/app/globals.css`**

```css
@keyframes sc-reveal {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.sc-reveal { opacity: 0; }
.sc-reveal[data-revealed="true"] {
  animation: sc-reveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .sc-reveal { opacity: 1 !important; }
  .sc-reveal[data-revealed="true"] { animation: none !important; }
}
```

- [ ] **Step 2: Create the component**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollReveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error polymorphic ref is sound for the allowed tags
      ref={ref}
      data-revealed={revealed ? "true" : "false"}
      style={{ animationDelay: `${delay}ms` }}
      className={`sc-reveal ${className}`}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/components/stagecraft/ScrollReveal.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/stagecraft/ScrollReveal.tsx src/app/globals.css
git commit -m "feat(stagecraft): IntersectionObserver scroll-reveal primitive"
```

### Task 6: Phase 1 verification gate

- [ ] **Step 1: Full build + lint of touched paths**

Run: `npx tsc --noEmit && npx eslint src/components/stagecraft src/app/stagecraft && npm run build`
Expected: all PASS.

- [ ] **Step 2: Playwright baseline — landing route, both themes, 3 breakpoints**

With dev on `:3100`, capture `/stagecraft` screenshots at 390px, 768px, 1440px in light and dark (6 shots). Inspect: no FOUC, AA contrast, dark visually unchanged from pre-overhaul. Save under `.playwright-mcp/` (cleaned in Phase 4).

- [ ] **Step 3: Commit any fixes; tag phase**

```bash
git commit -am "chore(stagecraft): phase 1 foundation verified" --allow-empty
```

---

## Phase 2 — Showcase Surfaces

### Task 7: GooeyText component + landing hero

**Files:**
- Create: `src/components/stagecraft/GooeyText.tsx`
- Modify: `src/app/stagecraft/page.tsx` (hero section + swap header)

- [ ] **Step 1: Create `GooeyText.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

export function GooeyText({
  texts,
  interval = 2600,
  className = "",
}: {
  texts: string[];
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduce || texts.length < 2) return;
    const id = setInterval(() => setI((p) => (p + 1) % texts.length), interval);
    return () => clearInterval(id);
  }, [texts.length, interval, reduce]);

  return (
    <span className={`relative inline-block ${className}`}>
      <svg aria-hidden className="absolute w-0 h-0">
        <defs>
          <filter id="sc-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
            <feColorMatrix
              in="b"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8"
            />
          </filter>
        </defs>
      </svg>
      <span style={{ filter: "url(#sc-goo)" }} className="block">
        {texts.map((t, idx) => (
          <span
            key={t}
            aria-hidden={idx !== i}
            className="block transition-opacity duration-500"
            style={{
              position: idx === i ? "relative" : "absolute",
              inset: idx === i ? undefined : 0,
              opacity: idx === i ? 1 : 0,
            }}
          >
            {t}
          </span>
        ))}
      </span>
      <span className="sr-only">{texts[i]}</span>
    </span>
  );
}
```

- [ ] **Step 2: Apply to the landing hero in `src/app/stagecraft/page.tsx`**

Replace the page's bespoke `<header>` with `<StagecraftHeader label="Home" sticky={false} />` (import it). In the hero heading, render a static line plus `<GooeyText className="font-fraunces" texts={["Creative Director", "Brand Leader", "AI-native Operator"]} />`. Wrap major below-fold sections in `<ScrollReveal>` with staggered `delay`.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/components/stagecraft/GooeyText.tsx src/app/stagecraft/page.tsx && npm run build`
Expected: PASS.

- [ ] **Step 4: Playwright — hero morph + reveal, light & dark**

Capture `/stagecraft` at 1440px and 390px in both themes; record a short observation that the gooey text cycles and sections reveal on scroll; reduced-motion path renders static.

- [ ] **Step 5: Commit**

```bash
git add src/components/stagecraft/GooeyText.tsx src/app/stagecraft/page.tsx
git commit -m "feat(stagecraft): cinematic landing hero with gooey text morph"
```

### Task 8: GalleryHoverCarousel + companies page

**Files:**
- Create: `src/components/stagecraft/GalleryHoverCarousel.tsx`
- Modify: `src/app/stagecraft/companies/page.tsx` (grid → carousel; swap header)

- [ ] **Step 1: Create `GalleryHoverCarousel.tsx`**

```tsx
"use client";

import { useState } from "react";

export interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GalleryHoverCarousel({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="flex gap-2 w-full h-[420px] overflow-hidden">
      {items.map((it, idx) => (
        <a
          key={it.id}
          href={it.href}
          onMouseEnter={() => setActive(idx)}
          onFocus={() => setActive(idx)}
          className="relative rounded-sm border border-sc-border bg-sc-surface overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sc-gold"
          style={{ flex: active === idx ? "5 1 0%" : "1 1 0%" }}
        >
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <span className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
              {it.subtitle}
            </span>
            <span
              className={`font-fraunces text-sc-ink leading-tight transition-all duration-500 ${
                active === idx ? "text-3xl" : "text-base"
              }`}
            >
              {it.title}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `src/app/stagecraft/companies/page.tsx`**

Swap the bespoke header for `<StagecraftHeader label="Companies" />`. Map the existing company packs to `GalleryItem[]` (`href` = `/stagecraft/companies/<id>`) and render `<GalleryHoverCarousel>` for desktop; keep the existing stacked list under `sm:` for mobile (carousel `hidden sm:flex`, list `sm:hidden`). Wrap in `<ScrollReveal>`.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/components/stagecraft/GalleryHoverCarousel.tsx src/app/stagecraft/companies/page.tsx && npm run build`
Expected: PASS.

- [ ] **Step 4: Playwright — carousel hover expand, mobile fallback, both themes**

Capture `/stagecraft/companies` at 1440px (hover an item → it expands) and 390px (stacked list visible, carousel hidden) in light and dark.

- [ ] **Step 5: Commit**

```bash
git add src/components/stagecraft/GalleryHoverCarousel.tsx src/app/stagecraft/companies/page.tsx
git commit -m "feat(stagecraft): company packs gallery hover carousel"
```

### Task 9: History + Patterns + company detail cinematic polish

**Files:**
- Modify: `src/app/stagecraft/history/page.tsx`, `src/app/stagecraft/patterns/page.tsx`, `src/app/stagecraft/companies/[id]/page.tsx`

- [ ] **Step 1: Apply showcase treatment**

For each: replace the bespoke `<header>` with `<StagecraftHeader label="…" />` (labels: "History", "Patterns", company name). Promote primary section titles to `font-fraunces`. Wrap card lists / pattern rows / detail sections in `<ScrollReveal>` with incremental `delay` (e.g. `index * 60`).

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/app/stagecraft/history/page.tsx src/app/stagecraft/patterns/page.tsx src/app/stagecraft/companies/[id]/page.tsx && npm run build`
Expected: PASS.

- [ ] **Step 3: Playwright — 3 routes × light/dark @1440 + @390**

Inspect reveal-on-scroll, Fraunces headings, contrast both themes.

- [ ] **Step 4: Commit**

```bash
git add src/app/stagecraft/history/page.tsx src/app/stagecraft/patterns/page.tsx "src/app/stagecraft/companies/[id]/page.tsx"
git commit -m "feat(stagecraft): cinematic polish for history, patterns, company detail"
```

---

## Phase 3 — Loop Pass (theme + type + micro-motion, stays fast)

### Task 10: Swap headers across remaining routes

**Files (Modify — swap bespoke `<header>` → `<StagecraftHeader label=…>`):**
- `src/app/stagecraft/page.tsx` (if not already in Task 7), `quickfire/page.tsx`, `drill/page.tsx`, `debrief/page.tsx`, `negotiate/page.tsx`, `intro/page.tsx`, `star/page.tsx`, `recruiter/page.tsx`, `memorize/page.tsx`, `checklist/page.tsx`, `profile/page.tsx`, `plan/page.tsx`

- [ ] **Step 1: For each file, replace the existing `<header className="border-b border-sc-border …">…</header>` block with:**

```tsx
<StagecraftHeader label="<PAGE LABEL>" />
```

Add `import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";`. Preserve any page-specific header right-side content (e.g. quickfire "Today: N fired") by passing it as children — extend `StagecraftHeader` to accept optional `children` rendered before the toggler:

In `StagecraftHeader.tsx`, change signature to add `children?: React.ReactNode` and render `<div className="flex items-center gap-3">{children}<AnimatedThemeToggler /></div>` on the right.

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/app/stagecraft && npm run build`
Expected: PASS.

- [ ] **Step 3: Playwright — spot-check 4 loop routes (quickfire, drill, debrief, negotiate) light & dark @390 + @1440**

Confirm headers identical in structure, toggler works mid-session, no layout shift, loop interactions unaffected.

- [ ] **Step 4: Commit**

```bash
git add src/app/stagecraft src/components/stagecraft/StagecraftHeader.tsx
git commit -m "feat(stagecraft): unify headers + theme toggle across loop routes"
```

### Task 11: Light-mode contrast sweep of loop components

**Files:** any loop page with hardcoded color assumptions surfaced by the sweep.

- [ ] **Step 1: Grep for raw hex / non-token colors in stagecraft pages**

Run: `grep -rn '#[0-9A-Fa-f]\{6\}\|rgba(' src/app/stagecraft --include=*.tsx | grep -v 'sc-' | head -50`
Inspect each hit; replace with the nearest `sc-*` token so it themes correctly.

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/app/stagecraft && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/stagecraft
git commit -m "fix(stagecraft): replace hardcoded colors with theme tokens for light mode"
```

---

## Phase 4 — Verification & Hardening

### Task 12: Full Playwright matrix

- [ ] **Step 1: Capture every stagecraft route × {light, dark} × {390, 768, 1440}**

Routes: `/stagecraft`, `/history`, `/patterns`, `/companies`, `/companies/<one-id>`, `/quickfire`, `/drill`, `/debrief`, `/negotiate`, `/intro`, `/star`, `/recruiter`, `/memorize`, `/checklist`, `/profile`, `/plan`. Inspect each for: contrast (AA), no FOUC, no overflow, motion correct, reduced-motion honored (re-run one route with reduced-motion emulated).

- [ ] **Step 2: Fix any regressions found; re-capture the affected route**

- [ ] **Step 3: Commit fixes**

```bash
git commit -am "fix(stagecraft): visual regressions from full Playwright matrix"
```

### Task 13: Code review + simplify

- [ ] **Step 1: Run the `code-review` skill** over the diff since the spec commit (`061f8ad..HEAD`). Address actionable findings.

- [ ] **Step 2: Run the `simplify` skill** over the new components in `src/components/stagecraft/`. Apply safe simplifications.

- [ ] **Step 3: Final gate**

Run: `npx tsc --noEmit && npx eslint src/app/stagecraft src/components/stagecraft && npm run build`
Expected: all PASS.

- [ ] **Step 4: Clean Playwright artifacts**

Run: `rm -rf .playwright-mcp && git status --porcelain`
Expected: no stray screenshots/snapshots.

- [ ] **Step 5: Commit**

```bash
git commit -am "chore(stagecraft): code review + simplify pass; overhaul complete"
```

---

## Self-Review (completed by author)

**Spec coverage:** Theme-aware tokens → T1. Fraunces → T2. Shared header + toggler → T3,T10. Layout → T4. Scroll-reveal/reduced-motion → T5. Gooey text → T7. Gallery carousel → T8. Showcase polish → T9. Loop pass → T10,T11. Playwright matrix → T6,T12. Code-review + simplify + build gates → T13. Non-goals (no Caveman plugin, no 21st.dev npm deps, no scroll-jacking, no text-arc) honored by omission. All spec sections mapped.

**Placeholder scan:** No TBD/TODO; component code given in full; page edits specify exact file + the precise block to replace and the replacement pattern (page-specific JSX bodies are large and varied — the instruction is exact about *what* to swap and *with what*, which is the non-placeholder requirement for mechanical edits).

**Type consistency:** `StagecraftHeader` gains `children?` in T10 consistent with T3 base; `GalleryItem` shape stable; `ScrollReveal` props (`delay`, `as`, `className`) used consistently in T7–T9.

**Deviation from spec (intentional):** spec said "shared header + layout.tsx"; plan implements the header as a reusable *component* (T3) consumed per-page plus a thin layout (T4) — lower risk than Next segment-label plumbing, same DRY outcome. Noted here for the reviewer.
