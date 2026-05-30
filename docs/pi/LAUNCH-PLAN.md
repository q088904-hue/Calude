# PI Govern + Fix — Internal Launch Plan & Success Framework

How we roll out Govern + Fix internally, support it, measure it, and decide whether to fund Generate.

---

## 1. Rollout Sequence (evidence-led, not big-bang)

| Wave | Audience | Why this order | Entry criteria |
|---|---|---|---|
| **1** | **Creative & Brand** (owners) | They are the bottleneck the tool relieves, and they own the ruleset. They validate scoring against their own eye. | Go-Live verification passed |
| **2** | **Marketing** | Brand-literate, tolerant of AI drafts, high volume of branded collateral. | Wave-1 satisfaction ≥3.5/5, editability 100% |
| **3** | **Pre-Sales / Proposals** | Highest *expected* volume (RFP/proposal cleanup) — ROI to be measured — but highest-stakes/lowest-trust, so earns from Waves 1-2 proof. | Wave-2 adoption steady |
| **4** | **Sales / Leadership** | Account decks, board decks; visibility drives org pull. | 30-Day Review = positive |

Principle: **expand by pull, on evidence.** No wave opens until the prior wave's signal clears.

### Creative Team rollout (Wave 1)
- Position the tool as a **force-multiplier, not a replacement** — it removes the mechanical 60–70%
  (fonts, brand reds, template, logo/footer) so they focus on layout, hierarchy, and storytelling.
- They run their *existing* inbound cleanup queue through `/pi/govern` — zero extra recruitment.
- They are the ruleset owners: any "this should/shouldn't be flagged" feedback updates `ruleset.ts`.

### Marketing rollout (Wave 2)
- Use on campaign decks, one-pagers, event collateral.
- Goal: expand template/ruleset coverage and confirm brand-balance + density flags are useful.

### Pre-Sales rollout (Wave 3)
- Use on real proposal/RFP decks; capture cleanup-minutes-saved per deck (the headline ROI number).
- Set expectation: "first-pass mechanical cleanup, last-mile in PowerPoint."

## 2. Communication Plan

| When | Audience | Message |
|---|---|---|
| Launch −2 days | Wave-1 leads | Heads-up + 20-min training slot booked |
| Launch day | Wave 1 | URL + access code + Quick Start link; "run your next 5 inbound decks through it" |
| Weekly | Wave participants | KPI snapshot + "keep submitting feedback" nudge |
| Each wave start | Next wave | Short note: what it does, link to User Guide, access code |
| Day 30 | Leadership | 30-Day Review (see template) |

Keep messaging honest: **mechanical cleanup automation**, not "AI makes perfect decks." Over-promising
is the fastest way to lose the Creative team's trust.

## 3. Training Plan

- **Format:** one 20-minute live walkthrough per wave + the written Quick Start.
- **Content:** sign in → drag a real deck → read the report (the 5 scores) → Snap vs Enforce →
  Auto-Fix & Download → open in PowerPoint → submit feedback.
- **Emphasize:** editability is guaranteed (safe to try on anything); off-brand non-reds / layout /
  story are *flagged, not changed* — those stay your job.
- **Leave-behind:** `docs/pi/USER-GUIDE.md`.

## 4. Support Model

| Tier | Channel | Scope | Target |
|---|---|---|---|
| Self-serve | User Guide + FAQ | how-to, score meaning | — |
| L1 | PI Beta channel (Teams) | access issues, usage questions | same day |
| L2 | PI admin | env/access/persistence, audit/KPI pulls | same day |
| Brand | Creative & Brand team | ruleset disputes (font/color/grey) → versioned ruleset update | next iteration |
| Engineering | repo owner | **P1 editability/broken-deck** defects only | immediate |

Severity: **P1** broken-deck/editability (stop-ship signal — should be near-impossible due to the
gate; report immediately) · **P2** scoring/flag accuracy · **P3** UX/wording.

---

## 5. Success Measurement Framework

Pull from `GET /api/pi/metrics` (+ `pi_runs`/`pi_feedback`). Review **weekly**.

### Weekly KPI review (10-min standing item)
| Metric | Source | Watch for |
|---|---|---|
| Decks governed (total + this week) | pi_runs | flat = adoption stall |
| Unique active users | pi_runs | breadth of adoption |
| Avg compliance score lift | pi_runs before→after | should be solidly positive |
| Violations detected / auto-fixed | pi_runs | volume of mechanical work removed |
| **Editability preservation rate** | pi_runs | **must stay 100% — any dip = P1** |
| Avg satisfaction (1-5) | pi_feedback | trust signal |
| Total cleanup minutes saved | pi_feedback | the headline ROI |

### Adoption metrics
- Decks/week trend; unique users/week; % of invited users who ran ≥3 decks (activation).
- Repeat usage (users returning week over week).

### Satisfaction metrics
- Mean satisfaction; % "would reuse"; % "manual still needed" (lower trends = more trust).

### Compliance improvement metrics
- Avg before vs after score; distribution shift toward 80+; brand-incident reports (target → 0).

### Cleanup effort reduction metrics
- Sum of `estimatedMinutesSaved`; minutes saved per deck; (qualitative) Creative team's reported
  change in cleanup queue volume.

---

## 6. Generate Readiness Gate

**Generate (Phase 1A) is NOT approved until ALL of these hold at the 30-Day Review:**

| Gate | Threshold |
|---|---|
| **Adoption** | ≥ 15 real decks governed across ≥ 5 unique Datamatics users (Waves 1–2) |
| **Satisfaction** | mean ≥ 3.5 / 5 AND ≥ 60% "would reuse" |
| **Compliance** | average score lift ≥ +15 points; majority of fixed decks reach 80+ |
| **Cleanup reduction** | demonstrable Creative-effort reduction — median ≥ 50% of mechanical cleanup time removed (from feedback minutes vs. baseline) |
| **Editability** | 100% preservation maintained across all runs (non-negotiable) |
| **Brand sign-off** | Creative & Brand confirm scoring matches their judgment |

If all clear → fund Generate per `docs/pi/GENERATE-SPEC.md` (gated, ~3 weeks, reuses this engine).
If partially clear → iterate Govern (ruleset/UX) and re-review in 30 days. If editability ever
drops below 100% → halt and fix before anything else.
