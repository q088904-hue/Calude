# Product Maturity Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four systemic quality gaps exposed by the CCO audit — type-scale epidemic, unlabeled form fields, sub-32px touch targets, flat heading structure — plus redesign the landing nav as a grouped dropdown (Option A) — without touching any logic, routing, or workflow.

**Architecture:** All changes are presentational. Q1 is a token+class-floor change (globals.css + mechanical sed sweep). M1 converts visual `<p>`/`<span>` section labels to `<h2>`/`<h3>` while keeping exact classNames. Q2 wires form fields to their existing visual labels via `id`+`htmlFor` (already-visible labels; no new copy). Q3 adds `min-h-[36px]` to interactive elements in the nav area. M3 extracts the 14 flat nav links into a new `NavDropdown` client component rendered only in the Stagecraft landing header. Preservation constraints: palette, elevation, radius, spacing, motion, and all business logic.

**Tech Stack:** Next.js 16.2, React 19, Tailwind v4, TypeScript. No new npm dependencies. Verification: `npx tsc --noEmit`, `npx eslint <touched>`, `npm run build` (prebuild runs `check-answers`), preview-MCP DOM probes.

---

## Scope note (important before editing)

These files share patterns; the plan edits them once with a surgical approach:

- `src/app/globals.css` — Q1 type utilities only
- `src/app/stagecraft/page.tsx` (~4200 lines) — M1 heading swaps (section labels only), M3 nav replacement; Q1 sweep; logic untouched
- `src/app/stagecraft/profile/page.tsx` — Q2 label wiring inside `Field`, `TextInput`, `TextArea` components; `Section` title → `h2`; `Field` label → real `<label htmlFor>`
- `src/app/stagecraft/debrief/page.tsx` — Q2 unlabeled date input + Q/A textareas
- `src/app/stagecraft/recruiter/page.tsx` — Q2 message textarea
- `src/app/stagecraft/negotiate/page.tsx` — Q2 transcript textarea
- `src/components/stagecraft/StagecraftHeader.tsx` — Q3 min-height on back-link + label
- `src/components/stagecraft/NavDropdown.tsx` — **new** M3 grouped nav component
- All 18 Stagecraft page files — Q1 sed sweep `text-[10px]`→`text-xs`, `text-[11px]`→`text-xs`

---

## File Structure

### New files
- `src/components/stagecraft/NavDropdown.tsx` — client component; four dropdown groups (Practice/Prep/Progress/Profile); keyboard + ARIA; used only in the landing header.

### Modified files
- `src/app/globals.css` — add Stagecraft type-scale comment block + `.sc-eyebrow` utility (Q1)
- `src/app/stagecraft/page.tsx` — nav replacement (M3), section-label headings (M1), `text-[10px]` floor (Q1)
- `src/app/stagecraft/profile/page.tsx` — `Field`→real label wiring (Q2), `Section` title→`h2` (M1), `text-[10px]` (Q1)
- `src/app/stagecraft/debrief/page.tsx` — date input label (Q2), Q/A textarea labels (Q2), section labels (M1), `text-[10px]` (Q1)
- `src/app/stagecraft/recruiter/page.tsx` — message textarea label (Q2), `text-[10px]` (Q1)
- `src/app/stagecraft/negotiate/page.tsx` — transcript textarea label (Q2), `text-[10px]` (Q1)
- `src/components/stagecraft/StagecraftHeader.tsx` — Q3 min-height
- All other Stagecraft pages — Q1 sed sweep only (no logic edits)

---

## Task 1: Q1 — Typography floor: globals.css utility + token comment

**Files:**
- Modify: `src/app/globals.css` (after the `STAGECRAFT` comment block, approximately after the `.dark {}` block)

- [ ] **Step 1: Add Stagecraft type-scale documentation block to globals.css**

Find the line `/* Stagecraft palette — light (default) */` in `src/app/globals.css`. Insert the following immediately above it (before the `:root` block):

