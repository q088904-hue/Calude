import { NextResponse } from "next/server";
import {
  recordMetric,
  summarizeKpis,
  requirePersistence,
  PiPersistenceError,
} from "@/lib/pi/metrics";
import { getSessionUser } from "@/lib/pi/auth/session";

export const runtime = "nodejs";

function persistenceGuard(): NextResponse | null {
  try {
    requirePersistence();
    return null;
  } catch (e) {
    if (e instanceof PiPersistenceError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }
}

/** GET → aggregate KPI summary (meaningful even at N=1). */
export async function GET() {
  const blocked = persistenceGuard();
  if (blocked) return blocked;
  const kpis = await summarizeKpis();
  return NextResponse.json(kpis);
}

/** POST → record a feedback record (satisfaction + estimated cleanup minutes saved). */
export async function POST(req: Request) {
  const blocked = persistenceGuard();
  if (blocked) return blocked;
  try {
    const body = await req.json();
    const satisfaction = Number(body.satisfaction);
    const estimatedMinutesSaved = Number(body.estimatedMinutesSaved) || 0;
    if (!body.filename || !(satisfaction >= 1 && satisfaction <= 5)) {
      return NextResponse.json({ error: "filename and satisfaction (1–5) required." }, { status: 400 });
    }
    const user = await getSessionUser();
    await recordMetric({
      type: "feedback",
      ts: new Date().toISOString(),
      userEmail: user?.email ?? "unknown",
      filename: String(body.filename),
      satisfaction,
      estimatedMinutesSaved,
      manualStillNeeded: Boolean(body.manualStillNeeded),
      notes: body.notes ? String(body.notes).slice(0, 500) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid feedback payload." }, { status: 400 });
  }
}
