import { NextResponse } from "next/server";
import { listAudit, STORE_KIND } from "@/lib/pi/metrics";

export const runtime = "nodejs";

/** Governance audit trail — most recent fix runs (who · when · deck · scores). */
export async function GET() {
  const entries = await listAudit(50);
  return NextResponse.json({ store: STORE_KIND, count: entries.length, entries });
}
