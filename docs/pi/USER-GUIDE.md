# PI Govern + Fix — User Guide

Make any PowerPoint Datamatics-compliant in under a minute — and keep it fully editable.
For Datamatics employees. (Companion to the one-page `RELEASE-PACKAGE.md`.)

---

## Quick Start

1. Go to **`/pi/govern`** and sign in with your **@datamatics.com** email (+ beta access code if asked).
2. **Drag a `.pptx`** onto the upload box (any source — Copilot, Gamma, Canva, vendor, hand-built).
3. Read your **compliance report**.
4. Choose **Snap (safe)** or **Enforce**, click **Auto-Fix & Download**.
5. Open the corrected deck in PowerPoint, do any last-mile layout/story polish, use it.
6. Leave 10 seconds of feedback — it powers the program.

Sessions last 8 hours. Max file size 40 MB. `.pptx` only (re-save legacy `.ppt` as `.pptx`).

## Upload → Analyze → Fix workflow

- **Analyze** — we read your deck's OOXML (no rendering, nothing leaves Datamatics) and score it on
  five dimensions, listing exactly what's off-brand and where.
- **Auto-Fix (mechanical, safe)** — we normalize **fonts → Segoe UI** and **legacy/off-brand reds →
  #C00D0D**, fix the theme, and add the **logo + slide-number badge** if missing. Then we *validate*
  the result and only give it to you if your text is byte-identical and nothing was turned into an
  image. If a fix would damage the deck, it's rejected and your original is returned untouched.
- **What we DON'T touch automatically** (flagged for you instead): off-brand non-red colors
  (blues/greens), non-approved greys, layout, visual hierarchy, storytelling, and content. Those need
  a human — you.
- **Snap vs Enforce:** *Snap* corrects fonts and only reds clearly meant to be brand red.
  *Enforce* additionally normalizes every red-family color to #C00D0D.

## Compliance Score explained

An overall 0–100 (weighted) plus five dimension scores. Bands: **80+ on-brand · 60–79 needs cleanup ·
<60 heavy cleanup.**

| Dimension | What it measures |
|---|---|
| **Typography** | Share of text using the approved **Segoe UI**. Arial / Calibri / legacy Gill Sans count against it (and are auto-fixed). Theme tokens and symbol fonts (e.g. Wingdings) are protected, never flagged. |
| **Color** | Share of explicitly-set colors that are brand-valid (white / brand red / black / approved greys). Legacy reds are auto-fixable; off-brand non-reds are flagged for review. |
| **Brand Balance** | Whether your color *mix* follows the white-first system (see below). |
| **Visual Density** | Whether slides are over-loaded / hard to read (see below). |
| **Template** | Whether the deck is built on the Datamatics master/theme. |

## Brand Balance explained (white-first)

Datamatics decks are **white-first**. We measure the mix of your explicitly-set colors against targets:

| Color | Target share |
|---|---|
| White | 60–80% |
| Light grey (F2F2F2 / D9D9D9) | 10–20% |
| Black | ≤ 20% |
| Datamatics Red (#C00D0D) | ≤ 20% |

You'll see flags like **"excessive red," "excessive black," "low white,"** or **"non-approved greys."**
Note: this is measured over colors you *explicitly set* (where off-brand styling lives), not the white
of your slide backgrounds — so "low white" means your deliberate styling skews dark/red, and is a
prompt to lighten it. These are **guidance for you**, not auto-changed.

## Visual Density explained

Flags slides that are hard to consume, using per-slide signals: **text volume, object/shape count,
table density, and whitespace**. A slide hitting two or more thresholds is "overloaded." You'll get
specific advice ("14 objects — reduce to focus attention," "low whitespace — add breathing room,"
"dense table — consider splitting"). The tool does **not** restructure slides for you — it tells you
which slides a reader will struggle with so you can simplify them.

## FAQ

**Will it break my deck?** No. Every fix is validated; if anything would alter your text or rasterize
content, the fix is rejected and your original is returned. Output stays fully editable in PowerPoint.

**Does my deck leave Datamatics?** No. Processing is server-side, in-memory, with no external or AI
calls. We store only metadata (filename, scores, fixes, your email) for governance KPIs — never the
deck content.

**It changed my reds.** Datamatics red is **#C00D0D**; legacy reds (e.g. C00000) normalize to it. Need
an exception? Raise it with the Creative & Brand team — they own the ruleset.

**It didn't fix my layout / wording / a blue chart color.** By design. The tool does the mechanical
~60–70% (fonts, brand reds, template, logo/footer). Layout, hierarchy, storytelling, and off-brand
non-red colors are flagged for you to handle.

**My white-heavy deck shows "low white."** Balance counts colors you explicitly set, not background
white. The flag means your explicit styling is dark/red-heavy.

**Snap or Enforce?** Start with **Snap** (safest). Use **Enforce** when you want every red unified to
brand red.

**Lost my session / asked to sign in again?** Sessions last 8 hours — just sign in again.

**Who sees my runs?** The PI program owners (Creative/Brand + admins) see governance KPIs: your email,
filename, scores, and fixes. Not the deck contents.

**Found a bug or a deck that broke?** Report in the PI Beta channel with the original file, what you
expected, and a screenshot — broken-deck issues are treated as top priority.
