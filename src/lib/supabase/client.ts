"use client";

// Browser-side Supabase client (un-generified until supabase gen types runs)
// Type safety is provided by explicit return types in the DB layer (subscriptions.ts).

import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Dev without keys — return no-op proxy so app runs without Supabase
    _client = new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get: () => () =>
        new Proxy({}, { get: () => () => Promise.resolve({ data: null, error: null }) }),
    });
    return _client;
  }

  _client = createBrowserClient(url, anonKey);
  return _client;
}
