# Datamatics Presentation Intelligence — Phase 1A: Generate
## Engineering Specification (gated — do not build until Wave-1 gate clears)

**Status:** Specification only. **Build gate (from the rollout plan):** Govern + Fix must show,
in real Wave-1 use — editability staying 100% · Creative confirms scoring matches their eye ·
satisfaction ≥3.5/5 — *before* this is funded/built.

**Goal:** turn a prompt / brief / RFP / Word / PDF / notes into a **Datamatics-compliant, editable
.pptx** — reusing the proven Govern engine so generated decks *provably* pass compliance (closed loop).

**Principle (unchanged from Govern):** AI never positions elements. AI returns **content + a layout
intent enum**; a deterministic layout registry maps intent → an approved PptxGenJS layout. The brand
ruleset is the single source of truth for both Generate (values) and Govern (checks).

---

## 1. What Generate REUSES (do not rebuild)

| Existing module | Role in Generate |
|---|---|
| `src/lib/pi/ruleset.ts` | brand values: Segoe UI, #C00D0D, greys, balance targets |
| `src/lib/pi/color/*`, `score.ts` | reused as-is |
| `src/lib/pi/analyze.ts` | **closed-loop self-check** — every generated deck is run through it; must score ≥ target |
| `src/lib/pi/validate.ts` | editability gate on the generated file |
| `src/lib/pi/ooxml/inject.ts` | logo + footer on the generated master |
| `src/lib/pi/auth/*`, `src/proxy.ts` | same Datamatics-only gate (extend matcher already covers `/pi/*`) |
| `src/lib/pi/metrics.ts` | add a `generate` record type alongside `fix`/`feedback` |

**Net-new for Generate:** `schema.ts` (DeckSpec), `layouts/` (registry), `render.ts` (PptxGenJS),
`ingest/` (source → outline), `generate.ts` (orchestrator). New dep: **`pptxgenjs`**.

---

## 2. Architecture

```
Source (prompt | brief | RFP | .docx | .pdf | notes)
   │  ingest/* → normalized OutlineRequest (raw content + intent hints)
   ▼
AI (Claude tool-use) → DeckSpec JSON (Zod-validated, 1 retry on parse fail)
   │   slides: layout-intent enum + content fields ONLY (no geometry/color)
   ▼
Layout Registry → PptxGenJS builders (deterministic geometry from BRAND tokens)
   ▼
render.ts → editable .pptx   →  inject logo/footer  →  validate editability
   ▼
CLOSED LOOP: analyzePptx(generated) must score ≥ GENERATE_MIN_SCORE  (else regen/flag)
   ▼
download + metrics(generate record)
```

---

## 3. Folder structure (additions only)

```
src/lib/pi/
  schema.ts                 # Zod DeckSpec + Slide discriminated union (layout enum)
  generate.ts               # orchestrator: ingest → AI → render → inject → self-check
  render.ts                 # DeckSpec → PptxGenJS → Buffer (16:9 + brand master)
  prompt.ts                 # system prompt + OutlineRequest → messages
  ingest/
    index.ts                # dispatch by source type → OutlineRequest
    text.ts                 # prompt / brief / notes (pass-through + chunk)
    docx.ts                 # .docx → text (mammoth or unzip+xml)
    pdf.ts                  # .pdf → text (pdf-parse / pdfjs)
  layouts/
    index.ts                # LAYOUT_REGISTRY: Record<LayoutId, LayoutBuilder>
    cover.ts agenda.ts section.ts content-bullets.ts
    two-column.ts metric.ts closing.ts
src/app/api/pi/generate/route.ts     # runtime=nodejs
src/app/pi/create/page.tsx           # brief form → outline review → generate → download
```

---

## 4. JSON schema (`schema.ts`, Zod)

```ts
const LayoutId = z.enum([
  "cover", "agenda", "section", "content-bullets", "two-column", "metric", "closing",
]);

const Slide = z.discriminatedUnion("layout", [
  z.object({ layout: z.literal("cover"), title: z.string().max(90), subtitle: z.string().max(140), client: z.string().max(80) }),
  z.object({ layout: z.literal("agenda"), title: z.string().max(60), items: z.array(z.string().max(80)).min(3).max(7) }),
  z.object({ layout: z.literal("section"), index: z.number().int(), title: z.string().max(80) }),
  z.object({ layout: z.literal("content-bullets"), title: z.string().max(90),
             bullets: z.array(z.object({ text: z.string().max(160), level: z.number().int().min(0).max(2).default(0) })).min(2).max(6) }),
  z.object({ layout: z.literal("two-column"), title: z.string().max(90),
             left: z.array(z.string().max(120)).max(5), right: z.array(z.string().max(120)).max(5) }),
  z.object({ layout: z.literal("metric"), title: z.string().max(90),
             metrics: z.array(z.object({ value: z.string().max(12), label: z.string().max(40) })).min(1).max(4) }),
  z.object({ layout: z.literal("closing"), title: z.string().max(60), message: z.string().max(200), contact: z.string().max(120) }),
]).and(z.object({ speakerNotes: z.string().max(600).optional() }));

export const DeckSpec = z.object({
  meta: z.object({ title: z.string(), client: z.string(), author: z.string(), vertical: z.string() }),
  slides: z.array(Slide).min(5).max(20),
});
```

