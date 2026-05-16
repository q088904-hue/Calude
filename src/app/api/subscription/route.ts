// GET  /api/subscription     → current user's subscription + trial state
// POST /api/subscription     → start 7-day free trial (action: "start_trial")

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  hasUsedTrial,
  createTrialSubscription,
  getAuthUserId,
} from "@/lib/supabase/subscriptions";
import { effectiveTier } from "@/lib/entitlements/resolve";

// ── GET — fetch subscription state ────────────────────────────────────────────

export async function GET() {
  const supabase = await getSupabaseServer();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    // Not logged in — return free plan, no error
    return NextResponse.json(
      { subscription: buildFreeResponse() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const sub = await getActiveSubscription(userId);
  const tier = effectiveTier(sub);

  const isTrialing = sub?.status === "trialing";
  const trialDaysLeft =
    isTrialing && sub?.trial_ends_at
      ? Math.max(
          0,
          Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000)
        )
      : null;

  return NextResponse.json(
    {
      subscription: {
        id: sub?.id ?? null,
        tier,
        status: sub?.status ?? "free",
        isTrialing,
        trialDaysLeft,
        trialEndsAt: sub?.trial_ends_at ?? null,
        currentPeriodEnd: sub?.current_period_end ?? null,
        cancelledAt: sub?.cancelled_at ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// ── POST — start trial ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "start_trial") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Lifetime one-trial-per-user enforcement
  const alreadyUsed = await hasUsedTrial(userId);
  if (alreadyUsed) {
    return NextResponse.json(
      { error: "Trial already used. Subscribe to continue with Pro." },
      { status: 409 }
    );
  }

  const sub = await createTrialSubscription(userId);
  if (!sub) {
    // createTrialSubscription returns null on duplicate (race condition) or DB error
    return NextResponse.json(
      { error: "Could not start trial. You may have already used it." },
      { status: 409 }
    );
  }

  const trialDaysLeft = Math.max(
    0,
    Math.ceil((new Date(sub.trial_ends_at!).getTime() - Date.now()) / 86_400_000)
  );

  return NextResponse.json({
    ok: true,
    trialEndsAt: sub.trial_ends_at,
    trialDaysLeft,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFreeResponse() {
  return {
    id: null,
    tier: "free",
    status: "free",
    isTrialing: false,
    trialDaysLeft: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelledAt: null,
  };
}
