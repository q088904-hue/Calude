// GET /api/stagecraft/export
// Full-fidelity data export (profile + config + all sessions incl. items).
// Doubles as a manual backup and as the restore input — independent of which
// persistence backend is active (reads through the store abstraction).

import { listSessions } from "@/lib/stagecraft/sessionStore";
import { getProfile } from "@/lib/stagecraft/profileStore";
import { getConfig } from "@/lib/stagecraft/configStore";
import type { Profile, SessionRecord } from "@/lib/stagecraft/types";
import type { StagecraftConfig } from "@/lib/stagecraft/configStore";
import { emit } from "@/lib/stagecraft/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface StagecraftExport {
  version: 1;
  exportedAt: string;
  profile: Profile;
  config: StagecraftConfig;
  sessions: SessionRecord[];
}

export async function GET() {
  // Parallel reads — independent sources, no waterfall.
  const [profile, config, sessions] = await Promise.all([
    getProfile(),
    getConfig(),
    listSessions(),
  ]);

  const payload: StagecraftExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    config,
    sessions,
  };

  await emit("export", { sessions: payload.sessions.length });

  const filename = `stagecraft-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
