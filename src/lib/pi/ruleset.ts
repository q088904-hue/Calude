/**
 * Datamatics Brand Compliance Ruleset — SINGLE SOURCE OF TRUTH.
 *
 * Powers BOTH:
 *   - Detection (Govern): the *rules* a deck is checked against.
 *   - Fixing (Auto-Fix):  the *target values* applied during correction.
 *   - Generation (Phase 1A): the brand values for new decks.
 *
 * ⚠️ COLOR/FONT/LOGO VALUES ARE PLACEHOLDERS.
 * Replace with official Datamatics Brand Guidelines values in Phase 0,
 * co-authored with the Creative & Brand team. Bump `version` on any change
 * so every compliance report is auditable against the ruleset it used.
 */

export interface BrandColor {
  name: string;
  /** 6-hex, uppercase, no leading '#'. */
  hex: string;
}

export interface Ruleset {
  version: number;
  fonts: {
    /** Typefaces considered compliant (case-insensitive match). */
    allowed: string[];
    headDefault: string;
    bodyDefault: string;
  };
  colors: {
    palette: BrandColor[];
    /**
     * ΔE (CIE76) threshold. Colors within this distance of a brand color are
     * treated as "near-misses" and silently snapped in Snap mode. Colors beyond
     * it are violations, remapped only in Enforce mode (with user approval).
     */
    snapToleranceDeltaE: number;
  };
  /**
   * White-first brand balance targets (share of categorized color usage).
   * Used by the Brand Balance Score; governance flags fire when exceeded.
   */
  balance: {
    whiteMinPct: number; // 60
    whiteMaxPct: number; // 80
    lightGreyMinPct: number; // 10
    lightGreyMaxPct: number; // 20
    blackMaxPct: number; // 20
    redMaxPct: number; // 20
  };
  logo: {
    required: boolean;
    /** Path (relative to /public or an asset store) of the approved logo PNG. */
    assetPath: string;
    /** Approved placement on the slide master, in inches (16:9 canvas 13.33×7.5). */
    master: { xIn: number; yIn: number; wIn: number };
    /** If false, foreign logos are flagged (never auto-removed in MVP). */
    allowForeign: boolean;
  };
  footer: {
    required: boolean;
    text: string;
    master: { yIn: number };
  };
  template: {
    /** Master slide name(s) that signal a deck is built on a Datamatics template. */
    masterSignatureKeys: string[];
  };
}

export const RULESET: Ruleset = {
  // EXTRACTED from the official Datamatics master template (theme1 + template slides),
  // not placeholders. Brand display font = Gill Sans; theme/UI font = Segoe UI.
  // Source: Datamatics-Presentation-Template-Light.pptx (Phase-0 validation, 2026-05).
  version: 1,

  fonts: {
    // OFFICIAL Datamatics presentation standard = Segoe UI (single approved family).
    // Confirmed by Brand Team (2026-05). Arial, Calibri AND Gill Sans are all
    // violations → normalized to Segoe UI. Gill Sans is a LEGACY template artifact
    // (historical decks only), NOT a future compliance standard.
    allowed: ["Segoe UI", "Segoe UI Light", "Segoe UI Semibold", "Segoe UI Black"],
    headDefault: "Segoe UI",
    bodyDefault: "Segoe UI",
  },

  colors: {
    // OFFICIAL Datamatics presentation design system (Brand Team, 2026-05):
    // a WHITE-FIRST system — primary colors are White, Datamatics Red, Black,
    // with Light Grey for supporting elements (cards/containers/icons/tables).
    // The theme1 accents (blue/green/orange) are NOT part of the presentation
    // design system and are treated as off-brand for governance.
    palette: [
      { name: "white", hex: "FFFFFF" },
      { name: "red", hex: "C00D0D" }, // Datamatics Red — the single brand accent
      { name: "black", hex: "000000" },
    ],
    snapToleranceDeltaE: 12,
  },

  logo: {
    required: true,
    // The template carries the logo as image1.png referenced from the slide master.
    assetPath: "pi/datamatics-logo.png",
    master: { xIn: 0.4, yIn: 0.3, wIn: 1.4 },
    allowForeign: false,
  },

  footer: {
    // NOTE: Datamatics master has NO `ftr` placeholder — footers are custom shapes.
    // Detection must scan for footer-positioned text shapes, not <p:ph type="ftr">.
    required: true,
    text: "© Datamatics  ·  Confidential",
    master: { yIn: 7.0 },
  },

  template: {
    masterSignatureKeys: ["Datamatics"],
  },

  balance: {
    whiteMinPct: 60,
    whiteMaxPct: 80,
    lightGreyMinPct: 10,
    lightGreyMaxPct: 20,
    blackMaxPct: 20,
    redMaxPct: 20,
  },
};

/** The single official Datamatics brand red — all legacy reds normalize here. */
export const DATAMATICS_RED = "C00D0D";

/**
 * Approved light-grey palette (supporting elements: cards, containers, icons,
 * tables). ALL OTHER greys are flagged as warnings but NOT auto-normalized.
 */
export const APPROVED_LIGHT_GREYS = ["F2F2F2", "D9D9D9"]; // primary, secondary

/**
 * Legacy reds seen in real decks that should normalize toward Datamatics Red.
 * (Not exhaustive — the red-family detector in color/classify.ts is the general
 * mechanism; this list documents the confirmed real-world cases.)
 */
export const LEGACY_REDS = ["C00000", "C22127", "BF2026", "F65857", "BF0000", "CC0000"];

/**
 * Greyscale neutrals are tolerated even if not exact palette entries — black,
 * white, and mid-greys recur legitimately in body text, rules, and fills.
 * (Real decks use 474747 / 999999 / F5F5F5 etc.) Saturated off-brand colors are
 * the real violations.
 */
export function isNeutral(hex: string): boolean {
  const h = hex.toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(h)) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 12; // near-grey: R≈G≈B
}

/**
 * Fonts that must NEVER be remapped:
 *  - Theme-reference tokens (+mn-lt, +mj-ea, +mn-cs …) — remapping breaks inheritance.
 *  - Symbol/icon fonts — remapping turns glyphs into garbage.
 *  - Empty typeface ("") — inherits from theme.
 */
const SYMBOL_FONTS = new Set([
  "wingdings",
  "wingdings 2",
  "wingdings 3",
  "webdings",
  "symbol",
  "marlett",
]);

export function isThemeFontToken(typeface: string): boolean {
  return typeface.startsWith("+"); // +mn-lt, +mj-ea, +mn-cs, etc.
}

export function isSymbolFont(typeface: string): boolean {
  return SYMBOL_FONTS.has(typeface.trim().toLowerCase());
}

/** True if a typeface must be left untouched by the fix engine. */
export function isProtectedFont(typeface: string): boolean {
  const t = typeface.trim();
  return t === "" || isThemeFontToken(t) || isSymbolFont(t);
}

/** Allowed fonts, lowercased, for case-insensitive membership checks. */
export const allowedFontsLower = new Set(
  RULESET.fonts.allowed.map((f) => f.toLowerCase())
);

/** Brand palette hexes, uppercased, for fast membership checks. */
export const paletteHexUpper = new Set(
  RULESET.colors.palette.map((c) => c.hex.toUpperCase())
);
