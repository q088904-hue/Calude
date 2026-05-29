/**
 * Color classification for the white-first Datamatics design system.
 *
 * Buckets every color into: white | lightGrey | black (dark neutral) | red
 * (Datamatics red or red-family) | offBrand (saturated non-red — blues, greens,
 * etc., which are NOT part of the presentation design system).
 *
 * Red-family detection is hue-based so legacy reds (C00000, C22127, BF2026,
 * F65857 …) are all recognized and normalized toward Datamatics Red (#C00D0D).
 */

import { hexToRgb, normalizeHex, hexDeltaE } from "./distance";
import { APPROVED_LIGHT_GREYS } from "../ruleset";

export type ColorCategory =
  | "white"
  | "lightGrey" // approved supporting grey (F2F2F2 / D9D9D9)
  | "greyOther" // non-approved grey → WARNING (not auto-normalized)
  | "black"
  | "red"
  | "offBrand";

interface Hsl {
  h: number; // 0–360
  s: number; // 0–1
  l: number; // 0–1
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / d + 2) * 60;
        break;
      default:
        h = ((rn - gn) / d + 4) * 60;
    }
  }
  return { h, s, l };
}

const NEUTRAL_CHROMA = 12; // max-min channel spread to count as "grey"
const APPROVED_GREY_TOL = 6; // ΔE within which a grey counts as an approved light grey
const NEAR_BLACK_L = 0.14; // luminance ≤ this = black bucket
const NEAR_WHITE_MAX = 0xf5; // channel max ≥ this (and grey) = white

/** Red-family: hue near 0°/360°, with real saturation, not near-black/white. */
export function isRedFamily(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const redHue = h <= 15 || h >= 345;
  return redHue && s >= 0.3 && l > 0.12 && l < 0.9;
}

/** True only for the approved light greys (F2F2F2 / D9D9D9), within tolerance. */
export function isApprovedLightGrey(hex: string): boolean {
  const H = normalizeHex(hex);
  if (!H) return false;
  return APPROVED_LIGHT_GREYS.some((g) => hexDeltaE(H, g) <= APPROVED_GREY_TOL);
}

export function categorize(hex: string): ColorCategory {
  const H = normalizeHex(hex);
  if (!H) return "offBrand";
  const rgb = hexToRgb(H)!;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const isGrey = max - min <= NEUTRAL_CHROMA;

  if (isGrey) {
    if (max >= NEAR_WHITE_MAX) return "white";
    if ((max + min) / 2 / 255 <= NEAR_BLACK_L) return "black";
    if (isApprovedLightGrey(H)) return "lightGrey";
    return "greyOther"; // a grey, but not an approved one → warning
  }
  if (isRedFamily(H)) return "red";
  return "offBrand";
}

export interface BalanceCounts {
  white: number;
  lightGrey: number;
  greyOther: number;
  black: number;
  red: number;
  offBrand: number;
}

export function emptyCounts(): BalanceCounts {
  return { white: 0, lightGrey: 0, greyOther: 0, black: 0, red: 0, offBrand: 0 };
}

export function tallyColor(counts: BalanceCounts, hex: string, weight = 1): void {
  counts[categorize(hex)] += weight;
}
