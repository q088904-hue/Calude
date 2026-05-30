# Pre-Rollout Executive Review — Govern + Fix (Investment-Committee Red Team)

**Purpose:** surface blind spots BEFORE the leadership rollout. Deliberately critical.
**Stance:** the product is built and cheap to run; the *business case* is still largely unproven.
The dominant risk is **over-claiming at the leadership meeting on an N=1 result.**

---

## THE ONE-LINE FINDING

> We have a **validated engine** and an **unvalidated business case.** The only hard number is
> **one deck, 52→73, fixed by the builder.** Every benefit — time saved, Creative effort reduced,
> adoption — is *projected.* Present Wave-1 as a **measurement experiment**, not a finished win, or
> leadership will (correctly) puncture it.

---

## Stakeholder Challenges

### CEO
1. **Questions:** Is this a strategic capability or an internal convenience? Who owns it after engineering pauses? Does it differentiate Datamatics or just tidy our slides?
2. **Objections:** "We're a transformation company — why is leadership time on a slide-cleanup tool?" "Show me this isn't a science project that becomes shelfware."
3. **Risks:** Orphaned post-launch (no owner); distracts from core revenue; reputational if we tout AI internally and it underwhelms.
4. **Weaknesses:** No named operational owner/budget line after the pause. No link to a revenue or client outcome.
5. **Missing metrics:** Strategic — does this become a *client offering* (transformation play), or stay internal-only forever?
6. **Missing evidence:** Any external/market signal that brand-governance-as-a-product has pull.
7. **Funding concerns:** Small now, but what's the ongoing ownership cost vs. strategic payoff?
8. **Adoption concerns:** Will it survive once the novelty and the builder's attention move on?

### CIO
1. **Questions:** Where does governance data live, and is it backed up? What's the auth model? What's the support/maintenance burden?
2. **Objections:** "A **shared beta access code** is not access control." "No SSO, no per-user revocation, no RBAC — yet you call it a governance/audit system."
3. **Risks:** Metrics on **local JSONL** if Supabase isn't wired = data loss / no audit durability. Single maintainer = bus factor. Shadow-IT precedent.
4. **Weaknesses:** Lightweight auth (domain + shared code) is inconsistent with the "audit trail / governance" positioning. No DR/backup story stated.
5. **Missing metrics:** Uptime/SLA, error rate, mean processing time at load, storage durability.
6. **Missing evidence:** A security/privacy sign-off; confirmation that "no data leaves Datamatics" holds in the actual deployment topology.
7. **Funding concerns:** Who funds run-cost, maintenance, and the standing ruleset-maintenance role?
8. **Adoption concerns:** If it's not in SSO/the standard toolchain, will IT support it or will it die as unsupported.

### CFO
1. **Questions:** What did it cost to build? What does it cost to run and maintain per year? What's the measured baseline it's improving? What's the actual ROI, not the framework?
2. **Objections:** "**Self-reported minutes saved** is not a financial metric." "You never measured how much the Creative team actually spends today — so the denominator of every ROI claim is a guess." "N=1 is not validation."
3. **Risks:** ROI evaporates if the *real* cleanup cost is layout/storytelling (which this does NOT fix), not fonts/colors. Sunk-cost framing.
4. **Weaknesses:** **No TCO. No measured baseline. No build-vs-buy comparison** (locked .potx + Copilot + a macro could cover part of this near-free).
5. **Missing metrics:** Current cleanup hours/quarter; mechanical-vs-design split of that effort; fully-loaded cost per deck; maintenance FTE fraction.
6. **Missing evidence:** Any independent (non-builder) measurement of time saved.
7. **Funding concerns:** Recurring ruleset-maintenance cost is unquantified; Generate is a *new* spend with no proven return on Govern yet.
8. **Adoption concerns:** If adoption is low, fixed maintenance cost has no offsetting benefit.

