/**
 * WEEK-1 THROWAWAY POC — the hard gate (Part V §14).
 *
 * Proves the core mechanic on a .pptx:
 *   detect off-brand fonts/colors → scoped value-remap → rezip → validate editability.
 *
 * Usage:
 *   npx tsx scripts/pi/poc.ts                      # uses synthetic fixture
 *   npx tsx scripts/pi/poc.ts path/to/real.pptx    # uses a real Copilot/Gamma/Canva deck
 *
 * GATE: if editability validation fails on a real deck from each tool, STOP the project.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { PptxArchive } from "../../src/lib/pi/ooxml/archive";
import { collectFonts, collectColors } from "../../src/lib/pi/ooxml/read";
import { replaceFonts, replaceColors, normalizeThemeXml } from "../../src/lib/pi/ooxml/replace";
import { validateEditability } from "../../src/lib/pi/validate";
import { RULESET, allowedFontsLower, paletteHexUpper } from "../../src/lib/pi/ruleset";
import { nearestBrandColor } from "../../src/lib/pi/color/distance";
import type { FixMode } from "../../src/lib/pi/types";

const FIXTURE = resolve(process.cwd(), "fixtures/pi/synthetic-offbrand.pptx");

async function run() {
  const input = process.argv[2] ? resolve(process.argv[2]) : FIXTURE;
  const mode: FixMode = (process.argv[3] as FixMode) || "snap";

  if (!existsSync(input)) {
    console.error(`Input not found: ${input}\nRun: npx tsx scripts/pi/make-fixture.ts`);
    process.exit(1);
  }

  const originalBuffer = readFileSync(input);
  console.log(`\n=== PI POC ===\ninput: ${basename(input)}  (${originalBuffer.length} bytes)  mode: ${mode}\n`);

  // ---- DETECT ----
  const archive = await PptxArchive.load(originalBuffer);
  const fonts = await collectFonts(archive);
  const colors = await collectColors(archive);

  const badFonts = fonts.filter(
    (f) => f.typeface.trim() !== "" && !allowedFontsLower.has(f.typeface.toLowerCase())
  );
  const badColors = colors.filter((c) => !paletteHexUpper.has(c.hex));

  console.log("DETECT");
  console.log(`  slides: ${archive.slidePaths().length}`);
  console.log(`  fonts found: ${fonts.map((f) => f.typeface || "(theme)").join(", ")}`);
  console.log(`  → non-brand fonts: ${badFonts.map((f) => `${f.typeface}×${f.total}`).join(", ") || "none"}`);
  console.log(`  colors found: ${colors.map((c) => c.hex).join(", ")}`);
  console.log(
    `  → off-palette colors: ${
      badColors
        .map((c) => {
          const n = nearestBrandColor(c.hex, RULESET.colors.palette);
          return `${c.hex}→${n?.color.hex}(ΔE${n?.distance.toFixed(0)})`;
        })
        .join(", ") || "none"
    }`
  );

  // ---- FIX (scoped value replacement; no rebuild) ----
  let fontFixes = 0;
  let colorFixes = 0;
  let themeChanged = false;

  for (const path of archive.styleBearingPaths()) {
    let xml = await archive.readText(path);

    if (path.startsWith("ppt/theme/")) {
      const t = normalizeThemeXml(xml);
      xml = t.xml;
      themeChanged = themeChanged || t.changed;
    }

    const f = replaceFonts(xml, RULESET.fonts.bodyDefault);
    xml = f.xml;
    fontFixes += f.replaced;

    const c = replaceColors(xml, mode);
    xml = c.xml;
    colorFixes += c.replaced;

    archive.writeText(path, xml);
  }

  const fixedBuffer = await archive.toBuffer();

  console.log("\nFIX");
  console.log(`  fonts remapped: ${fontFixes}`);
  console.log(`  colors remapped: ${colorFixes}`);
  console.log(`  theme normalized: ${themeChanged}`);

  // ---- VALIDATE (editability gate) ----
  const v = await validateEditability(originalBuffer, fixedBuffer, RULESET.logo.required ? 2 : 0);
  console.log("\nVALIDATE (editability gate)");
  for (const [k, ok] of Object.entries(v.checks)) {
    console.log(`  ${ok ? "✓" : "✗"} ${k}`);
  }
  if (v.details.length) console.log("  details:\n   - " + v.details.join("\n   - "));

  // ---- write output for manual PowerPoint inspection ----
  const out = input.replace(/\.pptx$/i, `.fixed-${mode}.pptx`);
  writeFileSync(out, fixedBuffer);
  console.log(`\noutput: ${basename(out)}  (${fixedBuffer.length} bytes)`);

  // ---- verdict ----
  const remediated = badFonts.length === 0 || fontFixes > 0 || colorFixes > 0;
  const gate = v.passed && remediated;
  console.log(`\n=== GATE: ${gate ? "PASS ✅" : "FAIL ❌"} ===`);
  console.log(
    gate
      ? "Editability preserved AND off-brand attributes remapped. Open the .fixed file in PowerPoint to confirm visual fidelity."
      : "Gate failed — do not proceed to full build until resolved."
  );
  process.exit(gate ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
