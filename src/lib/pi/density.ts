/**
 * Visual Density Score — flags overloaded / hard-to-consume slides.
 *
 * Measures, per slide, from the OOXML:
 *   - text volume     (characters across <a:t> runs)
 *   - object count    (<p:sp> shapes + <p:pic> + <p:graphicFrame>)
 *   - shape count     (<p:sp>)
 *   - table density   (<a:tc> cells)
 *   - whitespace      (1 − coverage; coverage = Σ top-level shape area / slide area)
 *
 * Produces a 0–100 density-health score (higher = cleaner) and per-slide
 * recommendations. This is a heuristic consumption-load proxy, not a layout
 * engine — it surfaces the slides a human should simplify.
 */

import { PptxArchive } from "./ooxml/archive";

export interface SlideDensity {
  slide: number;
  textChars: number;
  shapes: number;
  objects: number;
  tableCells: number;
  coveragePct: number; // % of slide area covered by top-level shapes
  whitespacePct: number; // 100 − coverage
  overloaded: boolean;
  recommendations: string[];
}

export interface DensityReport {
  score: number; // 0–100 (higher = cleaner)
  slides: SlideDensity[];
  overloadedSlides: number[];
}

// Consumption-load thresholds (per slide). Tuned for exec presentations.
const TH = {
  textChars: 600, // ~100 words
  objects: 12,
  tableCells: 40,
  minWhitespacePct: 30, // below this = visually crowded
};

function count(re: RegExp, s: string): number {
  const m = s.match(re);
  return m ? m.length : 0;
}

/** Slide canvas size (EMU) from presentation.xml; defaults to 16:9 @ 12192000×6858000. */
async function slideSize(archive: PptxArchive): Promise<{ cx: number; cy: number }> {
  try {
    const xml = await archive.readText("ppt/presentation.xml");
    const m = /<p:sldSz\s+cx="(\d+)"\s+cy="(\d+)"/.exec(xml);
    if (m) return { cx: Number(m[1]), cy: Number(m[2]) };
  } catch {
    /* fall through to default */
  }
  return { cx: 12192000, cy: 6858000 };
}

/** Sum of top-level shape areas (EMU²) via <a:off>/<a:ext> on the spTree children. */
function topLevelCoverageEmu(xml: string): number {
  // Match <a:ext cx=".." cy=".."/> — approximate coverage by summing all ext boxes.
  let area = 0;
  for (const m of xml.matchAll(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\s*\/>/g)) {
    area += Number(m[1]) * Number(m[2]);
  }
  return area;
}

export async function analyzeDensity(archive: PptxArchive): Promise<DensityReport> {
  const { cx, cy } = await slideSize(archive);
  const slideArea = cx * cy;
  const slides: SlideDensity[] = [];

  const paths = archive.slidePaths();
  for (let i = 0; i < paths.length; i++) {
    const xml = await archive.readText(paths[i]);
    const textChars = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].reduce(
      (a, m) => a + m[1].length,
      0
    );
    const shapes = count(/<p:sp>/g, xml);
    const pics = count(/<p:pic>/g, xml);
    const frames = count(/<p:graphicFrame>/g, xml);
    const objects = shapes + pics + frames;
    const tableCells = count(/<a:tc>/g, xml);

    const coveragePct = slideArea
      ? Math.min(100, Math.round((topLevelCoverageEmu(xml) / slideArea) * 100))
      : 0;
    const whitespacePct = Math.max(0, 100 - coveragePct);

    const recommendations: string[] = [];
    if (textChars > TH.textChars)
      recommendations.push(`High text volume (${textChars} chars) — split or summarize.`);
    if (objects > TH.objects)
      recommendations.push(`${objects} objects — reduce to focus attention.`);
    if (tableCells > TH.tableCells)
      recommendations.push(`Dense table (${tableCells} cells) — consider splitting or charting.`);
    if (whitespacePct < TH.minWhitespacePct)
      recommendations.push(`Low whitespace (${whitespacePct}%) — add breathing room.`);

    const overloaded = recommendations.length >= 2;
    slides.push({
      slide: i + 1,
      textChars,
      shapes,
      objects,
      tableCells,
      coveragePct,
      whitespacePct,
      overloaded,
      recommendations,
    });
  }

  const overloadedSlides = slides.filter((s) => s.overloaded).map((s) => s.slide);
  // Score: start at 100, −8 per overloaded slide, −2 per slide with any single issue.
  const singleIssue = slides.filter((s) => s.recommendations.length === 1).length;
  const score = Math.max(
    0,
    Math.round(100 - overloadedSlides.length * 8 - singleIssue * 2)
  );

  return { score, slides, overloadedSlides };
}
