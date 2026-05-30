# Leadership Decision Brief — Govern + Fix (one page)

**Decision requested:** approve a structured, instrumented **Wave-1 measurement phase** (not a benefits launch).
**Date:** ______   **Sponsor:** ______   **Owner (proposed):** ______

---

### A. What has been proven? *(measured / validated)*
- The **technical solution works** on real Datamatics assets: on a real IDP deck it auto-corrected brand mechanics, lifted compliance **52 → 73**, fixed **373/445** violations, and preserved **100% editability** (text byte-identical, nothing rasterized).
- **Security/residency:** processed in-memory, **no external/AI calls, no secrets, no data leaves Datamatics**; full audit trail; internal-only access.
- **Robustness:** rejects corrupt/encrypted/non-PowerPoint files; fast (~24 ms on the test deck); 12/12 engine tests; hardened + documented.

### B. What has NOT been proven? *(no evidence yet)*
- **The cleanup baseline** — how much time the Creative team actually spends today. **Unmeasured.**
- **The mechanical-vs-design split** — what fraction of cleanup is fonts/colors (which we automate) vs. layout/storytelling (which we do not). **Unknown — and decisive.**
- **Time saved, productivity gain, cleanup reduction, ROI** — all **projected, none measured.**
- **Adoption** — no real-user usage yet; the one validation was N=1, run by the builder.
- **Format coverage** — proven on a proposal deck; not yet on real marketing/campaign decks.

### C. Why is Wave-1 necessary?
Because the *engine* is validated but the *business case* is not. Wave-1 converts hypotheses into
measured evidence at near-zero marginal cost (the product is already built). Its **primary purpose is
measurement**, not a benefits announcement — specifically, to establish the baseline and the
mechanical-vs-design split that every ROI and roadmap decision depends on.

### D. What will be measured? *(see Wave-1 Measurement Plan)*
- **Primary:** the cleanup-effort split — minutes on **mechanical** vs **layout** vs **storytelling** vs **executive polish**, before vs. with PI.
- Adoption (decks, unique users, repeat use), independent time-saved (real users, not the builder),
  compliance score lift, satisfaction, and **editability (must hold 100%)**.

### E. What decision is made at Day-30?
One of three, by the **Decision Matrix**:
- **A — mechanical is the majority of effort →** proceed to fund Generate.
- **B — mechanical is a minority →** prioritize Layout & Storytelling Intelligence instead (Generate deprioritized).
- **C — low adoption →** pause roadmap expansion; fix adoption before any new build.

### F. What evidence is required before funding Generate?
ALL of: ≥15 decks / ≥5 users · satisfaction ≥3.5 & ≥60% reuse · score lift ≥+15 ·
**measured** median ≥50% of mechanical-cleanup time removed · editability 100% · Creative sign-off ·
**confirmation (Scenario A) that mechanical cleanup is the majority of effort** · a named owner +
funded ruleset-maintenance · a one-page Generate TCO vs. measured Govern return.

---

**Recommendation:** Approve Wave-1 **as a measurement experiment**. Make no benefit claims and commit
no Generate spend until the evidence above is *measured*. **Conditions to start:** name an owner, fund
the fractional ruleset-maintenance role, wire Supabase persistence, and make baseline measurement
Wave-1's first task.
