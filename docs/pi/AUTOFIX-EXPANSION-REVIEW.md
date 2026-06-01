# Auto-Fix Expansion — Architecture Review & Phased Proposal

**Question:** users expect Auto-Fix to improve *every* scored dimension, not just Typography.
How far can Auto-Fix responsibly go in PowerPoint OOXML before it starts **redesigning** slides
(and damaging content/intent)? This review evaluates all 8 dimensions, classifies each fix, and
proposes a phased roadmap. **No implementation — analysis only.**

---

## The governing principle (the line in the sand)

> **Auto-Fix can safely change ATTRIBUTES that carry no spatial or semantic meaning** — font names,
> theme/token colors, an added logo/footer. **The moment a fix must REPOSITION elements (geometry)
> or REINTERPRET meaning (which blue is "a chart series" vs "a heading"), it is redesigning the
> deck**, and that cannot be done deterministically without risking content damage.

Everything below is an application of that line.

**Critical reframe of the user expectation:** a low Color/Brand-Balance score after Auto-Fix is often
**correct governance, not a tool failure.** The live Gartner deck flags `#FFD700`, `#0C519F`,
`#9CA3AF`, `#374151` — gold/blue/grey that are almost certainly **chart and data colors**. Auto-
remapping them to white/red/black would *destroy the charts' legibility and meaning*. The engine
withholding that change is the safe, intended behaviour. "Improve every score automatically" and "never
damage a deck" are in direct tension; this review keeps damage-avoidance first.

---

## Per-dimension assessment

| # | Dimension | Safe to auto-fix? | Deterministic? | Editability preserved? | Risk | Class |
|---|---|---|---|---|---|---|
| 1 | **Brand Balance** | No (it's derived) | No | n/a | **High** | **C** |
| 2 | **Color compliance** | Partly | Partly | Yes | **Mixed** | **A / B / C** |
| 3 | **Logo compliance** | Inject-missing: yes · Remove-wrong: no | Inject: yes | Yes (additive) | Low / High | **A / C** |
| 4 | **Template compliance** | Theme-normalize: yes · Reparent: no | Theme: yes | Theme: yes | Low / High | **A / C** |
| 5 | **Layout consistency** | No (geometry) | Narrowly | Attributes yes, intent no | **High** | **B / C** |
| 6 | **Alignment & spacing** | Narrowly | Narrowly | Attributes yes, intent no | **High** | **B / C** |
| 7 | **Visual density** | No (content edit) | No | No | **Very High** | **C** |
| 8 | **Design consistency** | Narrowly | Narrowly | Risk of flattening intent | **High** | **C (narrow B)** |

### 1. Brand Balance — **Advisory (C)**
Not a directly-fixable property — it's a *derived metric* over the color mix. You can't "set balance to
target" without recoloring shapes or repainting backgrounds, which is destructive (white-forcing a
dark slide, recoloring an image-backed slide). **It improves only as a side effect** of legitimate
color fixes (below). Keep it advisory; never act on it directly.

### 2. Color compliance — **A + B + C (the key split)**
- **A (safe, deterministic):** red-family → `#C00D0D` *(already shipped)*; **near-miss snapping** — any
  color within a small ΔE of a brand color or approved grey → snap to the exact token. This is the
  legitimate Phase-1 win that *will* move Color/Balance for decks that are "almost on-brand."
- **B (approval + preview):** off-brand **shape/text fills** (non-chart) → nearest brand color, shown as
  a before/after the user accepts per color. Reversible, never silent.
- **C (advisory, must NOT auto-fix):** **chart series colors** (in `ppt/charts/*`), **image-derived
  colors**, and **semantic status colors** (a deliberate green "up", amber "caution"). Remapping these
  destroys meaning. Detection must *exclude chart parts* before any remap — this is the single most
  important safety boundary in the whole expansion.

### 3. Logo compliance — **A (inject) / C (remove)**
- **A:** inject the correct logo on a master that lacks one *(already shipped, additive, safe)*.
- **C:** *removing or replacing a foreign logo* — you cannot reliably identify an arbitrary image as "a
  wrong logo," and deleting a picture shifts layout. Flag for human review only.

### 4. Template compliance — **A (theme) / C (reparent)**
- **A:** normalize the theme's `clrScheme`/`fontScheme` to brand *(already shipped)* — global attribute
  change, no reflow.
