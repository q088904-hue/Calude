// Asserts every question in the 4 fixed banks has a suggestedAnswers entry.
// Run: node --experimental-strip-types scripts/check-suggested-answers.mjs
//      (or: npx tsx scripts/check-suggested-answers.mjs)
import { readFileSync } from "node:fs";

const BANK_FILES = [
  "src/app/stagecraft/quickfire/page.tsx",
  "src/app/stagecraft/drill/page.tsx",
  "src/app/stagecraft/negotiate/page.tsx",
  "src/app/stagecraft/companies/[id]/page.tsx",
];

// Capture the string literal that follows a `question:` key (same or next line).
const Q_RE =
  /question:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

function extractQuestions(src) {
  const out = [];
  for (const m of src.matchAll(Q_RE)) {
    const raw = m[1].slice(1, -1).replace(/\\(["'`\\])/g, "$1");
    out.push(raw);
  }
  return out;
}

const { getSuggestedAnswer, normalizeQuestion } = await import(
  "../src/lib/stagecraft/suggestedAnswers.ts"
);

// Collect all occurrences: { normalizedKey -> first-seen source file }
const seenFirst = new Map(); // normalizedKey -> first file
let occurrences = 0;
for (const f of BANK_FILES) {
  for (const q of extractQuestions(readFileSync(f, "utf8"))) {
    occurrences++;
    const key = normalizeQuestion(q);
    if (!seenFirst.has(key)) seenFirst.set(key, { q, f });
  }
}
const uniqueTotal = seenFirst.size;

// Find missing: de-duplicated by normalized key, one example source per unique question
const missingEntries = [];
for (const [, { q, f }] of seenFirst) {
  if (!getSuggestedAnswer(q)) missingEntries.push(`${f} :: ${q}`);
}

if (missingEntries.length) {
  console.error(
    `❌ ${missingEntries.length} of ${uniqueTotal} unique bank questions have NO suggested answer:`
  );
  for (const m of missingEntries) console.error("  - " + m);
  process.exit(1);
}
console.log(
  `✅ All ${uniqueTotal} unique bank questions covered (${occurrences} occurrences across 4 banks).`
);
