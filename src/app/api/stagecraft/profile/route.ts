// /api/stagecraft/profile
// GET  → return the active profile (file-based or hardcoded default)
// POST → save edits to .stagecraft/profile.json

import { NextRequest } from "next/server";
import { requireStagecraftUser } from "@/lib/stagecraft/auth";
import { getProfile, saveProfile } from "@/lib/stagecraft/profileStore";
import { profile as defaultProfile } from "@/lib/stagecraft/profile";
import type { Profile } from "@/lib/stagecraft/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const p = await getProfile();
  return Response.json(p);
}

export async function POST(request: NextRequest) {
  const gate = await requireStagecraftUser();
  if (gate instanceof Response) return gate;
  let body: Partial<Profile> & { action?: string };
  try {
    body = (await request.json()) as Partial<Profile> & { action?: string };
  } catch (err) {
    return Response.json(
      { error: "Invalid JSON body.", detail: String(err) },
      { status: 400 },
    );
  }

  if (body.action === "reset") {
    // Delete the override file — next read falls back to profile.ts
    try {
      const { promises: fs } = await import("node:fs");
      const path = await import("node:path");
      const file = path.join(process.cwd(), ".stagecraft", "profile.json");
      await fs.unlink(file);
    } catch {
      /* already absent */
    }
    return Response.json(defaultProfile);
  }

  // Merge over the CURRENT profile so partial saves preserve prior edits.
  // (getProfile returns the saved file when present, else the hardcoded
  // default — so the first save still seeds correctly.) Merging over
  // defaultProfile would silently reset every field absent from the body.
  const current = await getProfile();
  const merged: Profile = { ...current, ...body } as Profile;
  await saveProfile(merged);
  return Response.json(merged);
}
