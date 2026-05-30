import { NextResponse } from "next/server";
import { applyFix, countViolations } from "@/lib/pi/fix/apply";
import { recordMetric, requirePersistence, PiPersistenceError } from "@/lib/pi/metrics";
import { getSessionUser } from "@/lib/pi/auth/session";
import { rateLimit, clientIp } from "@/lib/pi/ratelimit";
import type { FixMode } from "@/lib/pi/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 40 * 1024 * 1024;
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export async function POST(req: Request) {
  try {
    // Abuse cap: 30 fixes / minute per client.
    const limit = rateLimit(`fix:${clientIp(req)}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    // Fail closed if production persistence is unconfigured (fix writes an audit row).
    try {
      requirePersistence();
    } catch (e) {
      if (e instanceof PiPersistenceError) {
        return NextResponse.json({ error: e.message }, { status: 503 });
      }
      throw e;
    }

    const form = await req.formData();
    const file = form.get("file");
    const mode = (form.get("mode") === "enforce" ? "enforce" : "snap") as FixMode;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 40 MB." }, { status: 413 });
    }
    const name = file.name.toLowerCase();
    if (file.type !== PPTX_MIME && !name.endsWith(".pptx")) {
      return NextResponse.json({ error: "Only .pptx files are supported." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fix = await applyFix(buffer, mode);

    if (!fix.editabilityPassed) {
      // Safety gate: never return a deck that failed editability validation.
      return NextResponse.json(
        { error: "Auto-fix aborted: editability validation failed. Original left untouched." },
        { status: 422 }
      );
    }

    const violationsDetected = countViolations(fix.before);
    const violationsRemaining = countViolations(fix.after);
    const violationsFixed = Math.max(0, violationsDetected - violationsRemaining);

    // Lightweight measurement + audit: one attributed record per governed deck.
    const user = await getSessionUser();
    await recordMetric({
      type: "fix",
      ts: new Date().toISOString(),
      userEmail: user?.email ?? "unknown",
      filename: file.name,
      mode,
      beforeScore: fix.beforeScore,
      afterScore: fix.afterScore,
      violationsDetected,
      violationsFixed,
      editabilityPassed: fix.editabilityPassed,
      slideCount: fix.before.slideCount,
    });

    const outName = file.name.replace(/\.pptx$/i, "") + `.datamatics-fixed.pptx`;
    return new NextResponse(new Uint8Array(fix.afterBuffer), {
      status: 200,
      headers: {
        "Content-Type": PPTX_MIME,
        "Content-Disposition": `attachment; filename="${outName}"`,
        "X-PI-Before-Score": String(fix.beforeScore),
        "X-PI-After-Score": String(fix.afterScore),
        "X-PI-Violations-Detected": String(violationsDetected),
        "X-PI-Violations-Fixed": String(violationsFixed),
        "X-PI-Fixes": JSON.stringify(fix.fixesApplied),
      },
    });
  } catch (err) {
    console.error("PI fix error:", err);
    return NextResponse.json({ error: "Could not correct this presentation." }, { status: 422 });
  }
}
