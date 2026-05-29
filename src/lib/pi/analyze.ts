/**
 * Compliance analysis orchestrator — the single engine entry point.
 * Takes a .pptx Buffer, returns a complete AnalysisResult consumed by both the
 * CLI validator and the /api/pi/analyze route.
 */

import { PptxArchive } from "./ooxml/archive";
import {
  RULESET,
  allowedFontsLower,
  isProtectedFont,
  DATAMATICS_RED,
} from "./ruleset";
import { categorize, emptyCounts, tallyColor } from "./color/classify";
import { computeBrandBalance, overallCompliance, type BrandBalance } from "./score";
import { analyzeDensity, type DensityReport } from "./density";
import { detectLogo, type LogoFinding } from "./detect/logo";
import { detectFooter, type FooterFinding } from "./detect/footer";

export interface CountedItem {
  value: string;
  count: number;
}

export interface AnalysisResult {
  slideCount: number;
  scores: {
    overall: number;
    typography: number;
    color: number;
    brandBalance: number;
    density: number;
    templateAdherence: number;
  };
  typography: {
    brandRuns: number;
    protectedRuns: number;
    violationRuns: number;
    violations: CountedItem[]; // off-brand fonts → Segoe UI
  };
  color: {
    schemeRefs: number;
    compliantSrgb: number;
    legacyReds: CountedItem[]; // → C00D0D (auto-fix)
    offBrand: CountedItem[]; // flag only
    greyOther: CountedItem[]; // warning
  };
  brandBalance: BrandBalance;
  density: DensityReport;
  logo: LogoFinding;
  footer: FooterFinding;
  template: { usesBrandTheme: boolean; layoutCount: number };
}

async function collectSlideUsage(archive: PptxArchive) {
  const fonts = new Map<string, number>();
  const srgb = new Map<string, number>();
  let schemeRefs = 0;
  for (const path of archive.slidePaths()) {
    const xml = await archive.readText(path);
    for (const m of xml.matchAll(/typeface="([^"]+)"/g))
      fonts.set(m[1], (fonts.get(m[1]) ?? 0) + 1);
    for (const m of xml.matchAll(/srgbClr val="([0-9A-Fa-f]{6})"/g)) {
      const h = m[1].toUpperCase();
      srgb.set(h, (srgb.get(h) ?? 0) + 1);
    }
    schemeRefs += (xml.match(/schemeClr/g) || []).length;
  }
  return { fonts, srgb, schemeRefs };
}

export async function analyzePptx(buffer: Buffer): Promise<AnalysisResult> {
  const archive = await PptxArchive.load(buffer);

  // Guard: a valid ZIP is not necessarily a PowerPoint. Reject anything without
  // the presentation part or with no slides, rather than emitting a bogus score.
  if (!archive.has("ppt/presentation.xml")) {
    throw new Error("Not a PowerPoint presentation (missing ppt/presentation.xml).");
  }
  if (archive.slidePaths().length === 0) {
    throw new Error("This presentation contains no slides to analyze.");
  }

  const { fonts, srgb, schemeRefs } = await collectSlideUsage(archive);

  // ---- Typography ----
  let brandRuns = 0,
    protectedRuns = 0,
    violationRuns = 0;
  const fontViolations: CountedItem[] = [];
  for (const [f, n] of fonts) {
    if (isProtectedFont(f)) protectedRuns += n;
    else if (allowedFontsLower.has(f.toLowerCase())) brandRuns += n;
    else {
      violationRuns += n;
      fontViolations.push({ value: f, count: n });
    }
  }
  const fontFixable = brandRuns + violationRuns;
  const typographyScore = fontFixable ? Math.round((brandRuns / fontFixable) * 100) : 100;

  // ---- Color ----
  const counts = emptyCounts();
  const legacyReds: CountedItem[] = [];
  const offBrand: CountedItem[] = [];
  const greyOther: CountedItem[] = [];
  let compliantSrgb = 0;
  let srgbTotal = 0;
  for (const [h, n] of srgb) {
    srgbTotal += n;
    tallyColor(counts, h, n);
    const cat = categorize(h);
    if (cat === "red" && h !== DATAMATICS_RED) legacyReds.push({ value: h, count: n });
    else if (cat === "offBrand") offBrand.push({ value: h, count: n });
    else if (cat === "greyOther") greyOther.push({ value: h, count: n });
    else compliantSrgb += n; // white / lightGrey / black / exact red
  }
  const colorScore = srgbTotal ? Math.round((compliantSrgb / srgbTotal) * 100) : 100;
  const brandBalance = computeBrandBalance(counts, RULESET);

  // ---- Density ----
  const density = await analyzeDensity(archive);

  // ---- Logo / Footer / Template ----
  const logo = await detectLogo(archive);
  const footer = await detectFooter(archive);
  let usesBrandTheme = false;
  for (const m of archive.slideMasterPaths()) {
    const rel = m.replace(/slideMasters\/(slideMaster\d+\.xml)$/, "slideMasters/_rels/$1.rels");
    if (archive.has(rel) && /theme1\.xml/.test(await archive.readText(rel))) usesBrandTheme = true;
  }
  const templateAdherence = usesBrandTheme ? 100 : 40;

  const overall = overallCompliance({
    typography: typographyScore,
    color: colorScore,
    brandBalance: brandBalance.score,
    templateAdherence,
  });

  const sortDesc = (a: CountedItem, b: CountedItem) => b.count - a.count;

  return {
    slideCount: archive.slidePaths().length,
    scores: {
      overall,
      typography: typographyScore,
      color: colorScore,
      brandBalance: brandBalance.score,
      density: density.score,
      templateAdherence,
    },
    typography: {
      brandRuns,
      protectedRuns,
      violationRuns,
      violations: fontViolations.sort(sortDesc),
    },
    color: {
      schemeRefs,
      compliantSrgb,
      legacyReds: legacyReds.sort(sortDesc),
      offBrand: offBrand.sort(sortDesc),
      greyOther: greyOther.sort(sortDesc),
    },
    brandBalance,
    density,
    logo,
    footer,
    template: { usesBrandTheme, layoutCount: archive.slideLayoutPaths().length },
  };
}
