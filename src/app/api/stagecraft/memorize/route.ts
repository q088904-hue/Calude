// /api/stagecraft/memorize
// GET                       -> list all
// POST { action: "add", ... }   -> add an entry (returns the created record)
// POST { action: "remove", id } -> delete by id
// POST { action: "bump", id }   -> increment review counter

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import {
  listMemorized,
  addMemorized,
  removeMemorized,
  bumpReview,
} from "@/lib/stagecraft/memorizeStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const all = await listMemorized();
  return Response.json(all);
}

type AddBody = {
  action: "add";
  question: string;
  answer: string;
  sourceSessionId: string;
  sourceQuestionIndex: number;
};
type RemoveBody = { action: "remove"; id: string };
type BumpBody = { action: "bump"; id: string };
type Body = AddBody | RemoveBody | BumpBody;

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

  if (body.action === "add") {
    if (!body.question || !body.answer) {
      return Response.json(
        { error: "Missing 'question' or 'answer'." },
        { status: 400 },
      );
    }
    const created = await addMemorized({
      question: body.question,
      answer: body.answer,
      sourceSessionId: body.sourceSessionId,
      sourceQuestionIndex: body.sourceQuestionIndex,
    });
    return Response.json(created);
  }

  if (body.action === "remove") {
    const ok = await removeMemorized(body.id);
    if (!ok) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  }

  if (body.action === "bump") {
    const updated = await bumpReview(body.id);
    if (!updated) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    return Response.json(updated);
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}
