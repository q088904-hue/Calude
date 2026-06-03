// GET /api/stagecraft/state
// Lightweight signals for onboarding: first-run detection + the counts the
// onboarding progress indicator needs. Read-only; server-derived.

import { getProfile, profileFileExists } from "@/lib/stagecraft/profileStore";
import { listSessions } from "@/lib/stagecraft/sessionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [hasProfileFile, sessions, profile] = await Promise.all([
    profileFileExists(),
    listSessions(),
    getProfile(),
  ]);

  // A STAR story counts only when it has real content (not an empty stub).
  const starStoryCount = (profile.starStories ?? []).filter(
    (s) => s && (s.situation?.trim() || s.action?.trim() || s.result?.trim()),
  ).length;

  return Response.json({
    hasProfileFile,
    sessionCount: sessions.length,
    isFirstRun: !hasProfileFile && sessions.length === 0,
    realNumbersCount: (profile.realNumbers ?? []).filter((n) => n.trim())
      .length,
    starStoryCount,
  });
}
