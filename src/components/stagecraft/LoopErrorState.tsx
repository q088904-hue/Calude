"use client";

import Link from "next/link";

export type LoopErrorCode =
  | "NO_API_KEY"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "UNKNOWN";

export interface LoopError {
  code: LoopErrorCode;
  message?: string;
}

/**
 * Graceful failure card for the practice loop. Distinguishes a config problem
 * (no API key → actionable "Connect AI") from a transient problem (retry).
 * Where a deterministic suggested answer exists, the caller still reveals it
 * so the user gets value even when AI coaching is offline.
 */
export function LoopErrorState({
  error,
  onRetry,
}: {
  error: LoopError;
  onRetry?: () => void;
}) {
  const isConfig = error.code === "NO_API_KEY";
  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 space-y-2">
      <p className="text-sm text-sc-ink">
        {isConfig ? "AI coaching isn’t connected yet." : "Grading hit a snag."}
      </p>
      <p className="font-mono text-xs text-sc-muted leading-relaxed">
        {error.message ??
          (isConfig
            ? "Add an API key to enable live coaching."
            : "This is usually temporary — try again in a moment.")}
      </p>
      <div className="flex items-center gap-2 pt-1">
        {isConfig ? (
          <Link
            href="/stagecraft/profile#ai-connection"
            className="rounded-sc border border-sc-gold-dim bg-sc-gold-bg px-3 py-2 text-xs font-mono text-sc-gold hover:bg-sc-gold/20 transition-colors min-h-[36px] inline-flex items-center"
          >
            Connect AI →
          </Link>
        ) : (
          onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-sc border border-sc-gold-dim bg-sc-gold-bg px-3 py-2 text-xs font-mono text-sc-gold hover:bg-sc-gold/20 transition-colors min-h-[36px] inline-flex items-center"
            >
              Retry
            </button>
          )
        )}
      </div>
    </div>
  );
}
