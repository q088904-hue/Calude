// GET  /api/stagecraft/config → return current interview config
// POST /api/stagecraft/config → merge and save partial config

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import {
  getConfig,
  saveConfig,
  type StagecraftConfig,
} from "@/lib/stagecraft/configStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getConfig();
  return Response.json(config);
}

export async function POST(request: NextRequest) {
  const gate = await requireStagecraftUser();
  if (gate instanceof Response) return gate;
  let body: Partial<StagecraftConfig>;
  try {
    body = (await request.json()) as Partial<StagecraftConfig>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const existing = await getConfig();

  // Allow explicit null/empty to clear a field
  const updated: StagecraftConfig = { ...existing, ...body };
  if (body.interviewDate === "") delete updated.interviewDate;
  if (body.interviewCompany === "") delete updated.interviewCompany;

  await saveConfig(updated);
  return Response.json(updated);
}
