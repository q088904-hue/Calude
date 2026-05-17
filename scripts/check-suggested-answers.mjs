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

const { getSuggestedAnswer } = await import(
  "../src/lib/stagecraft/suggestedAnswers.ts"
);

const missing = [];
let total = 0;
for (const f of BANK_FILES) {
  for (const q of extractQuestions(readFileSync(f, "utf8"))) {
    total++;
    if (!getSuggestedAnswer(q)) missing.push(`${f} :: ${q}`);
  }
}

if (missing.length) {
  console.error(`❌ ${missing.length}/${total} bank questions have NO suggested answer:`);
  for (const m of missing) console.error("  - " + m);
  process.exit(1);
}
console.log(`✅ All ${total} bank questions have a suggested answer.`);
