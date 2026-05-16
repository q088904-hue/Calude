// POST /api/checkout        — create Razorpay subscription, return client credentials
// POST /api/checkout/verify — verify payment signature after checkout.js fires

import { NextRequest, NextResponse } from "next/server";
import { CheckoutArgsSchema, PRICES_INR } from "@/lib/payments/types";
import { getPaymentProvider } from "@/lib/payments/razorpay";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAuthUserId,
  getActiveSubscription,
  activateSubscription,
} from "@/lib/supabase/subscriptions";
import { z } from "zod";

// ── POST /api/checkout ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let args;
  try {
    const body = await req.json();
    args = CheckoutArgsSchema.parse({ ...body, userId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 }
    );
  }

  // Prevent double-subscription for already-active users
  const existing = await getActiveSubscription(userId);
  if (existing?.status === "active") {
    return NextResponse.json(
      { error: "Already subscribed. Manage your plan in Settings." },
      { status: 409 }
    );
  }

  // Pull user profile for Razorpay prefill
  const { data: profile } = await supabase
    .from("users" as never) // 'users' table from Phase 1 migration
    .select("name, phone")
    .eq("id", userId)
    .maybeSingle();

  const provider = getPaymentProvider();
  const result = await provider.createSubscription(args);

  return NextResponse.json({
    subscriptionId: result.subscriptionId,
    keyId: result.keyId,
    amount: result.amount,
    currency: result.currency,
    prefill: {
      name: (profile as { name?: string } | null)?.name ?? "",
      contact: (profile as { phone?: string } | null)?.phone ?? "",
    },
  });
}

// ── POST /api/checkout/verify — payment signature verification ────────────────
// Called by the client-side Razorpay checkout.js handler after payment succeeds.
// We verify the signature server-side before trusting any payment data.

const VerifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_subscription_id: z.string(),
  razorpay_signature: z.string(),
  tier: z.enum(["pro", "fleet", "fleet_plus"]),
  interval: z.enum(["monthly", "yearly"]),
});

export async function PUT(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = VerifySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const isValid = provider.verifyPaymentSignature({
    orderId: body.razorpay_subscription_id,
    paymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });

  if (!isValid) {
    console.error("[checkout/verify] signature mismatch for user:", userId);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Activate subscription in DB
  const amountInr =
    PRICES_INR[body.tier as keyof typeof PRICES_INR]?.[body.interval] ?? 0;

  const now = new Date();
  const periodEnd = new Date(
    now.getTime() +
      (body.interval === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000
  );

  const sub = await activateSubscription({
    userId,
    tier: body.tier,
    interval: body.interval,
    providerSubscriptionId: body.razorpay_subscription_id,
    amountInr,
    periodStart: now,
    periodEnd,
  });

  if (!sub) {
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tier: sub.tier, status: sub.status });
}
