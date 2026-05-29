/**
 * Real-deck validation via the unified engine (analyzePptx + applyFix).
 * Run: npx tsx scripts/pi/analyze-real.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzePptx } from "../../src/lib/pi/analyze";
import { applyFix } from "../../src/lib/pi/fix/apply";
import { DATAMATICS_RED } from "../../src/lib/pi/ruleset";
import type { FixMode } from "../../src/lib/pi/types";

const IDP = resolve("fixtures/pi/real/idp-presentation.pptx");

async function main() {
  const buffer = readFileSync(IDP);
  const r = await analyzePptx(buffer);

  console.log("══════════════════════════════════════════════════════");
  console.log("  DATAMATICS PI — REAL-DECK ANALYSIS (unified engine)");
  console.log("══════════════════════════════════════════════════════");
  console.log(`\n  OVERALL COMPLIANCE: ${r.scores.overall}/100   (${r.slideCount} slides)`);
  console.log(
    `  typography ${r.scores.typography} · color ${r.scores.color} · brandBalance ${r.scores.brandBalance} · density ${r.scores.density} · template ${r.scores.templateAdherence}`
  );

  console.log(`\n  TYPOGRAPHY`);
  console.log(`    brand ${r.typography.brandRuns} · protected ${r.typography.protectedRuns} · violations ${r.typography.violationRuns}`);
  r.typography.violations.forEach((v) => console.log(`      ✗ ${v.value} ×${v.count} → Segoe UI`));

  console.log(`\n  COLOR  (schemeRefs ${r.color.schemeRefs} · compliant srgb ${r.color.compliantSrgb})`);
  r.color.legacyReds.forEach((v) => console.log(`      ✗ ${v.value} ×${v.count} → ${DATAMATICS_RED} (auto-fix)`));
  r.color.offBrand.forEach((v) => console.log(`      ⚠ off-brand ${v.value} ×${v.count} (flag only)`));
  r.color.greyOther.forEach((v) => console.log(`      ⚑ non-approved grey ${v.value} ×${v.count}`));

  console.log(`\n  BRAND BALANCE  (${r.brandBalance.score})`);
  const p = r.brandBalance.pct;
  console.log(`    white ${p.white.toFixed(0)}% · lightGrey ${p.lightGrey.toFixed(0)}% · greyOther ${p.greyOther.toFixed(0)}% · black ${p.black.toFixed(0)}% · red ${p.red.toFixed(0)}% · offBrand ${p.offBrand.toFixed(0)}%`);
  r.brandBalance.flags.forEach((f) => console.log(`      ⚑ ${f}`));

  console.log(`\n  VISUAL DENSITY  (${r.density.score})  overloaded slides: [${r.density.overloadedSlides.join(", ") || "none"}]`);
  r.density.slides
    .filter((s) => s.recommendations.length)
    .slice(0, 6)
    .forEach((s) =>
      console.log(`      slide ${s.slide}: ${s.recommendations.join(" ")} (ws ${s.whitespacePct}%)`)
    );

  console.log(`\n  LOGO: ${r.logo.presentOnMaster ? "present on master ✓" : "missing ✗"} (refs ${r.logo.masterImageRefs})`);
  console.log(`  FOOTER: master ${r.footer.presentOnMaster ? "✓" : "✗"} · slides with footer ${r.footer.slidesWithFooter}/${r.footer.slideCount}`);
  console.log(`  TEMPLATE: theme1 ${r.template.usesBrandTheme ? "✓" : "✗"} · ${r.template.layoutCount} layouts`);

  for (const mode of ["snap", "enforce"] as FixMode[]) {
    const fix = await applyFix(buffer, mode);
    const out = resolve(`fixtures/pi/real/idp.fixed-${mode}.pptx`);
    writeFileSync(out, fix.afterBuffer);
    console.log(`\n  FIX (${mode}): fonts ${fix.fixesApplied.fonts} · colors ${fix.fixesApplied.colors} · score ${fix.beforeScore}→${fix.afterScore} · editability ${fix.editabilityPassed ? "PASS ✅" : "FAIL ❌"} → ${out.split("/").pop()}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
