/**
 * Fix orchestrator — runs the full mechanical correction pass over an archive
 * and validates editability. Shared by the CLI validator and /api/pi/fix.
 *
 * Mechanical scope (deterministic, editability-preserving):
 *   - fonts:   Arial/Calibri/Gill Sans (+ any non-Segoe-UI) → Segoe UI
 *   - colors:  legacy/red-family → C00D0D  (off-brand non-reds + greys untouched)
 *   - theme:   normalize theme1/2 font + near-miss colors
 *   - logo:    inject Datamatics logo onto master when absent (additive only)
 *   - footer:  inject slide-number badge onto master when absent (additive only)
 */

import { PptxArchive } from "../ooxml/archive";
import { replaceFonts, replaceColors, normalizeThemeXml } from "../ooxml/replace";
import { injectMasterElements } from "../ooxml/inject";
import { validateEditability } from "../validate";
import { RULESET } from "../ruleset";
import type { FixMode, FixResult } from "../types";
import { analyzePptx, type AnalysisResult } from "../analyze";

/** Total violation occurrences in an analysis (auto-fixable + flagged). */
export function countViolations(a: AnalysisResult): number {
  const reds = a.color.legacyReds.reduce((s, v) => s + v.count, 0);
  const off = a.color.offBrand.reduce((s, v) => s + v.count, 0);
  const grey = a.color.greyOther.reduce((s, v) => s + v.count, 0);
  return a.typography.violationRuns + reds + off + grey;
}

export async function applyFix(
  buffer: Buffer,
  mode: FixMode
): Promise<FixResult & { afterBuffer: Buffer; before: AnalysisResult; after: AnalysisResult }> {
  const before = await analyzePptx(buffer);

  const archive = await PptxArchive.load(buffer);
  let fonts = 0,
    colors = 0,
    theme = false;

  for (const path of archive.styleBearingPaths()) {
    let xml = await archive.readText(path);
    if (path.startsWith("ppt/theme/")) {
      const t = normalizeThemeXml(xml);
      xml = t.xml;
      theme = theme || t.changed;
    }
    const f = replaceFonts(xml, RULESET.fonts.bodyDefault);
    xml = f.xml;
    fonts += f.replaced;
    const c = replaceColors(xml, mode);
    xml = c.xml;
    colors += c.replaced;
    archive.writeText(path, xml);
  }

  // Additive master fixes: logo + slide-number badge (inject-if-missing only).
  const injected = await injectMasterElements(archive);

  // Allow one extra media part if logo was injected.
  const afterBuffer = await archive.toBuffer();
  const validation = await validateEditability(buffer, afterBuffer, injected.logo ? 3 : 2);
  const after = await analyzePptx(afterBuffer);

  return {
    fixesApplied: { fonts, colors, logo: injected.logo, footer: injected.footer, theme },
    beforeScore: before.scores.overall,
    afterScore: after.scores.overall,
    editabilityPassed: validation.passed,
    buffer: afterBuffer,
    afterBuffer,
    before,
    after,
  };
}
