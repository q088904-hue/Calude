// /api/stagecraft/session
// GET           -> list all sessions
// GET ?id=...   -> fetch a single session
// POST          -> create | appendItem | setReport (envelope)

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import {
  listSessions,
  getSession,
  upsertSession,
  appendItem,
  setReport,
} from "@/lib/stagecraft/sessionStore";
import type { SessionConfig, QAItem } from "@/lib/stagecraft/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const session = await getSession(id);
    if (!session) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    return Response.json(session);
  }
  const all = await listSessions();
  return Response.json(all);
}

type CreateBody = {
  action: "create";
  id: string;
  config: SessionConfig;
  warmUp?: { transcript: string };
};

type AppendBody = {
  action: "appendItem";
  id: string;
  item: QAItem;
};

type ReportBody = {
  action: "setReport";
  id: string;
  report: string;
};

type Body = CreateBody | AppendBody | ReportBody;

export async function POST(request: NextRequest) {
  const gate = await requireStagecraftUser();
  if (gate instanceof Response) return gate;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch (err) {
    return Response.json(
      { error: "Invalid JSON body.", detail: String(err) },
      { status: 400 },
    );
  }

  if (body.action === "create") {
    const now = new Date().toISOString();
    await upsertSession({
      id: body.id,
      config: body.config,
      warmUp: body.warmUp
        ? { transcript: body.warmUp.transcript, createdAt: now }
        : undefined,
      items: [],
      startedAt: now,
    });
    return Response.json({ ok: true });
  }

  if (body.action === "appendItem") {
    const updated = await appendItem(body.id, body.item);
    if (!updated) {
      return Response.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true });
  }

  if (body.action === "setReport") {
    const updated = await setReport(body.id, body.report);
    if (!updated) {
      return Response.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}
