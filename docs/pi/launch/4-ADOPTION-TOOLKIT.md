# Adoption Toolkit — Govern + Fix v1

Copy-paste templates for running the pilot. Data sources: `GET /api/pi/metrics`, `GET /api/pi/audit`,
and the `pi_feedback` table.

---

## 1. Weekly KPI Review Template

**Govern + Fix — Week [N] KPI Review** · Date: ______ · Owner: ______

| Metric | This week | Cumulative | Δ vs last week | Notes |
|---|---|---|---|---|
| Decks governed | | | | |
| Unique active users | | | | |
| Repeat users (returned) | | | | |
| Avg compliance lift (before→after) | | | | |
| Violations detected / auto-fixed | | | | |
| **Editability preservation** | | | | **must be 100%** |
| Avg satisfaction (1–5) | | | | |
| "Would reuse" % | | | | |
| Cleanup minutes saved (sum) | | | | |

**Adoption read:** [ Growing / Flat / Stalled ] — why: ______
**Top issue this week:** ______ → action/owner: ______
**Ruleset changes requested:** ______
**Decision/flag for leadership:** ______

> 🚩 If editability < 100% at any point: stop rollout, treat as P1, fix before continuing.

---

## 2. User Feedback Template

*(Captured in-app after each fix; this is the manual/longer-form version for interviews or written feedback.)*

- Name / Team: ______
- Deck type (proposal / marketing / internal / other): ______
- Source tool (Copilot / Gamma / Canva / PowerPoint / other): ______
- Compliance score before → after: ______ → ______
- **Minutes this saved vs. doing it manually:** ______
- Did the corrected deck open cleanly and stay editable? [ Yes / No ]
- Did the scoring match what you'd have flagged by eye? [ Yes / Mostly / No ] — what was off: ______
- Satisfaction (1–5): ______   Would you use it again? [ Yes / No ]
- Anything it should have fixed but didn't (or wrongly flagged)? ______
- One thing that would make it more useful: ______

---

## 3. Issue Reporting Template

**[PI Issue] <short title>**

- Reporter / Team: ______   Date: ______
- Severity: [ **P1** broken/non-editable deck · **P2** wrong score/flag · **P3** UX/wording ]
- What you did (steps): ______
- What you expected: ______
- What happened: ______
- Deck attached? [ Yes — original .pptx ] (required for P1/P2)
- Screenshot of the report attached? [ Yes / No ]
- Score before → after (if relevant): ______

*Routing: P1 → engineering immediately · P2 → Creative/Brand + admin (ruleset) · P3 → next UX iteration.*

---

## 4. Success Story Template

*(For internal comms + the 30-day review — turn wins into momentum.)*

**Headline:** e.g. "Pre-Sales cut RFP deck cleanup from 90 to 20 minutes"

- Team / person: ______
- The situation: what deck, what deadline, what state it was in. ______
- With Govern + Fix: score [X]→[Y], [N] violations fixed, **[M] minutes saved**, still fully editable.
- In their words (quote): "______"
- Why it matters: (faster turnaround / freed Creative time / on-brand to client). ______
- Proof: before/after screenshot or score delta.

*Use 2–3 of these as anchor slides in the 30-Day Review.*
