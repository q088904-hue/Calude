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
import { rateLimit, clientIp } from "@/lib/pi/ratelimit";

export const runtime = "nodejs";

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many sign-in attempts. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    // Per-IP cap (blunts code-guessing across many emails): 10 / minute.
    const ipLimit = rateLimit(`login:ip:${ip}`, 10, 60_000);
    if (!ipLimit.allowed) return tooMany(ipLimit.retryAfterSec);

    const { email, code } = await req.json();
    if (typeof email !== "string" || !isDatamaticsEmail(email)) {
      return NextResponse.json(
        { error: `Use your @${allowedDomain()} email address.` },
        { status: 403 }
      );
    }
    // Per-IP+email cap (blunts code brute-force for one account): 5 / minute.
    const userLimit = rateLimit(`login:user:${ip}:${email.toLowerCase()}`, 5, 60_000);
    if (!userLimit.allowed) return tooMany(userLimit.retryAfterSec);

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
