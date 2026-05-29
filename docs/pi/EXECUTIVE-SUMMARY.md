# Datamatics Presentation Intelligence — Govern + Fix
## Executive Project Summary

**Prepared for:** Datamatics Leadership
**Module:** Presentation Intelligence (PI) — Govern + Fix
**Status:** Internal-Release Ready (Grade A)
**Classification:** Internal — Strategic
**Date:** 2026-05

---

## 1. Original Problem Statement

Across Datamatics, employees in every department generate presentations using AI/consumer tools
(Copilot, ChatGPT, Gamma, Canva, Beautiful.ai) and then route them to the **Creative & Brand team
for manual cleanup** — brand alignment, typography, color, layout, logo, template, hierarchy,
storytelling, executive readiness.

The Creative team has effectively become a **manual Presentation Intelligence layer for the entire
organization** — a slow, non-scaling bottleneck that consumes senior design hours on mechanical
corrections. The goal: **automate that layer**, starting with the highest-volume, highest-certainty
work, so decks arrive on-brand without a human cleanup queue.

After an adversarial strategy review, the initiative was deliberately scoped: **not** a generic
AI slide generator (a commoditized, losing race vs. Gamma/Copilot), but an **internal,
governance-first system** whose moat is the codified Datamatics brand ruleset + an
editability-preserving correction engine.

---

## 2. Final Solution Architecture

**Pipeline (deterministic, not "AI invents slides"):**

```
Upload .pptx  →  Unzip OOXML (JSZip)  →  Read parts (fast-xml-parser, read-only)
   →  Compliance Detection (fonts · colors · brand-balance · density · template · logo · footer)
   →  Score + Report
   →  Mechanical Auto-Fix (scoped attribute remap on raw XML — never rebuild, never rasterize)
   →  Editability Validation gate (reject if anything regresses)
   →  Corrected editable .pptx  +  persisted run/feedback (audit + KPIs)
```

**Core engineering principle:** detection *reads*; fixes are **scoped string-replacements of XML
attribute values** (font names, color hex) — structure, order, namespaces and text are never
touched. This is why editability is mathematically preserved.

**Placement:** a self-contained module at `/pi/govern`, isolated from the existing Design
Intelligence product (sibling-module pattern; zero impact on current UX).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind · JSZip + fast-xml-parser ·
Supabase (persistence, with JSONL fallback) · edge proxy (access gate). No AI API, no external
network calls in the Govern + Fix path.

---

## 3. Key Features Implemented

- **Analyze** — upload any deck → compliance report across 5 scored dimensions + flags.
- **Auto-Fix** — Snap (safe) / Enforce modes; corrects fonts + brand reds + theme; returns editable `.pptx`.
- **Brand Balance** — white-first governance with excess-red/black/low-white/off-brand flags.
- **Visual Density** — flags overloaded slides (text/object/table/whitespace) with recommendations.
- **Logo & footer detection** — custom-shape aware (Datamatics has no `ftr` placeholder).
- **Access control** — Datamatics-only signed-session gate on `/pi/*` and `/api/pi/*`.
- **Persistent metrics + audit trail** — user-attributed run/feedback history (Supabase + JSONL fallback).
- **Measurement UI** — per-deck Fix Impact card, lightweight feedback, program KPI strip.
- **Release package** — User Guide, Beta Test Guide, Known Limitations, FAQ, Support Process.

---

## 4. Technical Validation Results

- **12/12 unit tests** pass (color math, scoped replacement, protected-token guards, non-pptx guard).
- **Production build green**; TypeScript clean; ESLint clean; Next 16 `proxy` convention (no deprecation).
- **Failure-mode probes:** corrupt / truncated / encrypted (password-protected) / empty files → caught → friendly **422**; valid-zip-not-PowerPoint → explicit rejection (hardened during review).
- **Performance:** real 4.8 MB / 16-slide deck analyzed in **~24 ms**.
- **Editability gate** asserts (and rejects on failure): text byte-identical · slide count unchanged · XML well-formed · zip valid · no rasterization.

---

## 5. Real Datamatics Validation Results

Validated against the **actual Datamatics master template + a real IDP customer deck** (not synthetic):