### Head of Sales
1. **Questions:** Does this make us win more / faster? Does it slow reps down with another step?
2. **Objections:** "Reps won't add an upload-review-fix step before a deadline unless it clearly nets them time." "It doesn't fix the parts clients judge — story and layout."
3. **Risks:** Net-negative time if the new friction > cleanup saved; reps bypass it; false confidence that a 'fixed' deck is client-ready when only brand mechanics changed.
4. **Weaknesses:** No evidence tied to win-rate or cycle time; pre-sales is highest-stakes/lowest-trust (the adoption paradox).
5. **Missing metrics:** Time-to-finished-deck delta for a real proposal; rep adoption rate; any win/cycle correlation.
6. **Missing evidence:** A real pre-sales deck taken end-to-end by a rep (not the builder).
7. **Funding concerns:** Low direct — but skeptical the benefit reaches revenue.
8. **Adoption concerns:** Highest barrier of all waves — reps cling to their own polished templates on high-stakes bids.

### Head of Marketing
1. **Questions:** Does it handle our real formats and volume? Does it respect campaign creativity or flatten it?
2. **Objections:** "Brand is more than fonts and one red — what about imagery, tone, sub-brands, campaign palettes?" "Will it flag our intentional creative choices as 'off-brand'?"
3. **Risks:** Over-rigid enforcement frustrates creative work; false positives erode trust; doesn't cover the breadth of real marketing collateral.
4. **Weaknesses:** White-first / single-red model may be too narrow for campaign work; off-brand non-reds are only flagged, so marketing still does manual color work.
5. **Missing metrics:** Coverage — % of real marketing decks the ruleset actually fits; false-positive rate on intentional design.
6. **Missing evidence:** Tested on actual campaign decks, not just a proposal.
7. **Funding concerns:** Low.
8. **Adoption concerns:** Will treat it as a constraint unless it visibly saves them time; needs to feel like an ally, not a brand cop.

### Head of Creative (the owner — and the conflict)
1. **Questions:** Does it actually match my standards? Who's accountable when it gets a rule wrong? Does "I own the ruleset" mean real authority or just blame?
2. **Objections:** "It only does the easy 60–70% — the hard cleanup (layout, hierarchy, story) still lands on me." "Validating a tool that automates my team's work is a conflict — and a quiet headcount question."
3. **Risks:** Team disengages or rubber-stamps; ruleset maintenance becomes an unfunded chore; quality bar slips if people trust 'fixed' = 'good.'
4. **Weaknesses:** Adoption depends on the exact team being partly automated; "force-multiplier vs. replacement" is a promise, not yet a proof.
5. **Missing metrics:** Real mechanical-vs-design effort split; ruleset-maintenance time; queue-volume change.
6. **Missing evidence:** That the team will champion (not tolerate) it.
7. **Funding concerns:** Standing ruleset-ownership time must be funded, not assumed.
8. **Adoption concerns:** If framed as cost-cutting/automation-of-them, they kill it from inside.

---

## A. Toughest Questions Leadership Will Ask

