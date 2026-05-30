import { NextResponse } from "next/server";
import { signToken } from "@/lib/pi/auth/token";
import {
  PI_COOKIE,
  SESSION_TTL_MS,
  buildPayload,
  isDatamaticsEmail,
  requiredAccessCode,
  sessionSecret,
  allowedDomain,
} from "@/lib/pi/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (typeof email !== "string" || !isDatamaticsEmail(email)) {
      return NextResponse.json(
        { error: `Use your @${allowedDomain()} email address.` },
        { status: 403 }
      );
    }
    const need = requiredAccessCode();
    if (need && code !== need) {
      return NextResponse.json({ error: "Invalid beta access code." }, { status: 403 });
    }

    let secret: string;
    try {
      secret = sessionSecret(); // throws in production if unset/default → fail closed
    } catch {
      return NextResponse.json(
        { error: "Sign-in is not available: server authentication is not configured." },
        { status: 503 }
      );
    }
    const token = await signToken(buildPayload(email), secret);
    const res = NextResponse.json({ ok: true, email: email.trim().toLowerCase() });
    res.cookies.set(PI_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
