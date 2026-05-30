/**
 * Edge proxy (Next 16; replaces the deprecated "middleware" convention) —
 * internal access gate for the Presentation Intelligence module. Protects
 * /pi/* and /api/pi/* behind a signed Datamatics-only session. Everything
 * outside PI is untouched.
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, resolveSessionSecret } from "@/lib/pi/auth/token";

const PI_COOKIE = "pi_session";

// Paths that must remain reachable without a session.
function isPublic(path: string): boolean {
  return (
    path === "/pi/login" ||
    path.startsWith("/api/pi/auth/login") ||
    path.startsWith("/api/pi/auth/logout")
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Fail closed: if the secret is misconfigured in production, resolveSessionSecret
  // throws → user stays null → access is denied (never verify with a default key).
  let user = null;
  try {
    const token = req.cookies.get(PI_COOKIE)?.value;
    user = token ? await verifyToken(token, resolveSessionSecret()) : null;
  } catch {
    user = null;
  }
  if (user) return NextResponse.next();

  // API → 401 JSON; pages → redirect to login with return path.
  if (pathname.startsWith("/api/pi")) {
    return NextResponse.json(
      { error: "Authentication required. Sign in with your Datamatics account." },
      { status: 401 }
    );
  }
  const loginUrl = new URL("/pi/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/pi/:path*", "/api/pi/:path*"],
};
