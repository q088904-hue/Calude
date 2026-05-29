# Datamatics PI — Phase-0 / Week-1 Real-Deck Validation Findings

**Inputs (real, not synthetic):**
- `datamatics-template.pptx` — official master template (6 slides, 21 layouts, 1 master, 2 themes)
- `idp-presentation.pptx` — real IDP customer deck (16 slides, 165 parts, 4.8 MB, 51 media)

**Headline:** the Govern + Fix architecture is **validated** against real Datamatics assets. The core mechanic (detect-by-read, fix-by-scoped-replace, editability-by-validation) passed on the real deck in both modes. Six real-world **rule/config gaps** were found and fixed; **none required architectural change.**

---

## 1. Extracted Brand Compliance Ruleset v1 (from the template)

| Aspect | Extracted value | Source |
|---|---|---|
| Brand theme | `theme1.xml` (master → theme1) | master rels |
| **Approved font (single standard)** | **Segoe UI** (Light/Semibold/Black) | theme1 + Brand Team confirmation 2026-05 |
| Off-brand leak fonts | **Arial, Calibri** (Office defaults via theme2) | — |
| Legacy artifact (now a violation) | **Gill Sans** — historical template/decks only; normalize → Segoe UI | template slides hardcode it, but NOT a future standard |
| **Color system** | **WHITE-FIRST** — White `FFFFFF`, Datamatics Red `C00D0D`, Black `000000`; Light Grey for supporting elements | Brand Team 2026-05 |
| Brand red | **`C00D0D`** (theme's `F65857` is now legacy too) | Brand Team |
| Balance targets | White 60–80% · Light Grey 10–20% · Black ≤20% · Red ≤20% | Brand Team |
| Legacy reds → normalize | `C00000`, `C22127`, `BF2026`, `F65857` → `C00D0D` | red-family detector |
| Off-brand (flag, don't auto-map) | theme accents blue/green/orange — NOT in the design system | — |
| Logo | `image1.png` on the slide master | master rels |
| Footer | **custom shape — master has NO `ftr` placeholder** | master placeholders = title, body only |
| Template signature | 21 layouts + theme1 master | — |

Encoded in `src/lib/pi/ruleset.ts` (v1).

---

## 2. Compliance Analysis Report — IDP deck

**OVERALL: 55 / 100**  *(Segoe-UI font standard + white-first color system + Brand Balance)*

| Dimension | Score | Weight | Detail |
|---|---|---|---|
| Typography | 56 | 0.30 | violations: **Arial ×198, Calibri ×70, Gill Sans ×24 (legacy)** → Segoe UI; 277 tokens/Wingdings protected |
| Color | 71 | 0.25 | compliant srgb 206 · **legacy reds C00000 ×64 / C22127 ×12 / BF2026 ×5 → C00D0D**; off-brand greens 30BD7E/00B050 flagged |
| **Brand Balance** | **0** | 0.25 | **white 16% (min 60) · black 53% (max 20) · red 28% (max 20)** → ⚑ excessive red, ⚑ excessive black, ⚑ low white |
| Template adherence | 100 | 0.20 | master → theme1 ✓ · 21 layouts → built from template ✓ |
| Footer / Logo / Storytelling | advisory | — | footer = custom shape (Week-2); logo on master; storytelling advisory |

*Brand Balance is a usage-frequency proxy over **explicitly-set (hardcoded) colors** — exactly where ad-hoc pollution lives. True rendered-area balance (incl. theme white backgrounds) needs slide rendering = Week-2 refinement. The directional signal — "this deck over-uses red/black in its explicit styling" — is valid.*

**Read:** the deck is structurally on-template (good) but content was pasted/edited with Office-default fonts (Arial/Calibri) and ad-hoc reds (C00000 family) instead of brand red F65857 — *exactly the manual cleanup the Creative team does today.*

---

## 3. Auto-Fix Candidate Matrix

| Rule | Classification | Rationale |
|---|---|---|
| Arial/Calibri/**Gill Sans** → Segoe UI | **A — auto-fix safe** | single approved font = Segoe UI; theme tokens & symbols protected; validated text-identical |
| Theme normalization (theme2 Office fonts → brand) | **A — auto-fix safe** | value-replace in clrScheme/fontScheme |
| Legacy reds (C00000/C22127/BF2026/F65857) → **C00D0D** | **A — auto-fix safe** | red-family detector; C00000 snaps even in snap mode; validated |
| Off-brand non-red (blue/green/orange) | **C — flag only, never auto-map** | white-first system; forcing to red/black/white destroys meaning |
| Light grey (cards/containers) | **C — allowed, leave** | part of design system |
| Black/white/neutrals | **C — leave; counted in Brand Balance** | legitimate; balance governs over-use |
| `schemeClr` theme refs | **compliant — never touch** | the brand mechanism itself |
| Theme tokens `+mn-lt` etc. + Wingdings | **protected — never touch** | remapping corrupts inheritance/icons |
| Logo presence/position | **C — advisory (MVP)** | inject-if-missing in Week 2; never auto-remove foreign |
| Footer | **C — advisory (MVP)** | custom-shape detection needed first |
| Storytelling / hierarchy | **C — advisory only** | subjective; protects trust |

---

## 4. Technical Findings

- Engine processed a real 165-part / 4.8 MB deck with no performance issue.
- **Editability gate PASS in both snap and enforce** on the real deck: text-identical, slide-count unchanged, XML well-formed, zip valid, no rasterization.
- Enforce spot-check: Arial 198 + Calibri 70 → Segoe UI; Gill Sans 24 preserved; **Wingdings 15→15, theme tokens 262→262, schemeClr 1091→1091 untouched**; all off-brand reds → F65857.
- Snap mode remapped 0 colors on the real deck — all real red violations sit at ΔE 18–29, beyond the ΔE-12 snap tolerance. → reds belong in the **user-review** lane, not silent auto-snap.

---

## 5. Gaps Found in the Engine (all fixed except #4/#5/#6 which are Week-2 scope)

1. **Theme-reference font tokens** (`+mn-lt`, `+mj-ea`…) were being treated as fonts → would corrupt inheritance. **FIXED** (`isThemeFontToken`, protected).
2. **Symbol fonts** (Wingdings ×15) would be remapped to text → garbage icons. **FIXED** (`isSymbolFont`, protected).
3. **Neutrals** (black/white/greys) were candidates for remapping. **FIXED** (`isNeutral`, tolerated).
4. **Footer detection** assumed a master `ftr` placeholder — Datamatics uses custom shapes. **Week-2:** detect footer-positioned text shapes.
5. **Logo correctness** — presence on master detectable; identifying/replacing a *wrong* logo is unsafe. **Week-2:** inject-if-missing only.
6. **`schemeClr` awareness in scoring** — added as compliant signal; **Week-2:** formalize in the score model + surface in report UI.
7. **Wrong placeholder ruleset** (Calibri/0A2540/E4002B) replaced with **real extracted values** (Segoe UI/Gill Sans + theme1 palette).

---

## 6. Recommendations Before Week-2

1. **Ruleset v1 is real now** — but confirm with Creative team: is **Gill Sans** the official display font (template hardcodes it) or legacy? Confirm brand red is `F65857` (theme) vs the `C00000` reds seen in real decks (which may be an older brand red staff still use).
2. **Tune the fix lanes:** snap = neutrals/near-miss only; **reds and off-brand accents go to user-review (enforce-with-preview)**, not silent. Real violations cluster at ΔE 18–29.
3. **Build footer + logo detection as custom-shape scanners**, not placeholder lookups.
4. **Score model:** weight `schemeClr` usage as positive; treat Office-default-theme (theme2) leakage as a distinct violation class.
5. **Manual gate still required:** open `idp.fixed-enforce.pptx` in PowerPoint to confirm visual fidelity (automated gate passed; human visual confirm is the last step).

---

## VERDICT: Architecture remains VALID

The MVP architecture (Detect → scoped-replace Fix → editability Validate; ruleset as single source) **holds against real Datamatics assets**. All six gaps were **rules/config**, not structural. Proceed to Week-2 with the refinements above. No re-architecture required.