```css
/* ============================================
   STAGECRAFT — TYPE SCALE
   Hierarchy (smallest to largest):
   · sc-eyebrow  12px mono upper — section labels, chips, metadata
   · text-xs     12px — secondary info (Tailwind default)
   · text-sm     14px — primary body text in dense surfaces
   · text-base   16px — comfortable reading body
   · font-fraunces (display) — headlines
   FLOOR: 10px is prohibited. Smallest used = 12px (text-xs).
   ============================================ */
```

- [ ] **Step 2: Verify insertion is clean**

Run: `npx tsc --noEmit`
Expected: exit 0 (CSS-only addition, unaffected)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "docs(stagecraft): add type-scale documentation comment to globals.css"
```

---

## Task 2: Q1 — Typography floor: mechanical 10px→12px sweep

**Files:**
- Modify: 18 Stagecraft page files + `src/components/stagecraft/GalleryHoverCarousel.tsx`

- [ ] **Step 1: Verify the exact files and counts before sweeping**

```bash
grep -rln 'text-\[10px\]\|text-\[11px\]' src/app/stagecraft src/components/stagecraft
```

Expected: ~18 files listed. Confirm no non-Stagecraft files appear.

- [ ] **Step 2: Run the mechanical sweep**

```bash
find src/app/stagecraft src/components/stagecraft -name '*.tsx' | xargs sed -i '' \
  -e 's/text-\[10px\]/text-xs/g' \
  -e 's/text-\[11px\]/text-xs/g'
```

- [ ] **Step 3: Verify all occurrences replaced**

```bash
grep -rn 'text-\[10px\]\|text-\[11px\]' src/app/stagecraft src/components/stagecraft
```

Expected: **no output** (zero remaining).

- [ ] **Step 4: TypeScript + build gate**

```bash
npx tsc --noEmit && npm run build
```

Expected: `tsc` exits 0; build shows `✅ All 61 unique bank questions covered` then `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add src/app/stagecraft src/components/stagecraft
git commit -m "fix(stagecraft): Q1 — raise type floor from 10px to 12px (text-xs) across 18 files"
```

---

## Task 3: M1 — Semantic headings: profile page Section titles → h2

**Files:**
- Modify: `src/app/stagecraft/profile/page.tsx:496-531`

The `Section` component currently wraps the title in a `<span>`. The fix: promote to `<h2>` with identical className.

- [ ] **Step 1: Update the Section component's title span to h2**

In `src/app/stagecraft/profile/page.tsx`, find the `Section` component (around line 496). Change:

```tsx
        <div>
          <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
            {title}
          </span>
          <span className="font-mono text-xs text-sc-dim ml-2">— {label}</span>
        </div>
```

To:

```tsx
        <div>
          <h2 className="font-mono text-xs tracking-widest text-sc-dim uppercase inline">
            {title}
          </h2>
          <span className="font-mono text-xs text-sc-dim ml-2">— {label}</span>
        </div>
```

Visual is unchanged; now a semantic `h2`.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/stagecraft/profile/page.tsx
git commit -m "fix(stagecraft): M1 — profile Section titles promoted to h2"
```

---

## Task 4: M1 — Semantic headings: landing page + sub-page section labels

**Files:**
- Modify: `src/app/stagecraft/page.tsx` (section eyebrow labels)
- Modify: `src/app/stagecraft/companies/[id]/page.tsx`
- Modify: `src/app/stagecraft/history/page.tsx`
- Modify: `src/app/stagecraft/patterns/page.tsx`
- Modify: `src/app/stagecraft/debrief/page.tsx`
- Modify: `src/app/stagecraft/quickfire/page.tsx`

The pattern to replace is: `<p className="font-mono text-xs tracking-widest text-sc-dim uppercase` (section dividers that are purely visual labels for named sections — not inline chip labels or status badges). Rule: if the element introduces a named *section* of the page and there is no sibling `h2` in that section, promote it to `h2`. If it is a chip/badge/inline label, leave it as-is.

