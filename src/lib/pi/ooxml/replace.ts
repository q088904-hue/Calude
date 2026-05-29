/**
 * THE FIX CORE — scoped attribute-value replacement on raw OOXML strings.
 *
 * This is the single most important module in the MVP. It NEVER parses XML into
 * an object tree and re-serializes (which would risk corrupting namespaces,
 * attribute order, or self-closing tags). It rewrites ONLY the values of
 * specific attributes in place, leaving every other byte — including all
 * <a:t> text content, geometry, and structure — untouched.
 *
 * Consequence: editability is preserved by construction. The output differs
 * from the input only in font names and color hexes (and additive logo/footer).
 */

import {
  allowedFontsLower,
  RULESET,
  isProtectedFont,
  isNeutral,
  DATAMATICS_RED,
} from "../ruleset";
import { nearestBrandColor, hexDeltaE } from "../color/distance";
import { isRedFamily } from "../color/classify";
import type { FixMode } from "../types";

const TYPEFACE_RE = /typeface="([^"]*)"/g;
const SRGB_RE = /(<a:srgbClr\s+val=")([0-9A-Fa-f]{6})(")/g;

export interface FontReplaceResult {
  xml: string;
  replaced: number;
}

/**
 * Replace any non-allowed typeface with the brand body default.
 *
 * PROTECTED (never touched): empty typeface (theme-inherited), theme-reference
 * tokens (+mn-lt, +mj-ea, …), and symbol/icon fonts (Wingdings, Symbol, …).
 * Remapping any of these corrupts the deck — proven against the real IDP deck,
 * which carries 258 theme tokens and 15 Wingdings runs.
 */
export function replaceFonts(xml: string, targetFont: string): FontReplaceResult {
  let replaced = 0;
  const out = xml.replace(TYPEFACE_RE, (full, name: string) => {
    const trimmed = name.trim();
    if (isProtectedFont(trimmed)) return full; // tokens / symbols / inherited
    if (allowedFontsLower.has(trimmed.toLowerCase())) return full; // already brand
    replaced += 1;
    return `typeface="${targetFont}"`;
  });
  return { xml: out, replaced };
}

export interface ColorReplaceResult {
  xml: string;
  replaced: number;
}

/**
 * Normalize legacy/off-brand REDS to Datamatics Red (#C00D0D).
 *
 * White-first design system: the only auto-corrected color is red — every
 * red-family color (C00000, C22127, BF2026, F65857 …) maps to C00D0D.
 *   - "snap":   only reds close to C00D0D (ΔE ≤ tol) are corrected silently.
 *   - "enforce": ALL red-family colors map to C00D0D.
 *
 * Neutrals (white / light grey / black) are NEVER remapped — they are
 * legitimate in the design system. Off-brand NON-red colors (blues, greens,
 * oranges) are NEVER auto-mapped either: forcing them to red/black/white would
 * destroy meaning. They are flagged for human review by the detector instead.
 * Image data is binary and never seen here, so photos are unaffected.
 */
export function replaceColors(xml: string, mode: FixMode): ColorReplaceResult {
  const tol = RULESET.colors.snapToleranceDeltaE;

  let replaced = 0;
  const out = xml.replace(SRGB_RE, (full, pre: string, hex: string, post: string) => {
    const H = hex.toUpperCase();
    if (H === DATAMATICS_RED) return full; // already brand red
    if (isNeutral(H)) return full; // white/grey/black — legitimate, never remap
    if (!isRedFamily(H)) return full; // non-red off-brand → flag only, never auto-map

    const within = hexDeltaE(H, DATAMATICS_RED) <= tol;
    const shouldFix = mode === "enforce" ? true : within;
    if (!shouldFix) return full;

    replaced += 1;
    return `${pre}${DATAMATICS_RED}${post}`;
  });
  return { xml: out, replaced };
}

/**
 * Normalize a theme's color scheme + font scheme to brand values, in place.
 * Only attribute values inside <a:clrScheme> and <a:fontScheme> are rewritten.
 */
export function normalizeThemeXml(xml: string): { xml: string; changed: boolean } {
  let changed = false;
  let out = xml;

  // Font scheme: rewrite major/minor latin typefaces to brand defaults.
  out = out.replace(
    /(<a:majorFont>\s*<a:latin\s+typeface=")([^"]*)(")/,
    (_full, pre, _name, post) => {
      changed = true;
      return `${pre}${RULESET.fonts.headDefault}${post}`;
    }
  );
  out = out.replace(
    /(<a:minorFont>\s*<a:latin\s+typeface=")([^"]*)(")/,
    (_full, pre, _name, post) => {
      changed = true;
      return `${pre}${RULESET.fonts.bodyDefault}${post}`;
    }
  );

  // Color scheme: snap any near-miss accent colors to brand within the clrScheme block.
  out = out.replace(
    /<a:clrScheme[\s\S]*?<\/a:clrScheme>/,
    (block) => {
      return block.replace(SRGB_RE, (full, pre, hex, post) => {
        const nearest = nearestBrandColor(hex.toUpperCase(), RULESET.colors.palette);
        if (!nearest) return full;
        if (hexDeltaE(hex, nearest.color.hex) <= RULESET.colors.snapToleranceDeltaE) {
          changed = true;
          return `${pre}${nearest.color.hex.toUpperCase()}${post}`;
        }
        return full;
      });
    }
  );

  return { xml: out, changed };
}