1. **"What's the measured baseline — how many hours does cleanup actually cost today?"** (We don't have it.)
2. **"One deck fixed by the person who built it — that's your validation?"**
3. **"Is self-reported 'minutes saved' really your ROI metric?"**
4. **"If the hard cleanup is layout and story, and this only fixes fonts and colors, are you solving the cheap 20% of the problem?"**
5. **"Why build and maintain this instead of a locked template + Copilot?"**
6. **"A shared access code is your governance/security model?"**
7. **"Who owns and funds this after engineering pauses — and the ongoing ruleset upkeep?"**
8. **"Why these exact Generate-gate numbers (15 decks / 5 users / +15)?"**

## B. Recommended Answers (honest, not defensive)

1. **Baseline:** "Correct — and Wave-1's first action is to measure it. We instrument cleanup minutes from day one; we do not claim ROI before we have it."
2. **N=1:** "The engine is *deterministic* — its correctness (editability, brand mapping) is proven structurally and on a real deck, not statistically. Business value is explicitly what Wave-1 measures; we're not asserting it yet."
3. **Self-reported:** "It's a leading indicator, triangulated with Creative's queue-volume change and objective score lift. We'll treat it as directional, not audited finance."
4. **Cheap-20% risk:** *(the real one)* "Unknown until Wave-1 measures the mechanical-vs-design split. If mechanical is a small share, we say so and stop — that's the gate's job."
5. **Build-vs-buy:** "Build cost is sunk and small; the differentiator is *enforced Datamatics-specific* governance + data residency that a generic template/Copilot can't give. But if Wave-1 shows a template+macro covers it, we won't over-invest."
6. **Auth:** "Beta-grade by design for a controlled internal pilot behind the corporate network; SSO/RBAC is a known, scoped upgrade before any broad release — not pretended to be enterprise-grade today."
7. **Ownership:** "Needs a decision today: name an operational owner + fund a fractional ruleset-maintenance role. Without it, this becomes shelfware — flagging that as a condition, not a footnote."
8. **Gate numbers:** "Deliberately modest thresholds to detect *real signal* cheaply, not statistical proof. Adjust them now if you want a higher bar."

## C. Where The Project Is Strong (evidence-backed)

- **Engine is genuinely de-risked:** editability preserved (self-rejecting fixes), real-deck pass (52→73), robust to bad inputs, fast, tested, documented.
- **Zero data egress / no secrets** — a real, rare security/residency strength.
- **Right strategic sequencing** — Govern before Generate; gated; no premature spend.
- **Cheap to try** — built, low run-cost; Wave-1 is near-zero marginal cost.
- **Honest scoping** — explicitly mechanical-only; doesn't pretend to fix design.

## D. Where The Project Is Weak (must own these)

- **No measured baseline** → every ROI number is currently a guess.
- **N=1, builder-run validation** → no independent, real-user evidence.
- **May address the cheap part of the problem** (mechanical) and leave the expensive part (design/story).
- **Auth + persistence are beta-grade** vs. the governance/audit positioning.
- **Adoption depends on the team being automated** (Creative) — structural conflict.
- **No TCO, no named post-launch owner, no funded ruleset-maintenance role.**
- **Gate thresholds are asserted, not derived.**

## E. What Wave-1 MUST Demonstrate

1. **Measured baseline** — real cleanup minutes/deck *before* PI, and the mechanical-vs-design split.
2. **Independent time saved** — by real users (not the builder), on real decks.
3. **Editability holds at 100%** across all real decks (any failure = stop).
4. **Creative genuinely adopts** — uses it on the live queue and reports reduced effort, not just tolerates it.
5. **Scoring matches the human eye** — Creative confirms the tool flags what they'd flag.
6. **Real format coverage** — works on actual proposal + marketing decks, not just the IDP sample.
7. **Net-positive friction** — saved time clearly exceeds the added upload/review step.

## F. Evidence Required Before Funding Generate

- All Wave-1 demonstrations (E) met, **plus** the gate: ≥15 decks / ≥5 users · satisfaction ≥3.5 & ≥60% reuse · score lift ≥+15 · **median ≥50% mechanical-cleanup time removed (measured, not self-asserted)** · editability 100% · Creative sign-off.
- **A named owner + funded maintenance** for Govern in production.
- A one-page TCO for Generate (build + run + maintenance) against the measured Govern return.
- Confirmation the mechanical share of cleanup is large enough that *generating* on-brand decks is worth more than *fixing* them.

## G. Final Investment Recommendation

**PROCEED TO WAVE-1 — as a measurement experiment, not a launch — with conditions.**

- It is cheap to run and the engine is real; **not** proceeding would waste sunk work.
- **But reframe the leadership rollout:** lead with "built at low cost, now we *measure* whether the benefit is real," not "validated and beneficial." The exec deck's `[projected]` numbers must be presented as hypotheses Wave-1 tests — overselling N=1 is the single biggest reputational risk.
- **Conditions before rollout:** (1) name an operational owner; (2) fund the fractional ruleset-maintenance role; (3) Wave-1's first task is to **measure the baseline + mechanical/design split**; (4) wire Supabase persistence (don't run governance on ephemeral JSONL); (5) restate the auth as beta-grade with an SSO upgrade path.
- **Do NOT fund Generate** until F is satisfied with *measured* (not projected) evidence.

**Bottom line:** approve a disciplined, instrumented Wave-1. Withhold any benefit claims and any
Generate spend until the numbers are real. The work to date earns the experiment — not the victory lap.
