import { NextResponse } from "next/server";
import { PI_COOKIE } from "@/lib/pi/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PI_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
