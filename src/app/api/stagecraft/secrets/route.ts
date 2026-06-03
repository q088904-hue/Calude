// /api/stagecraft/secrets
// GET    → { ANTHROPIC_API_KEY: boolean, OPENAI_API_KEY: boolean }  (status only)
// POST   → { name, value } sets a key (server-side); returns status booleans
// DELETE → ?name=... clears a key; returns status booleans
// The key VALUE is never returned to the client.

import { NextRequest } from "next/server";
import {
  getSecretStatus,
  setSecret,
  clearSecret,
  type SecretName,
} from "@/lib/stagecraft/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"] as const;
const isName = (s: unknown): s is SecretName =>
  VALID.includes(s as SecretName);

export async function GET() {
  return Response.json(await getSecretStatus());
}

export async function POST(request: NextRequest) {
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
  return Response.json(await getSecretStatus());
}

export async function DELETE(request: NextRequest) {
  const name = new URL(request.url).searchParams.get("name");
  if (!isName(name)) {
    return Response.json({ error: "invalid name" }, { status: 400 });
  }
  await clearSecret(name);
  return Response.json(await getSecretStatus());
}
