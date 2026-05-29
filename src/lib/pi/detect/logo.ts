/**
 * Logo detection.
 *
 * The Datamatics template carries the logo as an image referenced from the slide
 * master (image1.png). We detect logo PRESENCE on the master (image relationship
 * + a <p:pic> placement). We deliberately do NOT attempt to identify or remove a
 * *wrong* logo — that is unsafe in the MVP; foreign logos are flagged for review,
 * and the fix engine only injects the correct logo when one is missing.
 */

import { PptxArchive } from "../ooxml/archive";

export interface LogoFinding {
  presentOnMaster: boolean;
  masterImageRefs: number;
  /** Number of slides that carry their own picture in the top header band. */
  slidesWithHeaderImage: number;
}

export async function detectLogo(archive: PptxArchive): Promise<LogoFinding> {
  let masterImageRefs = 0;
  let masterHasPic = false;

  for (const masterPath of archive.slideMasterPaths()) {
    const relPath = masterPath.replace(
      /slideMasters\/(slideMaster\d+\.xml)$/,
      "slideMasters/_rels/$1.rels"
    );
    if (archive.has(relPath)) {
      const rels = await archive.readText(relPath);
      masterImageRefs += (rels.match(/Type="[^"]*\/image"/g) || []).length;
    }
    const xml = await archive.readText(masterPath);
    if (/<p:pic[\s>]/.test(xml)) masterHasPic = true;
  }

  return {
    presentOnMaster: masterImageRefs > 0 && masterHasPic,
    masterImageRefs,
    slidesWithHeaderImage: 0, // reserved for Week-2 per-slide logo audit
  };
}
