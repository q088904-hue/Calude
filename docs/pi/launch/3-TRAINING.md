# Training Package — Govern + Fix v1

For the per-wave 15-minute live walkthrough. Companion: `docs/pi/USER-GUIDE.md`.

---

## 1. 15-Minute Walkthrough Agenda

| Min | Segment | Goal |
|---|---|---|
| 0–2 | **Why this exists** | The Creative cleanup bottleneck; what v1 does (mechanical fixes) and doesn't (layout/story). Set honest expectations. |
| 2–4 | **Sign in** | Datamatics email + access code; 8-hour session; data never leaves Datamatics. |
| 4–8 | **Live demo** | Upload a real off-brand deck → read the report → Snap vs Enforce → Auto-Fix & Download → open in PowerPoint. |
| 8–11 | **Read the report** | The 5 scores; what's auto-fixed vs. flagged; Brand Balance + Visual Density meaning. |
| 11–13 | **Feedback + rules** | Submit satisfaction + minutes saved; how to dispute a rule (Creative owns it). |
| 13–15 | **Q&A + next step** | "Run your next 5 real decks through it this week." Share support channel. |

---

## 2. Demo Script (verbatim-ready)

> "This is Govern + Fix. The job it does is the cleanup the Creative team does by hand today —
> fonts, brand colors, template, logo — automatically, in seconds, and the deck stays fully editable."

1. **Sign in.** "Datamatics email, the beta code. Nothing here leaves our environment — it's processed
   in-memory, no external AI calls."
2. **Upload.** "I'll drop in a real deck someone built in [Gamma/Canva]. Any .pptx works." *(drag file)*
3. **Read the score.** "It scored **[X]/100** — needs cleanup. Look: Typography flags Arial and
   Calibri, Color flags these non-brand reds, Brand Balance says it's too dark/red versus our
   white-first standard, and Visual Density flags slide [N] as overloaded."
4. **Explain the split.** "Notice what it will *fix* — fonts and brand reds — versus what it just
   *flags* for me — layout and that off-brand blue. It never guesses at design; that stays human."
5. **Fix.** "I'll use **Snap** — the safe mode. Click Auto-Fix & Download." *(file downloads)*
6. **Prove editability.** *(open in PowerPoint)* "Open it — every text box is still editable, fonts
   are now Segoe UI, the reds are Datamatics #C00D0D, logo and footer are in place. Score went
   **[X] → [Y]**. Nothing turned into an image."
7. **Feedback.** "I rate it and note it saved me ~[N] minutes. That number is what decides our next
   phase."
8. **Close.** "That's it — under a minute. Try it on your real decks this week."

*Backup if upload fails live:* show the pre-captured before/after from the validation set (52 → 73).

---

## 3. User Onboarding Checklist

**Per user:**
- [ ] Has a Datamatics email; knows the access code.
- [ ] Can reach [URL] and sign in successfully.
- [ ] Has watched/attended the 15-min walkthrough (or read the User Guide).
- [ ] Has run **one real deck** end-to-end (analyze → fix → download → open in PowerPoint).
- [ ] Has submitted **one feedback entry** (rating + minutes saved).
- [ ] Knows where to report issues ([channel]) and the P1 rule (broken/non-editable deck = report immediately).

**Per wave (admin):**
- [ ] Invite list confirmed (all @datamatics.com).
- [ ] Training session scheduled; User Guide link shared.
- [ ] Wave entry criteria from the prior wave met (see Launch Plan).
- [ ] KPI baseline noted before wave starts.

---

## 4. FAQ (training quick-reference)

**Will it break my deck?** No — fixes are validated; if anything would change your text or rasterize
content, the fix is rejected and your original returned. Always editable.

**Does my deck leave Datamatics?** No. In-memory, server-side, no external/AI calls. Only metadata
(filename, scores, fixes, your email) is logged for KPIs.

**What does it actually change?** Fonts → Segoe UI; legacy/off-brand reds → #C00D0D; theme
normalized; logo + slide-number badge added if missing.

**What won't it change?** Layout, hierarchy, storytelling, content, and off-brand non-red colors
(blue/green) — those are flagged for you.

**Snap vs Enforce?** Snap (default, safest) fixes fonts + obvious brand reds. Enforce unifies *all*
reds to brand red.

**It flagged "low white" on my white deck.** Balance measures colors you explicitly set, not
background white — it means your styling skews dark/red.

**A rule seems wrong.** Tell the Creative & Brand team — they own the ruleset; valid changes ship as
an update.

**File limits?** `.pptx` only, up to 40 MB. Re-save legacy `.ppt` as `.pptx`.

**Lost my session?** 8-hour sessions — just sign in again.
