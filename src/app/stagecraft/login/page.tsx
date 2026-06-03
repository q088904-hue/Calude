"use client";

// Stagecraft sign-in — passwordless magic link via Supabase. Public route
// (proxy allows /stagecraft/login). Single-user allowlist; non-listed emails are
// pre-rejected here for UX and enforced again server-side at the callback.

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isAllowed } from "@/lib/stagecraft/authShared";

const ERROR_COPY: Record<string, string> = {
  "not-allowed": "That account isn't permitted. Use the allowlisted address.",
  "exchange-failed": "That sign-in link expired or was already used. Request a new one.",
  "missing-code": "Sign-in link was incomplete. Request a new one.",
};

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/stagecraft";
  const initialError = params.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    initialError ? (ERROR_COPY[initialError] ?? "Sign-in failed. Try again.") : null,
  );

  const send = useCallback(async () => {
    const addr = email.trim().toLowerCase();
    if (!addr) return;
    if (!isAllowed(addr)) {
      setError("That account isn't permitted.");
      return;
    }
    setError(null);
    setStatus("sending");
    const redirect = `${window.location.origin}/api/stagecraft/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: otpError } = await getSupabaseBrowser().auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: redirect },
    });
    if (otpError) {
      setError(otpError.message);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }, [email, next]);

  return (
    <main className="min-h-screen bg-sc-bg flex items-center justify-center px-6">
      <section
        aria-labelledby="sc-login-heading"
        className="w-full max-w-sm rounded-sc-lg border border-sc-border bg-sc-surface shadow-sc-md p-8 space-y-5"
      >
        <div className="space-y-1">
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase">
            Stagecraft
          </p>
          <h1 id="sc-login-heading" className="text-headline text-sc-ink">
            Sign in
          </h1>
          <p className="text-sm text-sc-muted leading-relaxed">
            Enter your email and we&apos;ll send a magic link — no password.
          </p>
        </div>

        {status === "sent" ? (
          <div
            role="status"
            className="rounded-sc border border-sc-gold-dim bg-sc-gold-bg px-4 py-3 text-sm text-sc-ink"
          >
            Check <span className="font-medium">{email.trim().toLowerCase()}</span> for
            your sign-in link.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="space-y-3"
          >
            <label htmlFor="sc-login-email" className="sr-only">
              Email address
            </label>
            <input
              id="sc-login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-sc border border-sc-border bg-sc-bg px-3 py-2.5 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors"
            />
            {error && (
              <p role="alert" className="text-xs text-sc-red leading-relaxed">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending" || !email.trim()}
              className="w-full rounded-sc border border-sc-gold-dim bg-sc-gold-bg px-3 py-2.5 text-sm font-mono text-sc-gold hover:bg-sc-gold/20 transition-colors disabled:opacity-40 min-h-[44px]"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function StagecraftLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
