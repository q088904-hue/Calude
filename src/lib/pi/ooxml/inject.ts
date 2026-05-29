/**
 * inject.ts — additive master-slide fixes for logo and slide-number badge.
 *
 * Both fixes are ADDITIVE: they append to the existing master XML without
 * rebuilding it, and only fire when the element is absent. Foreign logos are
 * never removed (unsafe) — only the correct logo is inserted when none exists.
 *
 * Coordinates come from the real Datamatics template (Phase-0 extraction):
 *   • Logo:   10×7.5in canvas → 9144000×5143500 EMU (4:3)
 *             position  x=8688496 y=162521   size cx=315899 cy=315899
 *             top-right corner, ~0.34in below top, ~0.03in from right edge
 *   • Badge:  position  x=8604448 y=4906921  size cx=423798 cy=236579
 *             brand-red circle containing the slide-number field, bottom-right
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PptxArchive } from "./archive";

// ── Logo asset ─────────────────────────────────────────────────────────────

let _logoBytes: Buffer | null = null;

function logoBytes(): Buffer | null {
  if (_logoBytes) return _logoBytes;
  const candidates = [
    resolve(process.cwd(), "public/pi/datamatics-logo.png"),
    resolve(process.cwd(), "public/logo.svg"), // fallback SVG
  ];
  for (const p of candidates) {
    try {
      _logoBytes = readFileSync(p);
      return _logoBytes;
    } catch {
      /* try next */
    }
  }
  return null;
}

// ── Relationship helpers ───────────────────────────────────────────────────

const IMG_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

/** Find the highest rId number already in a rels string to avoid collision. */
function nextRelId(relsXml: string): string {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  const max = ids.length ? Math.max(...ids) : 0;
  return `rId${max + 1}`;
}

function appendRelationship(relsXml: string, id: string, target: string): string {
  const rel = `<Relationship Id="${id}" Type="${IMG_REL_TYPE}" Target="${target}"/>`;
  return relsXml.replace(/<\/Relationships>/, `${rel}</Relationships>`);
}

// ── Master XML helpers ─────────────────────────────────────────────────────

/** The next shape id — must be unique across all shapes in the master. */
function nextShapeId(masterXml: string): number {
  const ids = [...masterXml.matchAll(/\bid="(\d+)"/g)].map((m) => Number(m[1]));
  return ids.length ? Math.max(...ids) + 1 : 100;
}

/** Append a new element just before </p:spTree>. */
function appendToSpTree(masterXml: string, element: string): string {
  return masterXml.replace(/<\/p:spTree>/, `${element}</p:spTree>`);
}

// ── Logo injection ─────────────────────────────────────────────────────────

/** True when the master already has a picture element referencing an image. */
function masterHasLogo(masterXml: string): boolean {
  return /<p:pic[\s>]/.test(masterXml);
}

function buildLogoPic(rId: string, shapeId: number): string {
  return `<p:pic xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<p:nvPicPr>` +
    `<p:cNvPr id="${shapeId}" name="Datamatics Logo"/>` +
    `<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>` +
    `<p:nvPr/>` +
    `</p:nvPicPr>` +
    `<p:blipFill>` +
    `<a:blip r:embed="${rId}" cstate="print"/>` +
    `<a:stretch><a:fillRect/></a:stretch>` +
    `</p:blipFill>` +
    `<p:spPr bwMode="auto">` +
    `<a:xfrm><a:off x="8688496" y="162521"/><a:ext cx="315899" cy="315899"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
    `<a:noFill/>` +
    `</p:spPr>` +
    `</p:pic>`;
}

// ── Slide-number badge injection ──────────────────────────────────────────

/** True when the master already has a slide-number field. */
function masterHasSlideBadge(masterXml: string): boolean {
  return /type="slidenum"/.test(masterXml);
}

function buildSlideBadge(shapeId: number): string {
  return `<p:sp>` +
    `<p:nvSpPr>` +
    `<p:cNvPr id="${shapeId}" name="Slide Number Placeholder"/>` +
    `<p:cNvSpPr txBox="1"><a:spLocks/></p:cNvSpPr>` +
    `<p:nvPr/>` +
    `</p:nvSpPr>` +
    `<p:spPr>` +
    `<a:xfrm><a:off x="8604448" y="4906921"/><a:ext cx="423798" cy="236579"/></a:xfrm>` +
    `<a:prstGeom prst="round2SameRect"><a:avLst/></a:prstGeom>` +
    `<a:solidFill><a:srgbClr val="C00D0D"/></a:solidFill>` +
    `</p:spPr>` +
    `<p:txBody>` +
    `<a:bodyPr/>` +
    `<a:lstStyle><a:lvl1pPr algn="ctr"><a:defRPr sz="800"/></a:lvl1pPr></a:lstStyle>` +
    `<a:p><a:fld id="{PI-SLIDENUM-FIELD}" type="slidenum">` +
    `<a:rPr lang="en-US" sz="800" kern="1200">` +
    `<a:solidFill><a:schemeClr val="bg1"/></a:solidFill>` +
    `<a:latin typeface="Segoe UI"/>` +
    `</a:rPr>` +
    `<a:t>‹#›</a:t>` +
    `</a:fld></a:p>` +
    `</p:txBody>` +
    `</p:sp>`;
}

// ── Public API ────────────────────────────────────────────────────────────

export interface InjectResult {
  logo: boolean;   // true = logo was injected
  footer: boolean; // true = slide-number badge was injected
}

/**
 * Inject logo and/or slide-number badge into every master that lacks them.
 * Modifies the archive in place (call archive.toBuffer() to serialize).
 * Returns what was actually injected.
 */
export async function injectMasterElements(archive: PptxArchive): Promise<InjectResult> {
  const result: InjectResult = { logo: false, footer: false };
  const bytes = logoBytes();

  for (const masterPath of archive.slideMasterPaths()) {
    let masterXml = await archive.readText(masterPath);

    const relPath = masterPath.replace(
      /slideMasters\/(slideMaster\d+\.xml)$/,
      "slideMasters/_rels/$1.rels"
    );
    const hasRels = archive.has(relPath);
    let relsXml = hasRels ? await archive.readText(relPath) : defaultRels();

    // ── Logo ──
    if (bytes && !masterHasLogo(masterXml)) {
      const mediaPath = "ppt/media/pi-logo.png";
      if (!archive.has(mediaPath)) archive.writeBinary(mediaPath, bytes);

      const relTarget = "../media/pi-logo.png";
      const rId = nextRelId(relsXml);
      relsXml = appendRelationship(relsXml, rId, relTarget);

      const shapeId = nextShapeId(masterXml);
      masterXml = appendToSpTree(masterXml, buildLogoPic(rId, shapeId));
      result.logo = true;
    }

    // ── Slide-number badge ──
    if (!masterHasSlideBadge(masterXml)) {
      const shapeId = nextShapeId(masterXml);
      masterXml = appendToSpTree(masterXml, buildSlideBadge(shapeId));
      result.footer = true;
    }

    if (result.logo || result.footer) {
      archive.writeText(masterPath, masterXml);
      archive.writeText(relPath, relsXml);
    }
  }

  return result;
}

function defaultRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
}