- **C:** truly *reparenting* slides onto the Datamatics master/layouts — placeholder types won't match,
  content reflows or vanishes. This is a rebuild, not a fix. Advisory only.

### 5. Layout consistency — **B (narrow) / C**
Repositioning means rewriting `<a:off>`/`<a:ext>` geometry. Snapping a *master-inherited placeholder*
back to its master position is a narrow, deterministic **B** (with preview). General "align everything
to a grid" is **C** — overlaps, broken visual relationships, destroyed composition. Editability survives
(it's attributes) but *design intent does not*.

### 6. Alignment & spacing — **B (narrow) / C**
Same family as layout. Distributing/aligning a *user-selected group* is deterministic, but inferring
which shapes form an intentional group from an arbitrary deck is unreliable. Narrow **B** for
snap-to-placeholder; **C (advisory)** for general alignment.

### 7. Visual density — **C (advisory only)**
"Fixing" overload = splitting slides, cutting text, resizing — that is **content authoring and
redesign**, inherently judgment-based and the most destructive thing to automate. Keep it as the
specific per-slide recommendations it already produces.

### 8. Design consistency — **C (narrow B)**
Normalizing *accidental* inconsistencies (e.g., one stray title size) could be a narrow **B**, but most
per-slide overrides encode deliberate emphasis. Auto-normalizing flattens intent. Advisory by default.

---

## Classification summary

| Class | Dimensions / fixes |
|---|---|
| **A — Safe Auto-Fix** | Fonts→Segoe UI ✓ · red-family→#C00D0D ✓ · theme normalization ✓ · logo/footer inject ✓ · **near-miss color/grey snapping (new, safe)** |
| **B — Auto-Fix with user approval** | Off-brand non-chart fill remap (preview per color) · snap placeholder to master position · logo replacement (confirm) |
| **C — Advisory only** | Brand Balance · chart/image/semantic colors · foreign-logo removal · master reparenting · general layout/alignment/spacing · visual density · design consistency |

---

## Phased roadmap

### Phase 1 — Safe deterministic fixes *(extends what's shipped; the honest "more dimensions" win)*
- **Near-miss color snapping:** colors within ΔE tolerance of a brand color or approved grey
  (`F2F2F2`/`D9D9D9`) → snapped to the exact token. **Excludes `ppt/charts/*` and image colors.**
- **Stray-grey normalization:** off-palette greys → nearest approved grey (deterministic, neutral, safe).
- Effect: legitimately lifts **Color** and **Brand Balance** for "almost on-brand" decks, with zero
  semantic risk. *Will not* (and should not) fix genuinely semantic colors like the Gartner deck's chart
  golds/blues — those remain advisory.
- All still gated by the existing editability validator (reject on any text/structure change).

### Phase 2 — User-approved corrections *(preview + accept, reversible)*
- Off-brand **non-chart** fill remap → nearest brand, shown as a per-color before/after the user accepts.
- Snap master-inherited placeholders back to master geometry (preview).
- Logo replacement with explicit confirmation.
- Requires a **diff/preview UI** (render before/after) — a real build, not a tweak.

### Phase 3 — AI-assisted design optimization *(proposals, never auto-applied)*
- Layout / hierarchy / density / storytelling improvements surfaced as **per-slide proposals** the user
  accepts or rejects. AI suggests; the human decides; nothing is silently rewritten.
- This is where "redesign" responsibly lives — always human-in-the-loop.

---

## Bottom line

- **Auto-Fix is already at the safe ceiling for the *token layer*** (fonts, brand red, theme, logo/footer).
- **Phase 1 (near-miss color/grey snapping, chart-excluded)** is the only further work that is both
  *safe and deterministic*, and it directly addresses "more dimensions improve" for almost-on-brand decks.
- **Everything geometric (layout/alignment/spacing/density) or semantic (chart/status colors) must stay
  approval-gated or advisory** — automating it crosses from "fixing" into "redesigning," where content
  damage is the default failure mode.
- **The score staying low on a chart-heavy deck is the product working correctly** — it's telling a human
  "these decisions are yours." Resetting the expectation from "Auto-Fix should max every score" to
  "Auto-Fix safely handles the mechanical layer and *flags* the rest for judgment" is the right framing
  for Wave-1 and for any expansion decision.

*Recommendation: if expansion is funded, do Phase 1 only as a near-term item (safe, high-confidence);
treat Phases 2–3 as gated, post-Wave-1 investments evaluated against measured demand — consistent with
the Govern-first discipline.*
