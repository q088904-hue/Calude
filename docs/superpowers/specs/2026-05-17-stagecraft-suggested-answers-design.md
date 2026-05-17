# Stagecraft Suggested Answers — Design

**Date:** 2026-05-17
**Status:** Approved (brainstorming) — pending spec review → implementation plan

## Goal

Give John a deterministic, hand-crafted "suggested answer" for every question in
Stagecraft's fixed question banks: natural, human, conversational, professional,
short, easy to speak and remember — and identical every session, every device,
forever.

## Scope (decided)

**In scope — the 4 fixed question banks:**
- QuickFire `QUESTION_BANK` — `src/app/stagecraft/quickfire/page.tsx` (22 questions)
- Drill `DRILLS` — `src/app/stagecraft/drill/page.tsx`
- Negotiate `SCENARIOS` — `src/app/stagecraft/negotiate/page.tsx`
- Company-pack questions `COMPANY_QUESTIONS` — `src/app/stagecraft/companies/[id]/page.tsx`
  (all 6 packs)

**Explicitly out of scope (YAGNI / not deterministic by nature):**
- The main session loop (`/stagecraft`) — questions are LLM-generated, never a fixed
  set; keeps its existing "Sample answer (memorize this)" coaching block.
- Debrief — user types questions from a real interview (no fixed set).
- Intro / STAR / Recruiter / Checklist / Plan — no fixed Q&A bank.
- Any new persistence — static repo data is inherently consistent; nothing to store.

## Why pre-authored (not LLM-generated)

The requirement is determinism + consistency + continuity + reliability + non-robotic
tone. LLM generation is non-deterministic, needs an API key, adds latency, and varies
run to run. Hand-authored answers stored as literals in version-controlled source are
identical every session by construction, instant, offline, and the highest possible
quality bar for "natural and memorable."

## Architecture

### Single source of truth
`src/lib/stagecraft/suggestedAnswers.ts`:

- `interface SuggestedAnswer { answer: string; note?: string }`
  - `answer`: the speakable answer (may include the coaching delivery markers
    `[pause]` and `**bold**` for emphasis, rendered the same way the existing
    feedback renderer handles them).
  - `note` (optional): one short line on why it lands (not shown by default).
- A `Record<string, SuggestedAnswer>` keyed by a **normalized** question string.
- `function normalizeQuestion(q: string): string` — `trim()`, collapse internal
  whitespace to single spaces, lowercase, strip surrounding smart/straight quotes.
  Used both when building the map and at lookup so wording variants resolve.
- `function getSuggestedAnswer(question: string): SuggestedAnswer | null` — returns
  the entry or `null` if absent.

### Authoring rules (each answer)
- 40–70 words, 3–5 short sentences. Full stops, not comma-stitched run-ons.
- Natural, human, conversational, professional. No robotic/scripted tone.
- John's voice; **only** his real profile numbers/stories (same constraint the
  coaching system prompt already enforces — `src/lib/stagecraft/prompts.ts`).
- Rotate openers across questions; never start with "Honestly," (flagged weak
  pattern). Confident closer.
- Include at most one `[pause]` after the opener and one `**bold**` emphasis,
  matching the existing sample-answer convention.

### Shared UI
`src/components/stagecraft/SuggestedAnswer.tsx` (client component):
- Props: `{ question: string }`.
- Calls `getSuggestedAnswer(question)`. If `null`, renders nothing.
- Collapsed by default: a button "Show a suggested answer ▾" (sc-token styled,
  works light/dark). Expanding reveals the answer rendered with the existing
  delivery-marker renderer (reuse `renderSampleAnswer` from
  `src/lib/stagecraft/feedbackRenderers` if suitable; else a minimal local render
  of `[pause]`/`**bold**`).
- Purely presentational; no network, no persistent state (open/closed is ephemeral
  per the rules — it must never auto-open so it can't spoil a practice attempt).

### Integration points
Render `<SuggestedAnswer question={...} />` in the question view of:
- QuickFire page (below the question / near the answer box).
- Drill page.
- Negotiate page (per scenario).
- Company-pack questions list (`companies/[id]`), one per question.

Pass the exact question string each surface already uses.

## Data flow

Static module imported by the 4 pages → synchronous lookup by normalized question
string → render in the reveal. No async, no fetch, no storage. Identical output for
identical input on every load.

## Error handling / graceful degradation

- Missing entry → `getSuggestedAnswer` returns `null` → component renders nothing.
  No broken UI if a question is added later without an answer.
- A coverage check (script or test) asserts every question in all 4 banks has a
  `suggestedAnswers` entry, so coverage cannot silently drift. The check imports
  the same bank arrays the pages use (or a shared extraction) and fails if any
  normalized question key is absent.

## Testing / verification

- `npx tsc --noEmit`, `npx eslint` (touched paths), `npm run build` — all green.
- Coverage assertion passes (every bank question answered).
- Playwright spot-check: reveal works, stays collapsed until clicked, readable in
  light AND dark, on QuickFire + one company page.

## Success criteria

- Every question in the 4 fixed banks has a hand-authored answer meeting the
  authoring rules.
- The same question yields a byte-identical answer on every load / session / device
  (verified: it is static source).
- Reveal never auto-opens (does not spoil practice).
- No new lint errors; build green; light/dark correct.

## Risks / mitigations

- **Coverage drift** when a bank question is added/edited → coverage check fails the
  build-adjacent verification, forcing an answer to be authored.
- **Question-text mismatch** (punctuation/quote variants) → `normalizeQuestion`
  applied consistently at build-of-map and lookup.
- **Spoiling practice** → component is collapsed by default and never auto-expands.
- **Tone drift across ~50+ answers** → all authored to the single rule set above,
  reviewed in the implementation plan's review gates.
