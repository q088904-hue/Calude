import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/pi/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ email: user.email });
}
