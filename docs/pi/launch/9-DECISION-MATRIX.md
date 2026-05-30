# Day-30 Decision Matrix — Govern + Fix → Roadmap

At Day-30, Wave-1's measured evidence (esp. the **mechanical-vs-design split** and **adoption**) maps
to exactly one recommendation. Decide on evidence, not enthusiasm.

---

## Decision logic (in order)

**Step 1 — Adoption gate (overrides everything).**
If adoption is low → **Scenario C**, regardless of the split.
*(Low = below ~15 decks / ~5 users, or editability ever <100%, or Creative won't use it on the live queue.)*

**Step 2 — If adoption is healthy, read the mechanical-vs-design split.**
- Mechanical = **majority** of cleanup effort → **Scenario A**.
- Mechanical = **minority** of cleanup effort → **Scenario B**.

---

## Scenario A — Mechanical cleanup is the MAJORITY of effort
**Evidence:** mechanical share > ~50% of measured cleanup time; adoption healthy; satisfaction ≥3.5;
score lift ≥+15; editability 100%; Creative sign-off.
**What it means:** PI is automating the bulk of the real work; auto-*generating* on-brand decks
multiplies that value.
**Recommendation → PROCEED WITH GENERATE (Phase 1A).**
- Fund per `GENERATE-SPEC.md` (~3 weeks, reuses this engine, closed-loop compliance).
- Continue Govern rollout to Waves 3–4 in parallel.
- Require: named owner, funded ruleset maintenance, Generate TCO vs. measured Govern return.

## Scenario B — Mechanical cleanup is a MINORITY of effort
**Evidence:** mechanical share < ~50%; most cleanup time is layout / storytelling / executive polish;
adoption may still be healthy and PI still useful for the mechanical slice.
**What it means:** PI solves the cheap part; the expensive part (design judgment) is untouched.
Generating *mechanically* perfect decks would not address the real bottleneck.
**Recommendation → PRIORITIZE LAYOUT & STORYTELLING INTELLIGENCE instead.**
- **Keep Govern + Fix in production** (it still removes real mechanical toil — it's built and cheap).
- **Do NOT fund Generate yet.** Redirect roadmap thinking toward layout/hierarchy/storytelling
  assistance (a different, harder problem — scope it separately before any build).
- Re-evaluate Generate only if/when the design-intelligence direction is assessed.

## Scenario C — Low adoption
**Evidence:** few decks / few users; or Creative won't run it on the live queue; or editability
failures; or satisfaction < 3.5.
**What it means:** we can't trust any split or ROI signal — the sample isn't real.
**Recommendation → PAUSE ROADMAP EXPANSION.**
- **Do NOT fund Generate or any new build.**
- Diagnose the adoption blocker (trust? friction? fit? change management? a defect?).
- Either fix the blocker and re-run a measurement window, or sunset gracefully — Govern + Fix remains
  available for any team that finds it useful, at near-zero run cost.

---

## Summary

| Scenario | Trigger | Recommendation |
|---|---|---|
| **A** | Adoption healthy **and** mechanical = majority | **Proceed with Generate** |
| **B** | Adoption healthy **and** mechanical = minority | **Prioritize Layout & Storytelling Intelligence; hold Generate** |
| **C** | Low adoption / editability failure | **Pause roadmap expansion; diagnose adoption** |

**Principle:** the split decides *what* to build next; adoption decides *whether* to build at all.
Either way, Govern + Fix stays in production — it is built, validated, and cheap to run.

**Day-30 decision:** ☐ A  ☐ B  ☐ C   ·   Sponsor sign-off: __________  ·  Date: ______
