/**
 * In-memory fixed-window rate limiter for the PI module.
 *
 * Scope: per server instance. Correct for a single-node internal beta. A
 * multi-node deployment would need a shared store (e.g. Redis) — documented here
 * so it's a conscious upgrade, not a silent gap. Keyed by client IP (+ a
 * discriminator such as email for login), it caps brute-force and abuse.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export interface RateResult {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
}

/** Fixed-window limiter. Returns whether this hit is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();

  // Opportunistic cleanup of expired buckets (cheap, bounds memory).
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }

  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;

  return {
    allowed: b.count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    remaining: Math.max(0, limit - b.count),
  };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}
