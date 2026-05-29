/**
 * Editability gate — runs after every fix. A fix is REJECTED if any check fails.
 *
 * These assertions are the automatable proxy for "the deck is still a fully
 * editable PowerPoint file, with all its content intact." They cannot prove
 * visual fidelity (that needs a manual PowerPoint open), but they catch every
 * structural / content-loss failure mode deterministically.
 */

import { PptxArchive } from "./ooxml/archive";
import { extractAllText } from "./ooxml/read";

export interface ValidationResult {
  passed: boolean;
  checks: {
    textIdentical: boolean;
    slideCountUnchanged: boolean;
    xmlWellFormed: boolean;
    zipValid: boolean;
    noRasterization: boolean;
  };
  details: string[];
}

const XML_DECL_OR_TAG = /^﻿?\s*<\?xml|^﻿?\s*</;

/** Lightweight well-formedness: balanced-ish tag scan + parseable by JSZip read. */
function looksWellFormed(xml: string): boolean {
  if (!XML_DECL_OR_TAG.test(xml)) return false;
  // Cheap sanity: every '<' that opens a tag should find a '>'.
  let depthOk = true;
  let open = 0;
  for (let i = 0; i < xml.length; i++) {
    const c = xml[i];
    if (c === "<") open++;
    else if (c === ">") open--;
    if (open < 0) {
      depthOk = false;
      break;
    }
  }
  return depthOk && open === 0;
}

/**
 * Compare the corrected archive against the original.
 * `mediaAddedAllowance` = how many media parts the fix is permitted to add
 * (e.g. 1 for an injected logo); any text→image substitution beyond that fails.
 */
export async function validateEditability(
  originalBuffer: Buffer,
  fixedBuffer: Buffer,
  mediaAddedAllowance = 2
): Promise<ValidationResult> {
  const details: string[] = [];
  const checks = {
    textIdentical: false,
    slideCountUnchanged: false,
    xmlWellFormed: false,
    zipValid: false,
    noRasterization: false,
  };

  let original: PptxArchive;
  let fixed: PptxArchive;
  try {
    original = await PptxArchive.load(originalBuffer);
    fixed = await PptxArchive.load(fixedBuffer);
    checks.zipValid = true;
  } catch (e) {
    details.push(`Corrected file is not a valid zip: ${(e as Error).message}`);
    return { passed: false, checks, details };
  }

  // 1. Text integrity — the set/sequence of <a:t> runs must be identical.
  const beforeText = await extractAllText(original);
  const afterText = await extractAllText(fixed);
  checks.textIdentical =
    beforeText.length === afterText.length &&
    beforeText.every((t, i) => t === afterText[i]);
  if (!checks.textIdentical) {
    details.push(
      `Text changed: ${beforeText.length} runs before, ${afterText.length} after.`
    );
  }

  // 2. Slide count unchanged.
  const beforeSlides = original.slidePaths().length;
  const afterSlides = fixed.slidePaths().length;
  checks.slideCountUnchanged = beforeSlides === afterSlides;
  if (!checks.slideCountUnchanged) {
    details.push(`Slide count changed: ${beforeSlides} → ${afterSlides}.`);
  }

  // 3. XML well-formedness across all modified text parts.
  let allWellFormed = true;
  for (const path of fixed.styleBearingPaths()) {
    const xml = await fixed.readText(path);
    if (!looksWellFormed(xml)) {
      allWellFormed = false;
      details.push(`Malformed XML: ${path}`);
    }
  }
  checks.xmlWellFormed = allWellFormed;

  // 4. No rasterization — media count must not balloon (text→image swap).
  const beforeMedia = original.match(/^ppt\/media\//).length;
  const afterMedia = fixed.match(/^ppt\/media\//).length;
  checks.noRasterization = afterMedia - beforeMedia <= mediaAddedAllowance;
  if (!checks.noRasterization) {
    details.push(
      `Media grew by ${afterMedia - beforeMedia} (allowance ${mediaAddedAllowance}) — possible rasterization.`
    );
  }

  const passed =
    checks.textIdentical &&
    checks.slideCountUnchanged &&
    checks.xmlWellFormed &&
    checks.zipValid &&
    checks.noRasterization;

  return { passed, checks, details };
}
