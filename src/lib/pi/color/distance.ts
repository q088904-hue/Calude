/**
 * Color math for brand-compliance fixing.
 * Hex → CIE L*a*b* → ΔE (CIE76), plus nearest-brand-color mapping.
 *
 * Hand-rolled (no dependency) — the math is small, stable, and well-defined.
 * CIE76 ΔE is sufficient for "is this color close to a brand color?" decisions;
 * perceptual upgrades (ΔE2000) are a later refinement, not needed for MVP.
 */

import type { BrandColor } from "../ruleset";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** Normalize "#RRGGBB" | "RRGGBB" → "RRGGBB" uppercase, or null if invalid. */
export function normalizeHex(hex: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m ? m[1].toUpperCase() : null;
}

export function hexToRgb(hex: string): Rgb | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** sRGB → CIE XYZ (D65) → L*a*b*. */
export function rgbToLab({ r, g, b }: Rgb): Lab {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  // Linear sRGB → XYZ (D65)
  let x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
  let y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  let z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;

  // Normalize by D65 reference white
  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** CIE76 ΔE between two Lab colors. */
export function deltaE(a: Lab, b: Lab): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** ΔE between two hex colors (returns Infinity if either is invalid). */
export function hexDeltaE(hex1: string, hex2: string): number {
  const r1 = hexToRgb(hex1);
  const r2 = hexToRgb(hex2);
  if (!r1 || !r2) return Infinity;
  return deltaE(rgbToLab(r1), rgbToLab(r2));
}

export interface NearestResult {
  color: BrandColor;
  distance: number;
}

/** Nearest brand color to `hex` by ΔE. Null if hex invalid or palette empty. */
export function nearestBrandColor(
  hex: string,
  palette: BrandColor[]
): NearestResult | null {
  const rgb = hexToRgb(hex);
  if (!rgb || palette.length === 0) return null;
  const lab = rgbToLab(rgb);

  let best: NearestResult | null = null;
  for (const c of palette) {
    const crgb = hexToRgb(c.hex);
    if (!crgb) continue;
    const d = deltaE(lab, rgbToLab(crgb));
    if (!best || d < best.distance) best = { color: c, distance: d };
  }
  return best;
}