---

## 5. Layout registry + render

```ts
type LayoutBuilder = (pptx: PptxGenJS, slide: PptxGenJS.Slide, data: SlideData) => void;
export const LAYOUT_REGISTRY: Record<LayoutId, LayoutBuilder> = { cover: buildCover, /* … */ };
```
- Each builder is pure + deterministic: fixed coordinates, colors/fonts pulled ONLY from `BRAND`.
- 16:9 (`pptx.defineLayout` 13.33×7.5in) + one `defineSlideMaster` carrying brand bg + logo + footer.
- Editability rule (same as Govern): `addText`/`addShape`/`addTable` — **never** rasterize.
- `metric`/`two-column` give visual variety while staying inside PptxGenJS's reliable feature set.

---

## 6. AI orchestration (`prompt.ts` + `generate.ts`)

- **System prompt:** BFSI/enterprise deck writer; MUST return JSON matching DeckSpec; `layout` ∈ enum
  ONLY; concise exec tone; structure proposal arc onto layouts; no styling/positioning.
- **Structured output:** Anthropic **tool-use** with DeckSpec as the tool input schema → `safeParse`.
- **Resilience:** one retry appending validation errors; second failure → 422 (no silent fallback).
- **Closed loop:** after render, `analyzePptx(buffer)`; if `scores.overall < GENERATE_MIN_SCORE` (target
  95 — generated decks should be near-perfect by construction), log + optionally auto-fix theme/fonts.
- Model: Claude Sonnet tier; record model + latency in metrics.

---

## 7. Ingest (`ingest/`)

| Source | Approach |
|---|---|
| prompt / brief / notes | pass-through text → OutlineRequest |
| `.docx` | `mammoth` (or unzip `word/document.xml`) → headings + paragraphs |
| `.pdf` | `pdf-parse` / pdfjs → text; headings via font-size heuristic |
| RFP | treat as .docx/.pdf; prompt steers toward response structure |

OutlineRequest = `{ rawText, sourceType, hints?: { sections?: string[] } }`. Optional "review outline"
step in the UI before generation (user can edit the AI's proposed section list).

---

## 8. API + UI

```
POST /api/pi/generate   { sourceType, text? , file? , meta }  → editable .pptx  (runtime=nodejs)
```
- `/pi/create` — brief form (client, title, author, context) or file upload → optional outline review
  → Generate → download + self-check score badge + feedback card (reuse Govern's components).
- Auth: already covered by the `/pi/*` + `/api/pi/*` proxy matcher.

---

## 9. DI → PI bridge (the one cross-module integration)

On the **DI results screen**, add a "Generate deck from this analysis" CTA: DI's structured output
(verdict → scorecard → insights → recommendations) maps near-1:1 to cover → agenda → content →
closing. Pure value-add; no change to either core flow.

---

## 10. Testing strategy

- **Unit:** each layout builder runs + emits expected element count; DeckSpec accepts valid / rejects
  malformed (bad enum, over-length).
- **Editability gate (CI):** generated deck passes `validate.ts` + unzip asserts `<a:t>` runs.
- **Closed-loop (CI):** `analyzePptx(generated)` scores ≥ GENERATE_MIN_SCORE on golden briefs —
  the strongest test: Generate's output must pass Govern.
- **Manual:** open generated deck in real PowerPoint/Keynote/Slides; confirm on-brand + editable.
- **Ingest:** golden .docx/.pdf → expected outline shape.

---

## 11. Week-by-week (≈3 weeks, post-gate)

| Week | Focus | Exit |
|---|---|---|
| 1 | `pptxgenjs`; schema; 7 layouts; render + brand master; hardcoded DeckSpec | sample deck opens editable + scores ≥95 in Govern. **Gate.** |
| 2 | AI (tool-use + Zod + retry); generate API; `/pi/create` UI; closed-loop self-check | prompt → compliant downloadable deck end-to-end |
| 3 | Ingest (.docx/.pdf/RFP); outline review; DI→PI bridge; metrics `generate` type; polish | full Generate flow + measured |

---

## 12. Go/No-Go (Generate)

| Gate | GO |
|---|---|
| Generated decks pass Govern | overall ≥95 on golden briefs |
| Editability | 100% |
| Content quality | Creative/pre-sales rate ≥3.5/5 usable first-draft |
| Time saved | measurable vs. from-scratch baseline |

---

## 13. Risks specific to Generate

| Risk | Mitigation |
|---|---|
| AI content quality (vs. mechanical determinism of Govern) | human-in-loop; "first draft, last-mile in PowerPoint" framing; never auto-publish |
| Design ceiling of PptxGenJS | registry stays within proven features; metric/two-column for variety, not exotic layouts |
| Ingest variance (.pdf/.docx structure) | robust text extraction + heading heuristics; graceful degrade to flat content |
| AI run-cost / latency | lean prompts/schema; single-pass; cache nothing sensitive |
| Scope creep into storytelling/multi-agent | those remain Phase 2/3 — Generate v1 is single-pass templated generation |

---

**Bottom line:** Generate is a contained ~3-week build that *reuses* the validated Govern engine and
inverts its compliance check into a generation guarantee (closed loop). It stays gated until Wave-1
proves Govern + Fix in real internal use — consistent with the Govern-first strategy. Do not start
before the gate clears.
