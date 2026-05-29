/**
 * Read-only OOXML inspection helpers.
 *
 * Collects the data the detection engine needs (typefaces, colors, text runs,
 * theme schemes) without mutating anything. We use targeted regex extraction
 * because (a) it mirrors exactly what the fix layer rewrites, so detection and
 * fixing stay consistent, and (b) it is immune to the namespace/order fragility
 * of full parse→object round-trips.
 *
 * fast-xml-parser is used where structured tree access genuinely helps
 * (theme color/font scheme), in read-only mode.
 */

import { XMLParser } from "fast-xml-parser";
import { PptxArchive } from "./archive";

const TYPEFACE_RE = /typeface="([^"]*)"/g;
const SRGB_RE = /<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/g;
const TEXT_RUN_RE = /<a:t>([\s\S]*?)<\/a:t>/g;

export interface FontUsage {
  typeface: string;
  /** part path → count */
  occurrences: Map<string, number>;
  total: number;
}

export interface ColorUsage {
  hex: string; // uppercase
  occurrences: Map<string, number>;
  total: number;
}

function tallyAcross(
  contents: { path: string; xml: string }[],
  re: RegExp,
  transform: (raw: string) => string | null
): Map<string, { occurrences: Map<string, number>; total: number }> {
  const out = new Map<string, { occurrences: Map<string, number>; total: number }>();
  for (const { path, xml } of contents) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const key = transform(m[1]);
      if (key === null || key === "") continue;
      let entry = out.get(key);
      if (!entry) {
        entry = { occurrences: new Map(), total: 0 };
        out.set(key, entry);
      }
      entry.occurrences.set(path, (entry.occurrences.get(path) ?? 0) + 1);
      entry.total += 1;
    }
  }
  return out;
}

async function loadStyleParts(
  archive: PptxArchive
): Promise<{ path: string; xml: string }[]> {
  const paths = archive.styleBearingPaths();
  return Promise.all(
    paths.map(async (path) => ({ path, xml: await archive.readText(path) }))
  );
}

/** All distinct typefaces used across the deck, with per-part counts. */
export async function collectFonts(archive: PptxArchive): Promise<FontUsage[]> {
  const parts = await loadStyleParts(archive);
  const tally = tallyAcross(parts, TYPEFACE_RE, (raw) => raw.trim());
  return [...tally.entries()].map(([typeface, v]) => ({
    typeface,
    occurrences: v.occurrences,
    total: v.total,
  }));
}

/** All distinct srgbClr hex values used across the deck, with per-part counts. */
export async function collectColors(archive: PptxArchive): Promise<ColorUsage[]> {
  const parts = await loadStyleParts(archive);
  const tally = tallyAcross(parts, SRGB_RE, (raw) => raw.toUpperCase());
  return [...tally.entries()].map(([hex, v]) => ({
    hex,
    occurrences: v.occurrences,
    total: v.total,
  }));
}

/** Ordered list of every slide's text-run contents — the editability fingerprint. */
export async function extractAllText(archive: PptxArchive): Promise<string[]> {
  const out: string[] = [];
  for (const path of archive.slidePaths()) {
    const xml = await archive.readText(path);
    TEXT_RUN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TEXT_RUN_RE.exec(xml)) !== null) {
      out.push(m[1]);
    }
  }
  return out;
}

export interface ThemeScheme {
  path: string;
  /** scheme color name → hex (uppercase) */
  colors: Record<string, string>;
  majorFont?: string;
  minorFont?: string;
}

const themeParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

/** Read theme color + font schemes (read-only, structured). */
export async function readThemeSchemes(
  archive: PptxArchive
): Promise<ThemeScheme[]> {
  const results: ThemeScheme[] = [];
  for (const path of archive.themePaths()) {
    const xml = await archive.readText(path);
    const tree = themeParser.parse(xml);
    const themeEl = tree?.theme?.themeElements ?? {};
    const clrScheme = themeEl.clrScheme ?? {};
    const fontScheme = themeEl.fontScheme ?? {};

    const colors: Record<string, string> = {};
    for (const [slot, node] of Object.entries(clrScheme)) {
      if (slot.startsWith("@_")) continue;
      const n = node as Record<string, { "@_val"?: string; "@_lastClr"?: string }>;
      const srgb = n?.srgbClr?.["@_val"];
      const sys = n?.sysClr?.["@_lastClr"];
      if (srgb) colors[slot] = srgb.toUpperCase();
      else if (sys) colors[slot] = sys.toUpperCase();
    }

    const majorFont = fontScheme?.majorFont?.latin?.["@_typeface"];
    const minorFont = fontScheme?.minorFont?.latin?.["@_typeface"];

    results.push({ path, colors, majorFont, minorFont });
  }
  return results;
}
