/**
 * Footer detection — CUSTOM-SHAPE scanner.
 *
 * The Datamatics master has NO `<p:ph type="ftr">` placeholder (confirmed in
 * Phase-0), so footers are ordinary text shapes positioned in the bottom band.
 * We scan masters, layouts, and slides for a text shape whose vertical offset is
 * in the bottom ~18% of the canvas, or whose text matches footer keywords
 * (©, Datamatics, Confidential, page/slide numbers).
 */

import { PptxArchive } from "../ooxml/archive";

export interface FooterFinding {
  presentOnMaster: boolean;
  slidesWithFooter: number;
  slideCount: number;
}

const FOOTER_KEYWORDS = /(©|copyright|datamatics|confidential|all rights reserved)/i;

async function canvasHeight(archive: PptxArchive): Promise<number> {
  try {
    const xml = await archive.readText("ppt/presentation.xml");
    const m = /<p:sldSz\s+cx="\d+"\s+cy="(\d+)"/.exec(xml);
    if (m) return Number(m[1]);
  } catch {
    /* default below */
  }
  return 6858000; // 7.5in
}

/** A part "has a footer" if a text shape sits in the bottom band or matches keywords. */
function hasFooterShape(xml: string, cy: number): boolean {
  const bandTop = cy * 0.82;
  // Examine each shape block for position + text.
  for (const sp of xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)) {
    const block = sp[0];
    const text = [...block.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => m[1]).join(" ");
    if (!text.trim()) continue;
    if (FOOTER_KEYWORDS.test(text)) return true;
    const off = /<a:off\s+x="-?\d+"\s+y="(-?\d+)"/.exec(block);
    if (off && Number(off[1]) >= bandTop) return true;
  }
  return false;
}

export async function detectFooter(archive: PptxArchive): Promise<FooterFinding> {
  const cy = await canvasHeight(archive);

  let presentOnMaster = false;
  for (const m of archive.slideMasterPaths()) {
    if (hasFooterShape(await archive.readText(m), cy)) {
      presentOnMaster = true;
      break;
    }
  }
  // Layouts often carry the footer too — count that toward master-level presence.
  if (!presentOnMaster) {
    for (const l of archive.slideLayoutPaths()) {
      if (hasFooterShape(await archive.readText(l), cy)) {
        presentOnMaster = true;
        break;
      }
    }
  }

  const slidePaths = archive.slidePaths();
  let slidesWithFooter = 0;
  for (const s of slidePaths) {
    if (hasFooterShape(await archive.readText(s), cy)) slidesWithFooter++;
  }

  return { presentOnMaster, slidesWithFooter, slideCount: slidePaths.length };
}
