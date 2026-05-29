# Datamatics Presentation Intelligence — Govern + Fix
## Beta Release Package

Internal-only module at **`/pi/govern`**. Checks any PowerPoint against the Datamatics
design system, scores it, and mechanically corrects fonts + brand colors while keeping
the deck fully editable. Sign in with your **@datamatics.com** email (+ beta access code).

---

## 1. Internal User Guide

**What it does**
- **Analyze** — upload a `.pptx` (from Copilot, Gamma, Canva, a vendor, or hand-built) and get a compliance report: overall score + Typography, Color, Brand Balance, Visual Density, Template.
- **Auto-Fix** — mechanically normalizes fonts → **Segoe UI** and legacy/off-brand reds → **#C00D0D**, then gives you a corrected, still-editable `.pptx`.
- **Flags (not auto-changed)** — off-brand colors (blue/green/orange), non-approved greys, layout/storytelling/density issues are reported for *you* to address.

**How to use it**
1. Go to `/pi/govern` and sign in with your Datamatics email.
2. Drag a `.pptx` onto the upload box (max 40 MB).
3. Read the report. Score bands: **80+ on-brand · 60–79 needs cleanup · <60 heavy cleanup**.
4. Pick a fix mode:
   - **Snap (safe)** — corrects fonts and only reds that are clearly meant to be brand red.
   - **Enforce** — additionally normalizes *all* red-family colors to #C00D0D.
5. Click **Auto-Fix & Download** → open the corrected file in PowerPoint, do any last-mile layout/story work, and use it.
6. Leave 10 seconds of feedback (satisfaction + minutes saved) — it powers the program KPIs.

**The Datamatics design system enforced here**
- Font: **Segoe UI** only (Arial / Calibri / Gill Sans are normalized away).
- Colors: white-first — **White / #C00D0D red / Black**, with **light grey F2F2F2 / D9D9D9** for cards/containers.
- Balance targets: White 60–80% · Light Grey 10–20% · Black ≤20% · Red ≤20%.

---

## 2. Beta Test Guide

**Goal:** confirm the tool reduces your manual cleanup and that corrected decks are usable.

**Please test with real decks you'd normally clean up.** For each:
1. Note (roughly) how long you'd *normally* spend fixing it manually.
2. Run Analyze → check the report matches what you'd flag by eye.
3. Auto-Fix → **open the result in PowerPoint** and confirm: text intact, nothing turned into an image, fonts/colors corrected, layout unchanged.
4. Submit feedback: satisfaction (1–5) + the manual minutes it saved.

**What we're listening for**
- Does the score match your judgment?
- Did it miss any violation you'd catch, or wrongly flag something?
- Did the corrected deck open cleanly and stay editable?
- Roughly what % of your usual cleanup did it remove?

Report issues via the Support Process (§5).

---

## 3. Known Limitations

- **Mechanical scope only.** Fixes fonts + brand reds + theme normalization. It does **not** fix layout, visual hierarchy, storytelling, spacing, or rewrite content — those are flagged for you.
- **Off-brand non-red colors** (blues/greens/oranges) and **non-approved greys** are *flagged, not auto-changed* (forcing them to brand would destroy meaning).
- **Logo/footer:** detected and reported; **not yet auto-inserted/repaired** (planned).
- **Brand Balance** is measured over *explicitly-set colors* (where pollution lives), not rendered pixel area — directionally accurate, not a pixel audit.
- **`.pptx` only.** Legacy `.ppt` must be re-saved as `.pptx`; password-protected/corrupt files are rejected with a message.
- **40 MB** upload limit.
- **Images are never modified** (logos inside images, photos, etc. are untouched).
- Charts/SmartArt/video objects are preserved untouched but not analyzed for brand.

---

## 4. FAQ

**Will it break my deck?** No. Every fix is validated — if text isn't byte-identical or anything would rasterize, the fix is rejected and your original is returned untouched. Output stays fully editable in PowerPoint.

**Does my deck leave Datamatics?** No. Processing happens server-side in-memory with no external/third-party calls and no AI API. Nothing is sent outside.

**Why is my white-heavy deck flagged "low white"?** Balance is measured over colors you *explicitly set*. Theme/background white isn't counted — the flag means your explicit styling skews dark/red.

**It changed my reds — I wanted a different red.** Datamatics red is #C00D0D. If you need an exception, raise it with the Brand team (§5); the ruleset is owned by Creative/Brand.

**It didn't fix the layout / wording.** By design — those need a human. The tool handles the mechanical ~60–70%.

**Who can see my runs?** Runs are logged for governance KPIs (your email, filename, scores, fixes). Visible to the PI program owners (Creative/Brand + admins).

**Lost my session?** Sessions last 8 hours; just sign in again.

---

## 5. Support Process

- **Bugs / wrong fixes / broken decks:** report to the **PI Beta channel** (Teams) or email the PI program owner. Include: the original `.pptx` (or its name), what you expected, what happened, and a screenshot of the report.
- **Brand-rule disputes** (a font/color/grey you believe is valid): route to the **Creative & Brand team** — they own `src/lib/pi/ruleset.ts`. Rule changes ship as a versioned ruleset update.
- **Access problems** (can't sign in, no beta code): contact the PI admin for your @datamatics.com allow-list + access code.
- **Severity:** broken-deck/editability issues are **P1** (stop-ship signal — the editability gate should make these near-impossible; report immediately). Scoring/flag accuracy is **P2**. UX/wording is **P3**.
- **Response:** P1 same-day; P2/P3 batched into the next ruleset/UX iteration.

---

*Engineering references: `fixtures/pi/PHASE0-FINDINGS.md` (ruleset extraction), `fixtures/pi/READINESS-REVIEW.md` (production review), `.claude/plans/delightful-hugging-bird.md` (strategy + specs).*
