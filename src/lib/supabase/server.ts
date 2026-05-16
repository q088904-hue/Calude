// Server-side Supabase client for Route Handlers + Server Components.
// Un-generified until `supabase gen types typescript --local` can run against a real project.
// Type safety lives in the explicit return types in subscriptions.ts.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServer() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Dev mock — no-op server client
    return new Proxy({} as ReturnType<typeof createServerClient>, {
      get: (_, prop) => {
        if (prop === "auth") {
          return {
            getUser: async () => ({ data: { user: { id: "dev-user-id" } }, error: null }),
          };
        }
        return () =>
          new Proxy({}, { get: () => () => Promise.resolve({ data: null, error: null }) });
      },
    });
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Read-only context (Server Components) — writes are no-ops
        }
      },
    },
  });
}
