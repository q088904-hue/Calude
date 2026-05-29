/**
 * Unit tests for the riskiest PI engine logic: color math + scoped replacement.
 * Run: npx tsx --test scripts/pi/engine.test.ts
 * No test framework dependency — uses node:test + node:assert.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hexToRgb,
  normalizeHex,
  hexDeltaE,
  nearestBrandColor,
} from "../../src/lib/pi/color/distance";
import {
  replaceFonts,
  replaceColors,
  normalizeThemeXml,
} from "../../src/lib/pi/ooxml/replace";
import {
  RULESET,
  isProtectedFont,
  isNeutral,
} from "../../src/lib/pi/ruleset";

test("normalizeHex handles # prefix and case", () => {
  assert.equal(normalizeHex("#e4002b"), "E4002B");
  assert.equal(normalizeHex("E4002B"), "E4002B");
  assert.equal(normalizeHex("xyz"), null);
});

test("hexToRgb parses correctly", () => {
  assert.deepEqual(hexToRgb("FF0000"), { r: 255, g: 0, b: 0 });
  assert.deepEqual(hexToRgb("#000000"), { r: 0, g: 0, b: 0 });
});

test("hexDeltaE is zero for identical colors", () => {
  assert.equal(hexDeltaE("E4002B", "E4002B"), 0);
});

test("nearestBrandColor finds the closest palette entry", () => {
  // Off-brand red C00000 should map to brand red F65857.
  const n = nearestBrandColor("C00000", RULESET.colors.palette);
  assert.equal(n?.color.name, "red"); // F65857
});

test("isProtectedFont guards theme tokens, symbols, and inherited", () => {
  assert.ok(isProtectedFont("")); // theme-inherited
  assert.ok(isProtectedFont("+mn-lt")); // theme reference token
  assert.ok(isProtectedFont("+mj-ea"));
  assert.ok(isProtectedFont("Wingdings")); // symbol font
  assert.ok(!isProtectedFont("Arial")); // a real violation
  assert.ok(!isProtectedFont("Segoe UI")); // brand, but not "protected"
});

test("isNeutral recognizes greys/black/white", () => {
  assert.ok(isNeutral("000000"));
  assert.ok(isNeutral("FFFFFF"));
  assert.ok(isNeutral("474747"));
  assert.ok(isNeutral("999999"));
  assert.ok(!isNeutral("C00000")); // saturated red
});

test("replaceFonts swaps violations (incl. legacy Gill Sans), preserves tokens/symbols/inherited", () => {
  const xml = `<a:latin typeface="Arial"/><a:latin typeface="Segoe UI"/><a:latin typeface="Gill Sans"/><a:latin typeface="+mn-lt"/><a:latin typeface="Wingdings"/><a:latin typeface=""/>`;
  const { xml: out, replaced } = replaceFonts(xml, "Segoe UI");
  assert.equal(replaced, 2); // Arial + Gill Sans (legacy artifact)
  assert.ok(!out.includes(`typeface="Gill Sans"`)); // legacy → Segoe UI
  assert.ok(!out.includes(`typeface="Arial"`));
  assert.ok(out.includes(`typeface="+mn-lt"`)); // theme token kept
  assert.ok(out.includes(`typeface="Wingdings"`)); // symbol kept
  assert.ok(out.includes(`typeface=""`)); // inherited kept
});

test("replaceColors enforce normalizes red-family → C00D0D; leaves neutrals + off-brand non-red", () => {
  // 474747 = neutral; C22127/F65857 = legacy reds; 2F93E9 = off-brand blue (must NOT map).
  const xml = `<a:srgbClr val="474747"/><a:srgbClr val="C22127"/><a:srgbClr val="F65857"/><a:srgbClr val="2F93E9"/>`;
  const enforce = replaceColors(xml, "enforce");
  assert.equal(enforce.replaced, 2); // both reds → C00D0D
  assert.ok(enforce.xml.includes(`val="474747"`)); // neutral preserved
  assert.ok(enforce.xml.includes(`val="2F93E9"`)); // off-brand blue NOT auto-mapped (flag only)
  assert.ok(!enforce.xml.includes(`val="C22127"`));
  assert.ok(!enforce.xml.includes(`val="F65857"`));
  assert.equal((enforce.xml.match(/C00D0D/g) || []).length, 2);
});

test("replaceColors snap only corrects reds close to C00D0D", () => {
  // C00000 is ΔE~few from C00D0D → snapped; C22127 is further → left in snap.
  const xml = `<a:srgbClr val="C00000"/>`;
  const snap = replaceColors(xml, "snap");
  assert.equal(snap.replaced, 1);
  assert.ok(snap.xml.includes(`val="C00D0D"`));
});

test("replacement preserves surrounding XML structure exactly", () => {
  const xml = `<a:rPr sz="2400"><a:solidFill><a:srgbClr val="C00000"/></a:solidFill><a:latin typeface="Arial"/></a:rPr>`;
  let out = replaceFonts(xml, "Segoe UI").xml;
  out = replaceColors(out, "enforce").xml;
  assert.equal(
    out,
    `<a:rPr sz="2400"><a:solidFill><a:srgbClr val="C00D0D"/></a:solidFill><a:latin typeface="Segoe UI"/></a:rPr>`
  );
});

test("normalizeThemeXml rewrites major/minor fonts to brand", () => {
  const theme = `<a:fontScheme><a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme>`;
  const { xml, changed } = normalizeThemeXml(theme);
  assert.ok(changed);
  assert.ok(xml.includes(`<a:majorFont><a:latin typeface="${RULESET.fonts.headDefault}"`));
  assert.ok(xml.includes(`<a:minorFont><a:latin typeface="${RULESET.fonts.bodyDefault}"`));
});

test("analyzePptx rejects a valid zip that is not a PowerPoint", async () => {
  const { default: JSZip } = await import("jszip");
  const { analyzePptx } = await import("../../src/lib/pi/analyze");
  const z = new JSZip();
  z.file("hello.txt", "not a deck");
  const buf = await z.generateAsync({ type: "nodebuffer" });
  await assert.rejects(() => analyzePptx(buf as Buffer), /Not a PowerPoint/);
});
