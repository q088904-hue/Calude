# Wave-1 Measurement Plan — Govern + Fix

**Wave-1 is a measurement phase, not a benefits launch.** Its #1 objective is to answer the question
the entire roadmap hinges on:

> ## PRIMARY OBJECTIVE: What is the actual mechanical-vs-design cleanup split?
> Of the time the Creative team spends cleaning up a deck, how much is **mechanical** (fonts, colors,
> template, logo, footer — what PI automates) versus **design** (layout, storytelling, executive
> polish — what PI does *not* do)? This single number determines whether Generate is worth building.

---

## 1. Why this is the primary business-validation activity

PI automates mechanical cleanup. If mechanical is the **majority** of effort, PI's value is large and
Generate is justified. If mechanical is a **minority**, PI fixes the cheap part and the real
investment should go to layout/storytelling intelligence instead. **We cannot decide the roadmap
without this measurement.** Everything else (adoption, satisfaction) is secondary to it.

## 2. The four time categories (measured per deck)

For each deck a Creative team member cleans up during Wave-1, record minutes in four buckets:

| # | Category | What counts | PI addresses it? |
|---|---|---|---|
| 1 | **Mechanical corrections** | fonts, brand colors, template/master, logo, footer, spacing-to-grid | ✅ automated |
| 2 | **Layout corrections** | alignment, composition, element placement, sizing, visual hierarchy | ❌ flagged only |
| 3 | **Storytelling improvements** | narrative flow, slide sequencing, message clarity, content restructuring | ❌ not addressed |
| 4 | **Executive polish** | final refinement, emphasis, "boardroom-ready" finishing | ❌ not addressed |

**Mechanical share = Cat 1 ÷ (Cat 1 + 2 + 3 + 4).** This ratio is the headline Wave-1 output.

## 3. How to measure (lightweight, low-friction)

- **Baseline (first, before heavy PI use):** for ~10 representative inbound decks, the Creative member
  logs minutes in the four buckets for a *normal manual* cleanup (no PI). A simple shared sheet:
  `deck · source tool · Cat1 · Cat2 · Cat3 · Cat4 · total · notes`.
- **With-PI:** for subsequent decks, run PI first, then log: PI's auto-fix handled [Cat1 portion];
  remaining minutes by category. Compare to baseline.
- **Triangulate** the self-reported minutes with two objective signals already captured:
  PI's **score lift** (before→after) and **violations auto-fixed** (from `/api/pi/metrics`).
- Keep it to <2 minutes of logging per deck — accuracy of the *ratio* matters more than precision of
  absolute minutes.

## 4. Secondary metrics (from the live system)

| Metric | Source | Why |
|---|---|---|
| Decks governed · unique users · repeat use | `/api/pi/audit`, `/api/pi/metrics` | adoption is real, not assumed |
| Independent time-saved (real users, not builder) | feedback | converts the N=1 builder result into real evidence |
| Compliance score lift | `pi_runs` | objective mechanical-improvement signal |
| Satisfaction (1–5) · would-reuse | `pi_feedback` | trust |
| **Editability preservation** | validation gate | **must stay 100% — any failure halts Wave-1** |
| Format coverage | usage notes | does the ruleset fit real marketing decks, not just proposals |

## 5. Sample & duration
- **Who:** Creative & Brand (Wave 1) on their real inbound queue; Marketing joins once entry criteria met.
- **Baseline sample:** ≥10 decks measured across the four categories before broad PI reliance.
- **Duration:** 30 days. **Minimum to read the split with confidence:** ≥15 decks total, ≥5 users.

## 6. Wave-1 deliverable (input to Day-30)
A one-page measurement readout:
1. **The mechanical-vs-design split** (the headline ratio + the four-bucket breakdown).
2. Adoption + independent time-saved + score lift + satisfaction.
3. Editability preservation (must be 100%).
4. Format-coverage notes + any ruleset gaps found.
→ feeds directly into the **Decision Matrix** and the **30-Day Review Deck**.

## 7. Guardrails
- **Measure the baseline FIRST** — before PI habits form, or the comparison is lost.
- **Honesty over optics** — under-counting mechanical or over-counting saved time poisons the
  roadmap decision. The goal is the *true* split, even if it's unfavorable to PI.
- **Editability is a stop condition** — if it ever drops below 100%, pause and fix before continuing.
