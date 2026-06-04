// GET /api/stagecraft/auth/callback?code=...&next=/stagecraft
// Magic-link landing: exchange the code for a session, enforce the allowlist
// server-side, run the one-time sentinel claim, then redirect into the app.
// Public (listed in proxy.isStagecraftPublic).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/stagecraft/authShared";
import { claimSentinelRows } from "@/lib/stagecraft/claimSentinel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only allow same-app relative redirects under /stagecraft. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/stagecraft") ? next : "/stagecraft";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const loginUrl = new URL("/stagecraft/login", request.url);

  if (!code) {
    loginUrl.searchParams.set("error", "missing-code");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    loginUrl.searchParams.set("error", "exchange-failed");
    return NextResponse.redirect(loginUrl);
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !isAllowed(user.email)) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "not-allowed");
    return NextResponse.redirect(loginUrl);
  }

  // One-time, idempotent claim of the 3.1 sentinel rows to this user.
  try {
    await claimSentinelRows(user.id, user.email as string);
  } catch {
    // Non-fatal for login; the claim is idempotent and can be re-run.
  }

  return NextResponse.redirect(new URL(next, request.url));
}