- [ ] **Step 1: Landing page — identify and promote top-level section labels**

In `src/app/stagecraft/page.tsx`, find these patterns (searching by `tracking-widest.*uppercase` near the start of a visible section). The section-starting `<p>` labels (e.g. "THE BRIEFING ROOM", "HOW MUCH TIME?", "READINESS", "LAST SESSION", "RECOMMENDED NEXT SESSION", "QUICK FIRE", "PRIORITY SKILLS") should become `<h2>`. Inline labels inside cards (e.g. round badges, status chips) stay as-is.

For each section-starting `<p className="font-mono text-xs tracking-widest text-sc-dim uppercase...">`, change the tag from `p` to `h2`. Keep the className **exactly identical**.

Example — change:
```tsx
<p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-2">
  READINESS
</p>
```
To:
```tsx
<h2 className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-2">
  READINESS
</h2>
```

Do **not** change the className. Do **not** change inline chip labels (those inside `<span>` within a button or badge element).

- [ ] **Step 2: Apply the same h2 promotion on the 5 sub-pages**

For `companies/[id]/page.tsx`, `history/page.tsx`, `patterns/page.tsx`, `debrief/page.tsx`, `quickfire/page.tsx`: repeat the same pattern. Each page has 2–4 section-starting `<p>` labels to promote. Inline badge/chip labels stay.

Heuristic: a `<p>` or `<span>` with `tracking-widest uppercase` that is **the first and only element** in a flex/block container introducing a content section → promote to `h2`. If it's inside a `.flex.items-center` alongside a button or score chip → leave it.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: exit 0. (`<h2>` and `<p>` share the same prop shape; no type errors expected.)

- [ ] **Step 4: Build gate**

```bash
npm run build
```

Expected: `✅ All 61 unique bank questions` then `✓ Compiled successfully`.

- [ ] **Step 5: DOM heading probe (run in preview after build)**

Start the preview server and run this in `preview_eval`:

```js
Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.tagName + ': ' + h.textContent.trim().slice(0,40))
```

Expected on `/stagecraft`: `h1` count = 1, `h2` count ≥ 3. On `/stagecraft/companies/kohler-india`: `h2` count ≥ 3.

- [ ] **Step 6: Commit**

```bash
git add src/app/stagecraft/page.tsx \
  "src/app/stagecraft/companies/[id]/page.tsx" \
  src/app/stagecraft/history/page.tsx \
  src/app/stagecraft/patterns/page.tsx \
  src/app/stagecraft/debrief/page.tsx \
  src/app/stagecraft/quickfire/page.tsx
git commit -m "fix(stagecraft): M1 — section labels promoted to h2 on landing + 5 sub-pages"
```

---

## Task 5: Q2 — Accessibility: wire Profile form fields

**Files:**
- Modify: `src/app/stagecraft/profile/page.tsx`

The `Field` component renders a `<label>` element that is **not associated** to its child input because there is no `htmlFor` + matching `id`. The fix: pass a computed `id` through `Field` and wire it to the child input.

- [ ] **Step 1: Update the Field component to accept and wire an id prop**

Find the `Field` function definition (around line 533). Replace it with:

