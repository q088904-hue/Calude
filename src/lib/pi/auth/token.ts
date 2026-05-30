/**
 * Lightweight HMAC-signed session token. Uses Web Crypto so it runs in BOTH
 * the edge middleware and Node route handlers. Not a full JWT — just a signed,
 * expiring payload sufficient for an internal Datamatics-only beta gate.
 */

export interface SessionPayload {
  email: string;
  iat: number;
  exp: number;
}

/** The dev-only fallback secret. Using this in production is a hard error. */
export const DEV_SESSION_SECRET = "pi-dev-insecure-secret-change-me";

/**
 * Resolve the session-signing secret, FAILING CLOSED in production.
 *
 * In production, an unset or default secret means anyone could forge a session
 * cookie (full auth bypass). Rather than silently run with a public key, we
 * throw — callers translate this into a denied request / 503, locking the gate
 * until `PI_SESSION_SECRET` is set to a real value. Edge-safe (no Node imports).
 */
export function resolveSessionSecret(): string {
  const s = process.env.PI_SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!s || s === DEV_SESSION_SECRET)) {
    throw new Error(
      "PI_SESSION_SECRET must be set to a secure, non-default value in production — refusing to sign/verify sessions with a publicly known key."
    );
  }
  return s || DEV_SESSION_SECRET;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Copy bytes into a fresh ArrayBuffer (Web Crypto wants ArrayBuffer-backed views). */
function ab(bytes: Uint8Array | string): ArrayBuffer {
  const u = typeof bytes === "string" ? enc.encode(bytes) : bytes;
  const buf = new ArrayBuffer(u.byteLength);
  new Uint8Array(buf).set(u);
  return buf;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ab(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(payload: SessionPayload, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, ab(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<SessionPayload | null> {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify("HMAC", key, ab(fromB64url(sig)), ab(body));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(fromB64url(body))) as SessionPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
