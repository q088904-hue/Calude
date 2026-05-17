# Stagecraft Suggested Answers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every question in Stagecraft's 4 fixed banks a deterministic, hand-authored, in-voice suggested answer revealed on demand.

**Architecture:** A single static source-of-truth module (`suggestedAnswers.ts`) maps normalized question text → authored answer. A coverage script asserts every bank question has an entry (it is the "failing test" — fails until answers exist). A collapsed-by-default `<SuggestedAnswer>` component renders the answer via the existing delivery-marker renderer. Determinism is by construction: answers are committed literals, no API, no storage.

**Tech Stack:** Next.js 16.2 / React 19 / TypeScript / Tailwind v4. Node ESM script for the coverage check. Reuses `renderSampleAnswer` from `src/lib/stagecraft/feedbackRenderers.tsx`.

**Verification model (no unit-test suite by design):** each task gates on `npx tsc --noEmit`, `npx eslint <touched>`, and where relevant `node scripts/check-suggested-answers.mjs` (coverage) + `npm run build`. Content tasks additionally gate on the coverage script passing for that bank and the authoring rubric in Task 1.

---

## Authoring rubric (the contract for every answer — referenced by all content tasks)

Source of truth for facts: `src/lib/stagecraft/profile.ts` (`profile.realNumbers`, `profile.starStories`, `profile.voiceSamples`, `profile.weakPatterns`). The coaching rules in `src/lib/stagecraft/prompts.ts` (`baseCoachingRules`) are the canonical tone reference — answers must obey the same constraints as its "Sample answer (memorize this)" block:

- 40–70 words. 3–5 short sentences. Full stops, never comma-stitched run-ons.
- Natural, human, conversational, professional. No robotic/scripted/corporate-cliché tone. No flattery words.
- John's voice (match `profile.voiceSamples` cadence). Use ONLY numbers/stories from `profile.realNumbers` / `profile.starStories`. Never invent a metric.
- Rotate openers across questions (e.g. "In my experience," / "The way I think about this is," / "For me," / "My approach is simple —" / "What I have found is," / "The thing that matters here is," / "Over twenty years, what I have learned is,"). NEVER start with "Honestly," (it is in `profile.weakPatterns`).
- Exactly one `[pause]` (after the opening line) and exactly one `**bold**` emphasis phrase, matching the existing sample-answer convention.
- Confident closer (e.g. "…that is the approach that has worked for me." / "…and that is what I would bring here." / "…that is how I think about it." / "…and that is the bar I hold myself to.").
- `note` (optional, ≤1 short sentence): why it lands. Not rendered by default.

**Two worked exemplars (the quality bar — author the rest to match):**

Q: `Tell me about yourself.`
```
answer: "In my experience, the cleanest open is three things — what I do, where, and what's different. [pause] I'm a creative and brand leader with 20+ years, the last 18 at Datamatics, leading a team of six on **100+ global campaigns a year**. The last three years I've rebuilt our workflow with AI — production went from days to minutes. That is the approach that has worked for me."
note: "Three-beat open; one real number; AI pivot is the differentiator."
```

Q: `Why are you looking to move after 18 years at Datamatics?`
```
answer: "The way I think about this is simple — I'm not leaving something, I'm moving toward it. [pause] Eighteen years gave me range: brand systems, a six-person team, **100+ campaigns a year**, and an AI pipeline I built from scratch. What changed is the work I want next — premium, design-led, global. That is what I would bring here."
note: "Reframes the risk; 'moving toward', not 'running from'. No criticism of Datamatics."
```

---

## File Structure

- `src/lib/stagecraft/suggestedAnswers.ts` — **new.** `SuggestedAnswer` interface, `normalizeQuestion`, the answer map, `getSuggestedAnswer`. Single responsibility: the data + lookup.
- `scripts/check-suggested-answers.mjs` — **new.** Node ESM coverage assertion. Extracts question literals from the 4 bank files, normalizes, asserts each has a key.
- `src/components/stagecraft/SuggestedAnswer.tsx` — **new.** Collapsed-by-default reveal; renders via `renderSampleAnswer`.
- Integrate `<SuggestedAnswer>` into: `src/app/stagecraft/quickfire/page.tsx`, `src/app/stagecraft/drill/page.tsx`, `src/app/stagecraft/negotiate/page.tsx`, `src/app/stagecraft/companies/[id]/page.tsx`.

