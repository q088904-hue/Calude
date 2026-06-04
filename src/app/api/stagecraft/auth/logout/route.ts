// GET /api/stagecraft/auth/logout — sign out + redirect to login. Public.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServer();
  try {
    await supabase.auth.signOut();
  } catch {
    /* already signed out / no session */
  }
  return NextResponse.redirect(new URL("/stagecraft/login", request.url));
}