```tsx
function Field({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label
          htmlFor={id}
          className="font-mono text-xs tracking-widest text-sc-muted uppercase"
        >
          {label}
        </label>
        {hint && (
          <span className="font-mono text-xs text-sc-dim">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Update TextInput to accept and forward an id prop**

Find the `TextInput` function (around line 557). Replace it with:

```tsx
function TextInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      className="w-full rounded-sm border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
```

- [ ] **Step 3: Update TextArea to accept and forward an id prop**

Find the `TextArea` function (around line 577). Replace it with:

```tsx
function TextArea({
  value,
  onChange,
  rows = 3,
  mono,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
  placeholder?: string;
  id?: string;
}) {
  return (
    <textarea
      id={id}
      className={`w-full rounded-sm border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors resize-none leading-relaxed ${
        mono ? "font-mono" : "font-sans"
      }`}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
```

- [ ] **Step 4: Wire id+htmlFor through every Field usage in the profile form**

For every `<Field label="...">` that wraps a `<TextInput>` or `<TextArea>`, add matching `id` props. Use `sc-profile-` prefix + a slug derived from the label. Complete list:

```tsx
{/* Interview target section */}
<Field label="Company & role" id="sc-profile-company">
  <TextInput id="sc-profile-company" ... />
</Field>
<Field label="Interview date" id="sc-profile-date">
  {/* The date input is a raw <input>, not TextInput — add id directly */}
  <input id="sc-profile-date" type="date" ... />
</Field>

{/* Identity section */}
<Field label="Name" id="sc-profile-name">
  <TextInput id="sc-profile-name" ... />
</Field>
<Field label="Location" id="sc-profile-location">
  <TextInput id="sc-profile-location" ... />
</Field>
<Field label="Current role" id="sc-profile-current-role">
  <TextInput id="sc-profile-current-role" ... />
</Field>
<Field label="Tenure" id="sc-profile-tenure">
  <TextInput id="sc-profile-tenure" ... />
</Field>
<Field label="Target roles" id="sc-profile-target-roles">
  <TextArea id="sc-profile-target-roles" ... />
</Field>
<Field label="Target markets" id="sc-profile-target-markets">
  <TextArea id="sc-profile-target-markets" ... />
</Field>
<Field label="Craft skills" id="sc-profile-craft">
  <TextArea id="sc-profile-craft" ... />
</Field>
<Field label="Education" id="sc-profile-education">
  <TextArea id="sc-profile-education" ... />
</Field>
```

For the Real numbers `TextArea` (no Field wrapper — it's directly inside Section): add `id="sc-profile-real-numbers"` to the `<TextArea>` and add a visually-hidden label:
```tsx
<label htmlFor="sc-profile-real-numbers" className="sr-only">Real numbers</label>
<TextArea id="sc-profile-real-numbers" ... />
```

For Voice samples (inside a loop with `<label>Sample {i + 1}</label>`): the label is already a `<label>` element. Add `htmlFor={`sc-profile-voice-${i}`}` to the label and `id={`sc-profile-voice-${i}`}` to the `<TextArea>`.

For Weak patterns `TextArea` (no Field wrapper): same sr-only label pattern:
```tsx
<label htmlFor="sc-profile-weak-patterns" className="sr-only">Known patterns</label>
<TextArea id="sc-profile-weak-patterns" ... />
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 6: DOM probe — verify 0 unlabeled fields**

```js
const fields = Array.from(document.querySelectorAll('input,textarea,select'));
const unlabeled = fields.filter(f => {
  const id = f.id;
  const hasFor = id && document.querySelector('label[for="'+id+'"]');
  const aria = f.getAttribute('aria-label') || f.getAttribute('aria-labelledby');
  const wrap = f.closest('label');
  return !(hasFor || aria || wrap);
});
unlabeled.length + ' unlabeled';
```

Expected: `"0 unlabeled"` on `/stagecraft/profile`.

- [ ] **Step 7: Commit**

```bash
git add src/app/stagecraft/profile/page.tsx
git commit -m "fix(stagecraft): Q2 — associate all 21 profile form fields with visible labels"
```

---

## Task 6: Q2 — Accessibility: debrief, recruiter, negotiate

**Files:**
- Modify: `src/app/stagecraft/debrief/page.tsx`
- Modify: `src/app/stagecraft/recruiter/page.tsx`
- Modify: `src/app/stagecraft/negotiate/page.tsx`

- [ ] **Step 1: Debrief — date input**

In `src/app/stagecraft/debrief/page.tsx`, find the date `<input type="date">` (around line 547). The visual label is a sibling `<p>` above it. Replace the label `<p>` with a `<label htmlFor="sc-debrief-date">` and add `id="sc-debrief-date"` to the input:

```tsx
{/* Before */}
<p className="font-mono text-xs tracking-widest text-sc-dim uppercase">Interview date</p>
<input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-3 py-2 text-sm text-sc-ink focus:border-sc-gold-dim focus:outline-none transition-colors"
/>

{/* After */}
<label htmlFor="sc-debrief-date" className="font-mono text-xs tracking-widest text-sc-dim uppercase">
  Interview date
</label>
<input
  id="sc-debrief-date"
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-3 py-2 text-sm text-sc-ink focus:border-sc-gold-dim focus:outline-none transition-colors"
/>
```

- [ ] **Step 2: Debrief — Q&A textareas (dynamic per pair)**

Each pair has a question `<textarea>` and an answer `<textarea>`. They already have a visual label (`Q{i+1}` header and a `<p>` label for the answer textarea). Add `id` + `aria-label` (since the label text is dynamic and not a traditional label element):

For the question textarea (around line 625+), add:
```tsx
<textarea
  id={`sc-debrief-q-${pair.id}`}
  aria-label={`Question ${i + 1}`}
  value={pair.question}
  ...
/>
```

For the answer textarea (around line 655+), add:
```tsx
<textarea
  id={`sc-debrief-a-${pair.id}`}
  aria-label={`Your answer to question ${i + 1}`}
  value={pair.answer}
  ...
/>
```

Also find the `<select>` for round selection and add `aria-label="Round type"`:
```tsx
<select
  aria-label="Round type"
  value={pair.round}
  ...
/>
```

- [ ] **Step 3: Recruiter — message textarea**

In `src/app/stagecraft/recruiter/page.tsx`, find the `<textarea>` (around line 255). It has no visible label (the heading above is a section title, not a label). Add `aria-label`:

```tsx
<textarea
  aria-label="Paste job description or recruiter message"
  value={message}
  ...
/>
```

- [ ] **Step 4: Negotiate — transcript textarea**

In `src/app/stagecraft/negotiate/page.tsx`, find the `<textarea>` in the `answerMode === "type"` branch (around line 677). Add `aria-label`:

```tsx
<textarea
  aria-label="Type your negotiation response"
  value={transcript}
  ...
/>
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 6: DOM probe on debrief**

Navigate to `/stagecraft/debrief` and run the same unlabeled-field probe from Task 5 Step 6. Expected: `"0 unlabeled"`.

- [ ] **Step 7: Commit**

```bash
git add src/app/stagecraft/debrief/page.tsx \
  src/app/stagecraft/recruiter/page.tsx \
  src/app/stagecraft/negotiate/page.tsx
git commit -m "fix(stagecraft): Q2 — associate form fields on debrief, recruiter, negotiate"
```

---

## Task 7: Q3 — Touch targets: StagecraftHeader + landing nav links

**Files:**
- Modify: `src/components/stagecraft/StagecraftHeader.tsx`
- Modify: `src/app/stagecraft/page.tsx` (nav link area)

- [ ] **Step 1: StagecraftHeader — raise back-link and label hit area**

In `src/components/stagecraft/StagecraftHeader.tsx`, find the back-link `<Link>` and the label `<span>`:

```tsx
{/* Current: */}
<Link
  href={backHref}
  className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
>
  {backLabel}
</Link>
<span className="text-sc-border text-xs">·</span>
<span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
  {label}
</span>
```

Change to (add `min-h-[36px] inline-flex items-center` to the link; visual look unchanged):

```tsx
<Link
  href={backHref}
  className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors min-h-[36px] inline-flex items-center"
>
  {backLabel}
</Link>
<span className="text-sc-border text-xs">·</span>
<span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
  {label}
</span>
```

- [ ] **Step 2: Landing nav links — the individual pill links (Q3 + pre-M3 polish)**

The nav link buttons in the landing header (`py-1.5` = 6px vertical padding on ~12px text ≈ 24px total height) need `py-2` (8px) to reach ≥32px, or the wrapping container needs `min-h-[36px]`:

In `src/app/stagecraft/page.tsx`, find the exact nav link class (around line 852):
```
className="rounded border border-sc-border bg-sc-surface px-3 py-1.5 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
```

Change `py-1.5` to `py-2` across all 14 nav links. Since they all share the identical class, use sed:

```bash
sed -i '' 's/rounded border border-sc-border bg-sc-surface px-3 py-1\.5 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors/rounded border border-sc-border bg-sc-surface px-3 py-2 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors/g' src/app/stagecraft/page.tsx
```

Verify: `grep -c 'py-1\.5' src/app/stagecraft/page.tsx` (expect fewer occurrences than before — only non-nav uses remain).

- [ ] **Step 3: TypeScript + build**

```bash
npx tsc --noEmit && npm run build
```

Expected: tsc exit 0; build succeeds.

- [ ] **Step 4: DOM probe — verify interactive element heights**

```js
Array.from(document.querySelectorAll('header a, header button')).map(e => ({ text: e.textContent.trim().slice(0,15), h: Math.round(e.getBoundingClientRect().height) })).filter(x => x.h > 0)
```

Expected: all heights ≥ 32.

- [ ] **Step 5: Commit**

```bash
git add src/components/stagecraft/StagecraftHeader.tsx src/app/stagecraft/page.tsx
git commit -m "fix(stagecraft): Q3 — raise nav link touch targets to ≥32px"
```

---

## Task 8: M3 — Create NavDropdown component

**Files:**
- Create: `src/components/stagecraft/NavDropdown.tsx`

This is the grouped navigation replacing the 14 flat links in the landing header. The four groups (Practice/Prep/Progress) each render as a button that opens a positioned dropdown. Profile renders as a direct link. Keyboard: `Escape` closes any open menu; `Tab` out of a menu closes it. ARIA: `aria-expanded`, `aria-haspopup="menu"`, menu items have `role="menuitem"`.

- [ ] **Step 1: Create the component**

Create `src/components/stagecraft/NavDropdown.tsx` with this content:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NavItem = { label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Practice",
    items: [
      { label: "Quickfire", href: "/stagecraft/quickfire" },
      { label: "Drill", href: "/stagecraft/drill" },
      { label: "STAR", href: "/stagecraft/star" },
      { label: "Negotiate", href: "/stagecraft/negotiate" },
      { label: "Intro", href: "/stagecraft/intro" },
      { label: "Debrief", href: "/stagecraft/debrief" },
      { label: "Recruiter", href: "/stagecraft/recruiter" },
    ],
  },
  {
    label: "Prep",
    items: [
      { label: "Companies", href: "/stagecraft/companies" },
      { label: "90-Day Plan", href: "/stagecraft/plan" },
      { label: "Portfolio", href: "/stagecraft/portfolio" },
      { label: "Checklist", href: "/stagecraft/checklist" },
    ],
  },
  {
    label: "Progress",
    items: [
      { label: "History", href: "/stagecraft/history" },
      { label: "Patterns", href: "/stagecraft/patterns" },
      { label: "Memorize", href: "/stagecraft/memorize" },
    ],
  },
];

function DropdownGroup({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded border border-sc-border bg-sc-surface px-3 py-2 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors min-h-[36px] inline-flex items-center gap-1"
      >
        {group.label}
        <svg
          viewBox="0 0 10 6"
          className={`w-2 h-2 fill-current transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M0 0l5 6 5-6H0z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={group.label}
          className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-sc border border-sc-border bg-sc-surface shadow-sc-md py-1"
        >
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs font-mono text-sc-muted hover:text-sc-gold hover:bg-sc-gold-bg transition-colors min-h-[36px] flex items-center"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavDropdown() {
  return (
    <nav aria-label="Stagecraft navigation" className="flex items-center gap-2">
      {NAV_GROUPS.map((group) => (
        <DropdownGroup key={group.label} group={group} />
      ))}
      <Link
        href="/stagecraft/profile"
        className="rounded border border-sc-border bg-sc-surface px-3 py-2 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors min-h-[36px] inline-flex items-center"
      >
        Profile
      </Link>
    </nav>
  );
}
```

- [ ] **Step 2: TypeScript + lint**

```bash
npx tsc --noEmit && npx eslint src/components/stagecraft/NavDropdown.tsx
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/stagecraft/NavDropdown.tsx
git commit -m "feat(stagecraft): M3 — NavDropdown component (Practice/Prep/Progress/Profile groups)"
```

---

## Task 9: M3 — Wire NavDropdown into the landing header

**Files:**
- Modify: `src/app/stagecraft/page.tsx`

- [ ] **Step 1: Add import**

At the top of `src/app/stagecraft/page.tsx`, add:

```tsx
import { NavDropdown } from "@/components/stagecraft/NavDropdown";
```

- [ ] **Step 2: Replace the flat 14-link nav with NavDropdown**

Find the nav container (around line 850):

```tsx
<div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
  <Link href="/stagecraft/recruiter" className="rounded border border-sc-border bg-sc-surface px-3 py-2 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors">Recruiter</Link>
  <Link href="/stagecraft/checklist" ...>Checklist</Link>
  {/* ... 12 more links ... */}
  <Link href="/stagecraft/memorize" ...><span>♥</span>Memorize</Link>
  <AnimatedThemeToggler />
</div>
```

Replace the entire container (from `<div className="flex items-center gap-2 overflow-x-auto...` through its closing `</div>`) with:

```tsx
<div className="flex items-center gap-3">
  <NavDropdown />
  <AnimatedThemeToggler />
</div>
```

**Important:** The `<AnimatedThemeToggler />` must be preserved in this right-side container. Verify you've kept it.

- [ ] **Step 3: Remove no-longer-needed AnimatedThemeToggler import if it was only used in the nav**

Check: `grep -n 'AnimatedThemeToggler' src/app/stagecraft/page.tsx`

If it appears only in the new `<AnimatedThemeToggler />` line you just kept, the import is still needed — keep it. If it's now zero occurrences (you accidentally removed it), add it back.

- [ ] **Step 4: TypeScript + lint + build**

```bash
npx tsc --noEmit && npx eslint src/app/stagecraft/page.tsx && npm run build
```

Expected: tsc exit 0, no new eslint errors (page.tsx has 3 known pre-existing `set-state-in-effect` errors which are fine), build succeeds with coverage gate.

- [ ] **Step 5: DOM probe — verify all 14 routes still navigable**

```js
const links = Array.from(document.querySelectorAll('[role="menu"] [role="menuitem"], nav a[href*="/stagecraft"]'));
links.map(l => l.getAttribute('href')).sort()
```

Expected: 14 `/stagecraft/...` hrefs present.

- [ ] **Step 6: Commit**

```bash
git add src/app/stagecraft/page.tsx
git commit -m "feat(stagecraft): M3 — replace 14 flat nav links with NavDropdown in landing header"
```

---

## Task 10: Final verification

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit && npx eslint src/app/stagecraft/page.tsx src/app/stagecraft/profile/page.tsx src/app/stagecraft/debrief/page.tsx src/app/stagecraft/recruiter/page.tsx src/app/stagecraft/negotiate/page.tsx src/components/stagecraft/StagecraftHeader.tsx src/components/stagecraft/NavDropdown.tsx && npm run build
```

Expected: tsc 0, no new eslint errors beyond the 3 known pre-existing in page.tsx, build green with `✅ All 61 unique bank questions covered`.

- [ ] **Step 2: Light mode visual check (preview MCP)**

Start server; navigate to `/stagecraft`. Screenshot. Check: grouped nav (4 buttons visible), no tiny 10px text, warm near-white bg.

- [ ] **Step 3: Dark mode visual check**

Toggle dark via `localStorage.setItem('theme','dark')` + class toggle. Screenshot `/stagecraft`. Check: dark palette unchanged, nav buttons readable.

- [ ] **Step 4: Mobile visual check (375px)**

```js
// In preview_resize:
{ preset: "mobile" }
```

Screenshot `/stagecraft` and `/stagecraft/quickfire`. Check: nav doesn't overflow (at 375px the 4 group buttons fit; verify). Check: touch targets ≥32px.

- [ ] **Step 5: a11y DOM probe — headings**

Navigate to `/stagecraft`. Run:
```js
({ h1: document.querySelectorAll('h1').length, h2: document.querySelectorAll('h2').length })
```
Expected: `{ h1: 1, h2: ≥3 }`.

Navigate to `/stagecraft/companies/kohler-india`. Same probe. Expected: `{ h1: 1, h2: ≥3 }`.

- [ ] **Step 6: a11y DOM probe — unlabeled fields**

Navigate to `/stagecraft/profile`. Run the unlabeled-field probe from Task 5 Step 6. Expected: `"0 unlabeled"`.

Navigate to `/stagecraft/debrief`. Same probe. Expected: `"0 unlabeled"`.

- [ ] **Step 7: a11y DOM probe — touch targets**

Navigate to `/stagecraft`. Run:
```js
Array.from(document.querySelectorAll('header a, header button, [role="menu"] a')).filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 32; }).length + ' elements under 32px'
```
Expected: `"0 elements under 32px"`.

- [ ] **Step 8: type floor probe**

```js
const s = {}; document.querySelectorAll('*').forEach(e => { if(!e.children.length && e.textContent.trim()) { const f = getComputedStyle(e).fontSize; s[f]=(s[f]||0)+1; } }); Object.entries(s).filter(([k])=>parseFloat(k)<12).sort()
```
Expected: empty array `[]` — no elements below 12px.

- [ ] **Step 9: Dropdown keyboard nav smoke test**

In preview, tab to the "Practice" button, press Enter — menu should open. Tab through menu items. Press Escape — menu should close and focus should return to the button.

- [ ] **Step 10: Final commit marker**

```bash
git commit --allow-empty -m "chore(stagecraft): product-maturity pass verified (Q1/Q2/Q3/M1/M3)"
```

---

## Self-Review

**Spec coverage:**
- Q1 Typography floor ✅ Task 1 (docs) + Task 2 (sweep)
- Q2 Profile labels ✅ Task 5; Debrief/Recruiter/Negotiate ✅ Task 6
- Q3 Touch targets ✅ Task 7 (StagecraftHeader + nav links)
- M1 Semantic headings ✅ Task 3 (profile) + Task 4 (landing + 5 sub-pages)
- M3 Nav grouped Option A ✅ Task 8 (component) + Task 9 (wire)
- All routes reachable ✅ NavDropdown preserves all 14 hrefs
- Keyboard/ARIA ✅ `aria-haspopup`, `aria-expanded`, `role="menu"`, `role="menuitem"`, Escape handling
- Dark mode preserved ✅ All token-level; no dark-specific overrides touched
- Build gate ✅ Steps gated on tsc + build + coverage
- Pre-existing eslint issues unchanged ✅ Only clean new files + tag-level changes

**Placeholder scan:** No TBD/TODO. Every code block is complete and specific to actual file content found via the audit.

**Type consistency:** `NavItem`, `NavGroup`, `DropdownGroup` — defined in Task 8, used only within that file. `Field` `id` prop optional — added in Task 5, passed through in Task 5 Step 4. `TextInput`/`TextArea` `id` prop added in Task 5, used consistently in all Field wirings.