---

## Task 1: Scaffold the suggested-answers module

**Files:** Create `src/lib/stagecraft/suggestedAnswers.ts`

- [ ] **Step 1: Create the module with the empty map + helpers**

```ts
// Deterministic, hand-authored suggested answers for Stagecraft's fixed
// question banks. Static by design: same question → same answer, every
// session, every device. No API, no storage. Authoring rubric lives in
// docs/superpowers/plans/2026-05-17-stagecraft-suggested-answers.md.

export interface SuggestedAnswer {
  /** Speakable answer. May contain [pause] and **bold** delivery markers. */
  answer: string;
  /** Optional one-line rationale. Not rendered by default. */
  note?: string;
}

/** Normalize a question so wording/punctuation variants resolve to one key. */
export function normalizeQuestion(q: string): string {
  return q
    .replace(/[‘’“”]/g, (m) =>
      m === "‘" || m === "’" ? "'" : '"',
    )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** key = normalizeQuestion(originalQuestion) */
const ANSWERS: Record<string, SuggestedAnswer> = {};

export function getSuggestedAnswer(question: string): SuggestedAnswer | null {
  return ANSWERS[normalizeQuestion(question)] ?? null;
}

/** Internal: register an answer under its normalized question key. */
function add(question: string, entry: SuggestedAnswer): void {
  ANSWERS[normalizeQuestion(question)] = entry;
}

// ─── QuickFire bank ──────────────────────────────────────────────────────────
// (populated in Task 3)

// ─── Drill bank ──────────────────────────────────────────────────────────────
// (populated in Task 4)

// ─── Negotiate scenarios ─────────────────────────────────────────────────────
// (populated in Task 5)

// ─── Company packs ───────────────────────────────────────────────────────────
// (populated in Task 6)

export { add as _registerSuggestedAnswer };
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/stagecraft/suggestedAnswers.ts`
Expected: clean. (`add`/`_registerSuggestedAnswer` is exported to avoid an unused-symbol lint error until Task 3 uses it internally; if eslint flags the re-export as unused, instead remove the `export { add ... }` line and add `/* eslint-disable-next-line @typescript-eslint/no-unused-vars */` is NOT allowed — instead keep `add` used by leaving a single real registration: register the first QuickFire exemplar now.)

- [ ] **Step 3: Register the two rubric exemplars now (so `add` is used and the pattern is concrete)**

Add immediately after the `add` function:

```ts
add("Tell me about yourself.", {
  answer:
    "In my experience, the cleanest open is three things — what I do, where, and what's different. [pause] I'm a creative and brand leader with 20+ years, the last 18 at Datamatics, leading a team of six on **100+ global campaigns a year**. The last three years I've rebuilt our workflow with AI — production went from days to minutes. That is the approach that has worked for me.",
  note: "Three-beat open; one real number; AI pivot is the differentiator.",
});

add("Why are you looking to move after 18 years at Datamatics?", {
  answer:
    "The way I think about this is simple — I'm not leaving something, I'm moving toward it. [pause] Eighteen years gave me range: brand systems, a six-person team, **100+ campaigns a year**, and an AI pipeline I built from scratch. What changed is the work I want next — premium, design-led, global. That is what I would bring here.",
  note: "Reframes the risk; 'moving toward', not 'running from'.",
});
```

Remove the `export { add as _registerSuggestedAnswer };` line (no longer needed — `add` is now used).

- [ ] **Step 4: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/lib/stagecraft/suggestedAnswers.ts`
Expected: clean.

```bash
git add src/lib/stagecraft/suggestedAnswers.ts
git commit -m "feat(stagecraft): scaffold suggested-answers module + rubric exemplars"
```

## Task 2: Coverage assertion script (the "failing test")

**Files:** Create `scripts/check-suggested-answers.mjs`

- [ ] **Step 1: Write the script**

```js
// Asserts every question in the 4 fixed banks has a suggestedAnswers entry.
// Run: node scripts/check-suggested-answers.mjs
import { readFileSync } from "node:fs";
import { normalizeQuestion } from "../src/lib/stagecraft/suggestedAnswers.ts";

const BANK_FILES = [
  "src/app/stagecraft/quickfire/page.tsx",
  "src/app/stagecraft/drill/page.tsx",
  "src/app/stagecraft/negotiate/page.tsx",
  "src/app/stagecraft/companies/[id]/page.tsx",
];

