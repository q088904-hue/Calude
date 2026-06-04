// GET  /api/stagecraft/activity → current server activity (streak + today counts)
// POST /api/stagecraft/activity → merge a client snapshot into the server copy,
//                                 returns the merged result. Used for the one-time
//                                 localStorage→server migration AND ongoing pushes
//                                 when a session/quickfire is recorded. Idempotent.

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import {
  getActivity,
  mergeAndSaveActivity,
  type ActivityData,
} from "@/lib/stagecraft/activityStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireStagecraftUser();
  if (gate instanceof Response) return gate;
  return Response.json(await getActivity());
}

export async function POST(request: NextRequest) {
  const gate = await requireStagecraftUser();
  if (gate instanceof Response) return gate;
  let body: ActivityData;
  try {
    body = (await request.json()) as ActivityData;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  return Response.json(await mergeAndSaveActivity(body ?? {}));
}
