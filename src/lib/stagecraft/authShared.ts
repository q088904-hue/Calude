// Edge-safe Stagecraft auth primitives — NO next/headers or server imports, so
// this is importable from src/proxy.ts (edge runtime) as well as route handlers.

export interface StagecraftUser {
  id: string;
  email: string;
}

/** D1 — single permitted account. Lowercase comparison. */
export const STAGECRAFT_ALLOWLIST = ["jsviju@gmail.com"];

/** Stable synthetic id for the dev-bypass user (never used in production). */
export const DEV_USER_ID = "00000000-0000-0000-0000-0000000000d5";

export function isAllowed(email?: string | null): boolean {
  return !!email && STAGECRAFT_ALLOWLIST.includes(email.toLowerCase());
}

/**
 * Dev-only auth bypass. Fail-closed: hard-gated on NODE_ENV so the bypass can
 * NEVER authenticate in production even if STAGECRAFT_DEV_AUTH leaks into the env.
 */
export function devAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.STAGECRAFT_DEV_AUTH === "1"
  );
}
