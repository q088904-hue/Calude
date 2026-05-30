import { NextResponse } from "next/server";
import { listAudit, STORE_KIND, requirePersistence, PiPersistenceError } from "@/lib/pi/metrics";

export const runtime = "nodejs";

/** Governance audit trail — most recent fix runs (who · when · deck · scores). */
export async function GET() {
  try {
    requirePersistence();
  } catch (e) {
    if (e instanceof PiPersistenceError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }
  const entries = await listAudit(50);
  return NextResponse.json({ store: STORE_KIND, count: entries.length, entries });
}
