// POST /api/webhooks/razorpay
// Processes Razorpay subscription lifecycle events end-to-end.
//
// Security:   HMAC-SHA256 signature verification — reject before any processing.
// Idempotency: provider_event_id unique index — duplicate events are silently skipped.
// Audit:       Every event stored in payment_events regardless of handling.
// Reliability: Returns 200 on known-unhandled events so Razorpay doesn't retry forever.

import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider, STATE_TRANSITIONS, RazorpayEventName } from "@/lib/payments/razorpay";
import {
  isEventProcessed,
  storePaymentEvent,
  getSubscriptionByProviderId,
  applyStateTransition,
} from "@/lib/supabase/subscriptions";

// Razorpay sends the full subscription entity in these events — extract period dates
function extractPeriodDates(subEntity: Record<string, unknown>) {
  const start = subEntity.current_start as number | null | undefined;
  const end = subEntity.current_end as number | null | undefined;
  return {
    periodStart: start ? new Date(start * 1000) : undefined,
    periodEnd: end ? new Date(end * 1000) : undefined,
  };
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("x-razorpay-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const provider = getPaymentProvider();

  // ── 1. Verify signature ────────────────────────────────────────────────────
  if (!provider.verifyWebhookSignature(rawBody, sig)) {
    console.error("[webhook/razorpay] signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── 2. Parse event ─────────────────────────────────────────────────────────
  let event;
  try {
    event = provider.parseWebhookEvent(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const eventName = event.event as RazorpayEventName;

  // Extract the subscription entity (present on most events)
  const subEntity =
    (event.payload?.subscription?.entity as Record<string, unknown>) ?? null;
  const providerSubId = subEntity?.id as string | undefined;

  // Extract a stable event ID for idempotency
  // Razorpay doesn't send a dedicated event_id on all events, so we compose one.
  const providerEventId = providerSubId
    ? `${eventName}::${providerSubId}::${subEntity?.updated_at ?? Date.now()}`
    : null;

  // ── 3. Idempotency check ───────────────────────────────────────────────────
  if (providerEventId && (await isEventProcessed(providerEventId))) {
    return NextResponse.json({ ok: true, note: "duplicate" });
  }

  // ── 4. Find our subscription record ───────────────────────────────────────
  let internalSubId: string | undefined;
  if (providerSubId) {
    const sub = await getSubscriptionByProviderId(providerSubId);
    internalSubId = sub?.id;
  }

  // ── 5. Store audit event ───────────────────────────────────────────────────
  await storePaymentEvent({
    subscriptionId: internalSubId,
    provider: "razorpay",
    eventType: eventName,
    providerEventId: providerEventId ?? undefined,
    rawPayload: event.payload as Record<string, unknown>,
  });

  // ── 6. Apply state transition ──────────────────────────────────────────────
  const transition = STATE_TRANSITIONS[eventName];
  if (!transition) {
    // Known unhandled event type — ack so Razorpay stops retrying
    return NextResponse.json({ ok: true, note: `unhandled: ${eventName}` });
  }

  if (!providerSubId) {
    return NextResponse.json({ ok: true, note: "no subscription entity in payload" });
  }

  const { periodStart, periodEnd } = extractPeriodDates(subEntity ?? {});

  await applyStateTransition({
    providerSubscriptionId: providerSubId,
    newStatus: transition.newStatus,
    extendPeriod: transition.extendPeriod,
    gracePeriodHours: transition.gracePeriodHours,
    periodStart,
    periodEnd,
  });

  // ── 7. Side effects ────────────────────────────────────────────────────────
  // These are best-effort — failures don't affect the 200 response
  // (we've already committed the state transition).
  void triggerSideEffects(eventName, internalSubId);

  console.log(
    `[webhook/razorpay] ${eventName} → ${transition.newStatus}`,
    providerSubId
  );
  return NextResponse.json({ ok: true });
}

async function triggerSideEffects(
  eventName: RazorpayEventName,
  subscriptionId?: string
): Promise<void> {
  if (!subscriptionId) return;

  switch (eventName) {
    case "subscription.activated":
      // TODO(notifications): Send "Pro activated" push notification + audio cue
      break;
    case "payment.failed":
      // TODO(notifications): Send "Payment failed — update in 3 days" SMS + banner
      break;
    case "subscription.halted":
    case "subscription.cancelled":
      // TODO(notifications): Send "Subscription ended" notification
      break;
    default:
      break;
  }
}

// Next.js App Router: disable body parsing so we read the raw body for HMAC verification
export const dynamic = "force-dynamic";
