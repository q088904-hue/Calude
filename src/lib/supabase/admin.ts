// Admin Supabase client — service role, bypasses RLS.
// ONLY used server-side in webhook handlers and scheduled jobs.
// NEVER expose this client or the service role key to the browser.

import { createClient } from "@supabase/supabase-js";

let _admin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn(
      "[supabase/admin] Keys not set — using mock. Webhooks will NOT persist in dev."
    );
    _admin = new Proxy({} as ReturnType<typeof createClient>, {
      get: (_, prop) => {
        if (prop === "from") {
          return () =>
            new Proxy(
              {},
              {
                get: () => () =>
                  Promise.resolve({ data: null, error: null, count: 0 }),
              }
            );
        }
        return () => Promise.resolve({ data: null, error: null });
      },
    });
    return _admin;
  }

  _admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}