// Capture the string literal that follows a `question:` key (same line or next).
const Q_RE = /question:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

function extractQuestions(src) {
  const out = [];
  for (const m of src.matchAll(Q_RE)) {
    // Strip surrounding quote/backtick and unescape \" \' \`
    const raw = m[1].slice(1, -1).replace(/\\(["'`\\])/g, "$1");
    out.push(raw);
  }
  return out;
}

let missing = [];
let total = 0;
const { getSuggestedAnswer } = await import(
  "../src/lib/stagecraft/suggestedAnswers.ts"
);
for (const f of BANK_FILES) {
  const qs = extractQuestions(readFileSync(f, "utf8"));
  for (const q of qs) {
    total++;
    if (!getSuggestedAnswer(q)) missing.push(`${f} :: ${q}`);
  }
}

if (missing.length) {
  console.error(
    `❌ ${missing.length}/${total} bank questions have NO suggested answer:`,
  );
  for (const m of missing) console.error("  - " + m);
  process.exit(1);
}
console.log(`✅ All ${total} bank questions have a suggested answer.`);
```

- [ ] **Step 2: Run it — verify it FAILS (proves it detects missing answers)**

Run: `node --experimental-strip-types scripts/check-suggested-answers.mjs`
Expected: exit 1, listing many missing questions (only the 2 exemplars from Task 1 resolve).
If `--experimental-strip-types` is unavailable on the installed Node, instead run via the project's TS runner: `npx tsx scripts/check-suggested-answers.mjs` (tsx is transitively available via Next; if not, `npm i -D tsx` is acceptable as the only dev-dep addition — record it in the report). Pick whichever runs and use it consistently in later tasks; document the exact command in the script header.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-suggested-answers.mjs
git commit -m "feat(stagecraft): coverage assertion for suggested answers"
```

## Task 3: Author QuickFire answers (22 questions)

**Files:** Modify `src/lib/stagecraft/suggestedAnswers.ts` (QuickFire section)

- [ ] **Step 1: Read the exact question list**

Read `src/app/stagecraft/quickfire/page.tsx` `QUESTION_BANK` (the 22 `question:` strings). Read `src/lib/stagecraft/profile.ts` in full (realNumbers, starStories, voiceSamples, weakPatterns).

- [ ] **Step 2: Add an `add("<exact question text>", { answer, note })` for every QuickFire question NOT already registered**

For each of the 22, write `answer` to the **Authoring rubric** above (40–70 words, in-voice, profile-real numbers only, one `[pause]`, one `**bold**`, rotate openers, never "Honestly,", confident closer). Use the exact question string from the file as the first arg to `add`. The 2 exemplars ("Tell me about yourself.", "Why are you looking to move after 18 years at Datamatics?") are already registered — do not duplicate; verify their text matches the QuickFire entries exactly (QuickFire has both).

- [ ] **Step 3: Verify coverage for QuickFire + tone self-check**

Run: `node --experimental-strip-types scripts/check-suggested-answers.mjs` (or the `npx tsx` form chosen in Task 2)
Expected: the QuickFire-file `::` lines no longer appear in the missing list (other banks still missing — that is expected at this task).
Self-check every new answer against the rubric: word count 40–70, exactly one `[pause]`, exactly one `**bold**`, no opener starting "Honestly,", only profile numbers.

- [ ] **Step 4: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/lib/stagecraft/suggestedAnswers.ts`
Expected: clean.

```bash
git add src/lib/stagecraft/suggestedAnswers.ts
git commit -m "feat(stagecraft): author QuickFire suggested answers"
```

## Task 4: Author Drill answers

**Files:** Modify `src/lib/stagecraft/suggestedAnswers.ts` (Drill section)

- [ ] **Step 1: Read the list**

Read `src/app/stagecraft/drill/page.tsx` `DRILLS` — every `question:` string.

- [ ] **Step 2: Add an entry per Drill question not already covered**

Same rubric. If a Drill question text is identical to a QuickFire one already registered, skip it (the shared key already resolves) — do not add a duplicate `add(...)` for the same normalized text (last-write-wins would still work but duplicates are noise; if a Drill question is a *variant*, register the variant text too).

- [ ] **Step 3: Coverage + tone self-check**

Run the coverage script. Expected: Drill-file `::` lines gone from missing. Rubric self-check on each new answer.

- [ ] **Step 4: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/lib/stagecraft/suggestedAnswers.ts`

```bash
git add src/lib/stagecraft/suggestedAnswers.ts
git commit -m "feat(stagecraft): author Drill suggested answers"
```

## Task 5: Author Negotiate answers

**Files:** Modify `src/lib/stagecraft/suggestedAnswers.ts` (Negotiate section)

- [ ] **Step 1: Read the list + tactic context**

Read `src/app/stagecraft/negotiate/page.tsx` `SCENARIOS`. Each item has `question`, plus `context` and `tactic` describing the negotiation move. Author the answer to EXECUTE that tactic (deflect / anchor / counter) in John's voice — these are salary-negotiation lines, so keep them calm, firm, non-defensive, and even shorter where natural (a tight deflection can be 25–55 words). Numbers: only use figures already present in the scenario `context`/`tactic` or `profile.realNumbers`; do NOT invent salary figures — if a number is needed and none is given, phrase as a range anchored to "market and scope" rather than a fabricated amount.

- [ ] **Step 2: Add an entry per scenario question**

`add("<exact question text>", { answer, note })`. The `[pause]`+`**bold**` convention still applies (bold the key anchor/boundary phrase).

- [ ] **Step 3: Coverage + tone self-check**

Run the coverage script. Expected: Negotiate-file `::` lines gone. Self-check: each answer enacts the scenario's `tactic`, stays non-defensive, no invented salary numbers.

- [ ] **Step 4: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/lib/stagecraft/suggestedAnswers.ts`

```bash
git add src/lib/stagecraft/suggestedAnswers.ts
git commit -m "feat(stagecraft): author Negotiate suggested answers"
```

## Task 6: Author Company-pack answers

**Files:** Modify `src/lib/stagecraft/suggestedAnswers.ts` (Company section)

- [ ] **Step 1: Read the list + company context**

Read `src/app/stagecraft/companies/[id]/page.tsx` `COMPANY_QUESTIONS` (every `question:` across all 6 packs; each has `round` and `why`). Read `src/lib/stagecraft/companyPacks.ts` for each company's brand context.

- [ ] **Step 2: Add an entry per company question**

Same rubric, tuned to the company: the answer should sound like John speaking to THAT brand (use the pack's brand language/sector), still only `profile.realNumbers` for metrics. Use the `why` field to understand what the question is probing and answer that directly.

- [ ] **Step 3: Coverage + tone self-check**

Run the coverage script. Expected: **exit 0 — ✅ all bank questions covered** (this is the last bank).

- [ ] **Step 4: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/lib/stagecraft/suggestedAnswers.ts`

```bash
git add src/lib/stagecraft/suggestedAnswers.ts
git commit -m "feat(stagecraft): author Company-pack suggested answers; full coverage"
```

## Task 7: SuggestedAnswer reveal component

**Files:** Create `src/components/stagecraft/SuggestedAnswer.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { getSuggestedAnswer } from "@/lib/stagecraft/suggestedAnswers";
import { renderSampleAnswer } from "@/lib/stagecraft/feedbackRenderers";

export function SuggestedAnswer({
  question,
  className = "",
}: {
  question: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const entry = getSuggestedAnswer(question);
  if (!entry) return null;

  return (
    <div className={`mt-3 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="font-mono text-[11px] tracking-widest uppercase text-sc-dim hover:text-sc-gold transition-colors"
      >
        {open ? "Hide suggested answer ▴" : "Show a suggested answer ▾"}
      </button>
      {open && (
        <div className="mt-2 rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-4 py-3">
          <p className="text-sm text-sc-ink leading-relaxed">
            {renderSampleAnswer(entry.answer)}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/components/stagecraft/SuggestedAnswer.tsx`
Expected: clean. (Verify `renderSampleAnswer` is exported from `src/lib/stagecraft/feedbackRenderers.tsx` — it is; signature `(text: string) => React.ReactNode`. Verify `@/` alias resolves to `src/`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/stagecraft/SuggestedAnswer.tsx
git commit -m "feat(stagecraft): collapsed-by-default SuggestedAnswer reveal"
```

## Task 8: Integrate into the 4 surfaces

**Files:** Modify `src/app/stagecraft/quickfire/page.tsx`, `src/app/stagecraft/drill/page.tsx`, `src/app/stagecraft/negotiate/page.tsx`, `src/app/stagecraft/companies/[id]/page.tsx`

- [ ] **Step 1: For each file, import and render the component next to the question**

Add `import { SuggestedAnswer } from "@/components/stagecraft/SuggestedAnswer";`.

- QuickFire: in the question card, after the question text / near the answer textarea, render `<SuggestedAnswer question={current.question} />` (use whatever variable holds the active question object — read the file to confirm; it is the QuickFire `current`/active item's `.question`).
- Drill: render `<SuggestedAnswer question={<activeDrill>.question} />` next to the drill prompt (read the file for the active-drill variable).
- Negotiate: render `<SuggestedAnswer question={<activeScenario>.question} />` within the scenario view (read the file for the active scenario variable).
- companies/[id]: in the `COMPANY_QUESTIONS` map that renders each question, render `<SuggestedAnswer question={q.question} />` under each question's `why` line.

Presentational only — do NOT change state/handlers/data/routing. Place the component so it does not auto-spoil (it is collapsed by default, so simply rendering it is safe). If any surface conditionally hides the question until the user acts, place `<SuggestedAnswer>` in the same conditional so it appears with the question.

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/app/stagecraft/quickfire/page.tsx src/app/stagecraft/drill/page.tsx src/app/stagecraft/negotiate/page.tsx "src/app/stagecraft/companies/[id]/page.tsx" && npm run build`
Expected: tsc + build clean; eslint shows only pre-existing issues (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/stagecraft/quickfire/page.tsx src/app/stagecraft/drill/page.tsx src/app/stagecraft/negotiate/page.tsx "src/app/stagecraft/companies/[id]/page.tsx"
git commit -m "feat(stagecraft): surface suggested answers on the 4 fixed banks"
```

## Task 9: Final verification

- [ ] **Step 1: Coverage + full gate**

Run: `node --experimental-strip-types scripts/check-suggested-answers.mjs` (or chosen runner) → expect `✅ All N bank questions have a suggested answer.`
Run: `npx tsc --noEmit && npx eslint src/lib/stagecraft/suggestedAnswers.ts src/components/stagecraft/SuggestedAnswer.tsx && npm run build`
Expected: all green.

- [ ] **Step 2: Playwright spot-check (controller may perform this)**

Build + `npx next start -p 3100`. On `/stagecraft/quickfire` and `/stagecraft/companies/kohler-india`: confirm the reveal is COLLAPSED on load (no answer visible until clicked), expands on click, is readable in BOTH light and dark, and the answer text shows bold/pause rendering. Capture light+dark screenshots, inspect, then delete `.playwright-mcp/` and any root screenshots.

- [ ] **Step 3: Commit verification marker**

```bash
git commit --allow-empty -m "chore(stagecraft): suggested answers verified (coverage, build, light/dark)"
```

---

## Self-Review (completed by author)

**Spec coverage:** suggestedAnswers.ts module → T1. normalizeQuestion/getSuggestedAnswer → T1. Coverage check / graceful-degradation guard → T2 (+ component returns null on miss, T7). Pre-authored answers for QuickFire/Drill/Negotiate/Company → T3/T4/T5/T6 against the shared rubric. Collapsed-by-default reveal via renderSampleAnswer → T7. Integration on the 4 surfaces → T8. tsc/eslint/build + coverage + Playwright light/dark → T2/T6/T8/T9. Out-of-scope (dynamic loop, persistence) honored by omission. All spec sections mapped.

**Placeholder scan:** No TBD/TODO. The content tasks intentionally specify the exact rubric + exact question source + profile inputs + acceptance check rather than pre-writing ~50 prose answers verbatim — for a content-authoring feature the authored output IS the deliverable (committing it is what makes it deterministic); two fully-worked exemplars pin the quality bar. This is the correct non-placeholder form for prose-generation tasks.

**Type consistency:** `SuggestedAnswer { answer; note? }`, `normalizeQuestion`, `getSuggestedAnswer`, `add` used consistently T1→T8. Component props `{ question; className? }` consistent T7→T8. `renderSampleAnswer` signature matches feedbackRenderers.tsx.

**Decomposition note:** content tasks are split per-bank so each is independently reviewable and the coverage script gives objective per-bank progress.
