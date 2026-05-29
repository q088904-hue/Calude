/**
 * Session config + helpers for the PI internal access gate.
 *
 * Lightweight by design (beta): a Datamatics email-domain check + optional
 * shared access code, sealed in an HMAC-signed cookie. No external IdP, no RBAC.
 * Swappable for Supabase/Entra SSO later without changing call sites.
 */

import { cookies } from "next/headers";
import { verifyToken, type SessionPayload } from "./token";

export const PI_COOKIE = "pi_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

export function sessionSecret(): string {
  return process.env.PI_SESSION_SECRET || "pi-dev-insecure-secret-change-me";
}

export function allowedDomain(): string {
  return (process.env.PI_ALLOWED_DOMAIN || "datamatics.com").toLowerCase();
}

/** Optional shared beta code. Empty → not required (domain is the gate). */
export function requiredAccessCode(): string {
  return process.env.PI_ACCESS_CODE || "";
}

export function isDatamaticsEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+$/.test(e) && e.endsWith("@" + allowedDomain());
}

/** Read + verify the current session from the request cookies (route handlers). */
export async function getSessionUser(): Promise<{ email: string } | null> {
  const store = await cookies();
  const token = store.get(PI_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token, sessionSecret());
  return payload ? { email: payload.email } : null;
}

export function buildPayload(email: string): SessionPayload {
  const now = Date.now();
  return { email: email.trim().toLowerCase(), iat: now, exp: now + SESSION_TTL_MS };
}
