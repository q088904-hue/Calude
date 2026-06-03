// /api/stagecraft/secrets
// GET    → { ANTHROPIC_API_KEY: boolean, OPENAI_API_KEY: boolean }  (status only)
// POST   → { name, value } sets a key (server-side); returns status booleans
// DELETE → ?name=... clears a key; returns status booleans
// The key VALUE is never returned to the client.

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import {
  getSecretStatus,
  setSecret,
  clearSecret,
  isServerless,
  type SecretName,
} from "@/lib/stagecraft/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"] as const;
const isName = (s: unknown): s is SecretName =>
  VALID.includes(s as SecretName);

// On serverless, secrets.json is ephemeral — writes would silently not persist.
const SERVERLESS_MSG =
  "Keys are managed via the server environment on this deployment. Set ANTHROPIC_API_KEY / OPENAI_API_KEY in your hosting env.";

/** Status booleans + whether this deployment can persist a pasted key. */
async function statusPayload() {
  return { ...(await getSecretStatus()), writable: !isServerless() };
}

export async function GET() {
  return Response.json(await statusPayload());
}

export async function POST(request: NextRequest) {
  const gate = await requireStagecraftUser();
  if (gate instanceof Response) return gate;
  if (isServerless()) {
    return Response.json({ error: SERVERLESS_MSG }, { status: 409 });
  }
  let body: { name?: unknown; value?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; value?: unknown };
  } catch (e) {
    return Response.json(
      { error: "Invalid JSON", detail: String(e) },
      { status: 400 },
    );
  }
  if (!isName(body.name) || typeof body.value !== "string" || !body.value.trim()) {
    return Response.json(
      { error: "name must be a valid key id and value a non-empty string" },
      { status: 400 },
    );
  }
  await setSecret(body.name, body.value);
  return Response.json(await statusPayload());
}

export async function DELETE(request: NextRequest) {
  const gate = await requireStagecraftUser();
  if (gate instanceof Response) return gate;
  if (isServerless()) {
    return Response.json({ error: SERVERLESS_MSG }, { status: 409 });
  }
  const name = new URL(request.url).searchParams.get("name");
  if (!isName(name)) {
    return Response.json({ error: "invalid name" }, { status: 400 });
  }
  await clearSecret(name);
  return Response.json(await statusPayload());
}