- **Ruleset extracted from the real template:** Segoe UI; white-first **#C00D0D / Black / White** + light greys **F2F2F2 / D9D9D9**; logo on master; footer = custom shape.
- **IDP deck scored 52/100** — violations: Arial ×198, Calibri ×70, Gill Sans ×24 (legacy); legacy reds C00000/C22127/BF2026; 7 overloaded slides; balance red 28% / black 30% / white 16% (all out of target).
- **Auto-Fix result:** every slide font → Segoe UI; all legacy reds → #C00D0D; **theme tokens (262) + Wingdings (15) + schemeClr refs (1091) preserved**; **score 52 → 73**; **editability 100% preserved** (text byte-identical).
- **End-to-end through the live UI/API + auth:** unauth→401, non-Datamatics→403, valid login→200, audit attributed `asha@datamatics.com · 52→73`.

This real-deck pass is the decisive de-risking evidence — the engine works on Datamatics' own assets, not just test fixtures.

---

## 6. Compliance Engine Capabilities

Five scored dimensions → weighted overall score:

| Dimension | What it checks | Confidence |
|---|---|---|
| Typography | non-Segoe-UI fonts (Arial/Calibri/Gill Sans), protecting theme tokens + symbol fonts | Deterministic |
| Color | brand vs. legacy-red vs. off-brand vs. neutral | Deterministic |
| Brand Balance | white-first distribution vs. targets (60–80/10–20/≤20/≤20) | Usage-proxy |
| Visual Density | text/object/table load + whitespace coverage per slide | Heuristic |
| Template | built from Datamatics master/theme1 | Deterministic |

Plus logo/footer presence. Deterministic categories are "violations"; subjective items are **advisory** (protects trust).

---

## 7. Auto-Fix Engine Capabilities

- **Fonts:** any non-Segoe-UI → Segoe UI (Arial, Calibri, legacy Gill Sans).
- **Colors:** red-family (incl. legacy C00000/C22127/BF2026/F65857) → **#C00D0D**. Snap = near-misses only; Enforce = all reds.
- **Theme:** normalize theme font/color schemes to brand.
- **Never auto-changed (by design):** off-brand non-reds (blue/green/orange), non-approved greys, images, layout, content — all flagged for human review.
- **Safety:** every fix passes the editability gate or is rejected (original returned untouched). Protected tokens (`+mn-lt`, Wingdings, theme `schemeClr`) are never altered.

---

## 8. Security & Governance Controls

- **Access:** Datamatics-only HMAC-signed session (httpOnly cookie, 8h) + optional beta code; edge gate on all `/pi/*` and `/api/pi/*`.
- **Data residency:** **no external/AI calls, no secrets, in-memory processing** — deck bytes never leave the server. Strong fit for regulated internal content.
- **Audit trail:** user · timestamp · deck · before/after score · fixes · editability · feedback (`pi_runs`/`pi_feedback`, RLS deny-all, service-role writes).
- **Validation:** 40 MB cap, MIME + extension + structural checks, friendly rejections.
- **Production must-do:** set `PI_SESSION_SECRET`; apply migration `004` (or run on a persistent host) for durable audit/KPIs.

---

## 9. KPI & Measurement Framework

Designed to produce signal from **even one deck** (no large pilot required):

| KPI | Source |
|---|---|
| Compliance score improvement | per-fix before→after |
| Violations detected / auto-fixed | analyze / fix delta |
| Editability preservation rate | validation gate (target 100%) |
| User satisfaction (1–5) | feedback |
| Estimated cleanup minutes saved | feedback |
| Decks governed · unique users | run history |

Surfaced live (Fix Impact card + program KPI strip) and aggregated server-side. Validated at N=1
(52→73, 373/445 violations fixed, 100% editability, 35 min saved).

---

## 10. Internal Release Readiness Assessment

**Grade: A — Ready for Internal Release.** Began at B (Limited Beta) post-review; the Beta-Hardening
Sprint closed both gaps:
- ✅ Access control (was missing) → Datamatics-only signed gate.
- ✅ Persistent, user-attributed audit/KPIs (was JSONL-only) → Supabase + fallback.
- ✅ UX hardening + full release package.

