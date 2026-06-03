/**
 * Edge proxy (Next 16; replaces the deprecated "middleware" convention).
 * Two INDEPENDENT access gates share this single proxy:
 *   • Presentation Intelligence — /pi/* + /api/pi/* behind a signed Datamatics
 *     `pi_session` cookie (unchanged).
 *   • Stagecraft (Initiative 3.2) — /stagecraft/* + /api/stagecraft/* behind a
 *     Supabase magic-link session, single-user allowlist, with a dev bypass.
 * Everything outside these prefixes is untouched.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyToken, resolveSessionSecret } from "@/lib/pi/auth/token";
import { devAuthEnabled, isAllowed } from "@/lib/stagecraft/authShared";

const PI_COOKIE = "pi_session";

// ── PI gate (unchanged) ──────────────────────────────────────────────────────
function isPiPublic(path: string): boolean {
  return (
    path === "/pi/login" ||
    path.startsWith("/api/pi/auth/login") ||
    path.startsWith("/api/pi/auth/logout")
  );
}

async function gatePi(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (isPiPublic(pathname)) return NextResponse.next();
  let user = null;
  try {
    const token = req.cookies.get(PI_COOKIE)?.value;
    user = token ? await verifyToken(token, resolveSessionSecret()) : null;
  } catch {
    user = null;
  }
  if (user) return NextResponse.next();
  if (pathname.startsWith("/api/pi")) {
    return NextResponse.json(
      { error: "Authentication required. Sign in with your Datamatics account." },
      { status: 401 },
    );
  }
  const loginUrl = new URL("/pi/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

// ── Stagecraft gate (3.2) ────────────────────────────────────────────────────
function isStagecraftPublic(path: string): boolean {
  return (
    path === "/stagecraft/login" ||
    path.startsWith("/api/stagecraft/auth/")
  );
}

async function gateStagecraft(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (isStagecraftPublic(pathname)) return NextResponse.next();

  // Dev bypass (fail-closed in production via NODE_ENV inside devAuthEnabled()).
  if (devAuthEnabled()) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Response carries any refreshed auth cookies back to the browser.
  const res = NextResponse.next();
  let email: string | null = null;
  if (url && anonKey) {
    try {
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) =>
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options),
            ),
        },
      });
      const { data } = await supabase.auth.getUser();
      email = data.user?.email ?? null;
    } catch {
      email = null;
    }
  }

  if (isAllowed(email)) return res;

  if (pathname.startsWith("/api/stagecraft")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const loginUrl = new URL("/stagecraft/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (pathname === "/stagecraft" || pathname.startsWith("/stagecraft/") ||
      pathname.startsWith("/api/stagecraft")) {
    return gateStagecraft(req);
  }
  return gatePi(req);
}

export const config = {
  matcher: [
    "/pi/:path*",
    "/api/pi/:path*",
    "/stagecraft",
    "/stagecraft/:path*",
    "/api/stagecraft/:path*",
  ],
};
