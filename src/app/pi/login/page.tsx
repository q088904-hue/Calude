"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const RED = "#C00D0D";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/pi/govern";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pi/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sign-in failed.");
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-[var(--background)] text-[var(--foreground)] px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>
          Presentation Intelligence
        </p>
        <h1 className="text-2xl font-bold mt-1 mb-1">Internal sign-in</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Datamatics employees only. Use your company email.
        </p>

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Work email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@datamatics.com"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-sm mb-4"
        />

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Beta access code (if provided)</label>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="optional"
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-sm mb-5"
        />

        {error && (
          <p className="text-sm mb-4 rounded-lg px-3 py-2" style={{ background: "rgba(192,13,13,0.08)", color: RED }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
          style={{ background: RED }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function PiLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