Core strengths intact: guaranteed editability, zero data egress, robust input handling, fast,
fully tested. One config must-do (`PI_SESSION_SECRET`) and one optional persistence step
(migration 004) before go-live.

---

## 11. Known Limitations

- **Mechanical scope only** — fonts + brand reds + theme; **no** layout/hierarchy/storytelling/content fixes (flagged for humans).
- Off-brand non-reds, non-approved greys, logo/footer → **flagged, not auto-applied** (logo/footer auto-insertion planned).
- Brand Balance = explicit-color proxy, not rendered pixel area.
- `.pptx` only; 40 MB cap; images never modified.
- Auth is beta-grade (domain + code), not Entra SSO/RBAC yet.

---

## 12. Future Roadmap

| Phase | Scope |
|---|---|
| **1A — Generate** | Prompt / brief / RFP / Word / PDF → Datamatics-compliant editable deck. Reuses the same ruleset + layout registry; generated decks self-check through the existing compliance engine (closed loop). |
| **1B — Analyze deepening** | Quality/hierarchy/storytelling scoring (reuse DI's evaluative engine). |
| **2 — Advanced Auto-Fix** | Opt-in full reformat (extract → regenerate) for layout/hierarchy; logo/footer auto-insertion; rendered-area balance. |
| **3 — Advanced Intelligence** | Storytelling optimization, proposal/RFP intelligence, exec-presentation coaching, knowledge-base/CRM integration, SSO/RBAC. |

Sequencing principle retained: **Govern first** (attacks the existing bottleneck); Generate and AI
storytelling are gated fast-follows, not part of this release.

---

## 13. Estimated Business Impact

**Framework (replace bracketed assumptions with actuals):**

```
Quarterly value =
   (decks/quarter through Creative)
 × (avg manual cleanup minutes/deck)
 × (% mechanical cleanup auto-resolved)   ← this module targets ~60–70%
 × (loaded Creative hourly cost)
 + senior-designer hours redeployed
 + employee self-service time saved
```

- **Direct:** removes the mechanical 60–70% of brand cleanup (font/color/template) from the Creative queue, on an *already-incurred, measurable* cost base.
- **Indirect:** senior designers redeployed to high-value work; faster turnaround; brand-incident reduction; a compounding, Datamatics-owned brand-compliance asset.
- **Strategic:** an internal capability that doubles as a **reference implementation** for Datamatics' own digital-transformation client offerings.
- **Risk profile:** contained — single-module build, zero external dependencies/egress, internal-only.

---

## 14. Recommended Internal Rollout Plan

1. **Go-live prep:** set `PI_SESSION_SECRET`; apply migration `004` (or persistent host); issue access code; confirm @datamatics.com allow-list.
2. **Wave 1 — Creative & Brand (owners):** they run the live inbound cleanup queue through PI, validate scoring against their eye, and own the ruleset. Signal accrues passively (no pilot recruitment).
3. **Wave 2 — Marketing:** brand collateral; expand template/ruleset coverage; they champion the brand system.
4. **Wave 3 — Pre-Sales / Proposals:** highest-ROI volume; capture cleanup-minutes-saved.
5. **Wave 4 — Sales / Leadership:** account decks; visibility drives org-wide pull.
6. **Promote on evidence:** after organic decks accrue, review the KPI strip (score lift, fix rate, editability 100%, minutes saved). **Gate to wider rollout** = editability stays 100% + Creative confirms scoring + satisfaction ≥3.5/5 — regardless of deck count.
7. **Then fund Phase 1A (Generate)** on the proven foundation.

---

### Journey at a glance
Concept → adversarial strategy review (governance, not generation) → Week-1 real-deck POC →
compliance + auto-fix engine → real Datamatics template/IDP validation → ruleset corrections
(Segoe UI, #C00D0D white-first, approved greys) → grey governance + Visual Density → UI/API →
KPI/feedback framework → production-readiness review (B) → Beta-Hardening Sprint
(auth · persistence · audit · UX · docs) → **Internal-Release Ready (A)**.

*References: `fixtures/pi/PHASE0-FINDINGS.md`, `fixtures/pi/READINESS-REVIEW.md`,
`docs/pi/RELEASE-PACKAGE.md`, `.claude/plans/delightful-hugging-bird.md`.*
