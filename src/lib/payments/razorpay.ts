// Razorpay payment provider — primary for Indian fishermen market
// UPI AutoPay, regional bank support, RBI e-mandate compliant
// Fallback: StripeProvider (see stripe.ts) for international / enterprise

import Razorpay from "razorpay";
import crypto from "crypto";
import {
  PaymentProvider,
  CheckoutArgs,
  WebhookEvent,
  WebhookEventSchema,
  PRICES_INR,
} from "./types";

// Razorpay plan IDs — create these in the Razorpay dashboard and set in env
// Format: plan_xxxxxxxxxxxxxxxx
const PLAN_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY ?? "",
    yearly: process.env.RAZORPAY_PLAN_PRO_YEARLY ?? "",
  },
  fleet: {
    monthly: process.env.RAZORPAY_PLAN_FLEET_MONTHLY ?? "",
    yearly: process.env.RAZORPAY_PLAN_FLEET_YEARLY ?? "",
  },
  fleet_plus: {
    monthly: process.env.RAZORPAY_PLAN_FLEET_PLUS_MONTHLY ?? "",
    yearly: process.env.RAZORPAY_PLAN_FLEET_PLUS_YEARLY ?? "",
  },
};

function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // In dev without keys → return a mock that returns deterministic data
    // so the UI and flow work end-to-end without real payment
    return new Proxy({} as Razorpay, {
      get: () => async () => ({ id: "sub_mock_" + Date.now(), status: "created" }),
    });
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export class RazorpayProvider implements PaymentProvider {
  private client: Razorpay;

  constructor() {
    this.client = getRazorpayClient();
  }

  async createSubscription(args: CheckoutArgs) {
    const planId = PLAN_IDS[args.tier]?.[args.interval];

    // Dev mode: no real Razorpay keys → return mock subscription
    if (!planId || !process.env.RAZORPAY_KEY_ID) {
      return {
        subscriptionId: `sub_mock_${args.tier}_${args.interval}_${Date.now()}`,
        keyId: "rzp_test_mock",
        amount: PRICES_INR[args.tier as keyof typeof PRICES_INR][args.interval] * 100,
        currency: "INR",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = await (this.client.subscriptions as any).create({
      plan_id: planId,
      total_count: args.interval === "monthly" ? 120 : 10, // 10yr or 10yr
      quantity: 1,
      customer_notify: 1,
      notes: {
        user_id: args.userId,
        tier: args.tier,
        interval: args.interval,
        locale: args.locale,
      },
    });

    return {
      subscriptionId: sub.id as string,
      keyId: process.env.RAZORPAY_KEY_ID!,
      amount: PRICES_INR[args.tier as keyof typeof PRICES_INR][args.interval] * 100,
      currency: "INR",
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    if (!process.env.RAZORPAY_KEY_ID) return; // dev mock — no-op
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.client.subscriptions as any).cancel(providerSubscriptionId, {
      cancel_at_cycle_end: 1, // honour current period; don't cut off mid-cycle
    });
  }

  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const payload = `${params.orderId}|${params.paymentId}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(params.signature, "hex")
    );
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(signature, "hex")
      );
    } catch {
      return false;
    }
  }

  parseWebhookEvent(body: string): WebhookEvent {
    return WebhookEventSchema.parse(JSON.parse(body));
  }
}

// ── Subscription state machine ─────────────────────────────────────────────────
// Maps Razorpay webhook events → our internal subscription status

export type RazorpayEventName =
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.completed"
  | "subscription.updated"
  | "subscription.halted"
  | "subscription.cancelled"
  | "subscription.paused"
  | "subscription.resumed"
  | "payment.failed";

interface StateTransition {
  newStatus: "active" | "past_due" | "expired" | "cancelled";
  extendPeriod: boolean;
  gracePeriodHours?: number;
}

export const STATE_TRANSITIONS: Record<RazorpayEventName, StateTransition> = {
  "subscription.activated": {
    newStatus: "active",
    extendPeriod: true,
  },
  "subscription.charged": {
    newStatus: "active",
    extendPeriod: true,
  },
  "subscription.completed": {
    newStatus: "expired",
    extendPeriod: false,
  },
  "subscription.updated": {
    newStatus: "active",
    extendPeriod: false,
  },
  "subscription.halted": {
    newStatus: "expired",
    extendPeriod: false,
  },
  "subscription.cancelled": {
    newStatus: "cancelled",
    extendPeriod: false, // period_end already set; access remains until then
  },
  "subscription.paused": {
    newStatus: "past_due",
    extendPeriod: false,
    gracePeriodHours: 72,
  },
  "subscription.resumed": {
    newStatus: "active",
    extendPeriod: true,
  },
  "payment.failed": {
    newStatus: "past_due",
    extendPeriod: false,
    gracePeriodHours: 72,
  },
};

// Singleton — one provider instance for the lifetime of the lambda/edge function
let _provider: RazorpayProvider | null = null;
export function getPaymentProvider(): RazorpayProvider {
  if (!_provider) _provider = new RazorpayProvider();
  return _provider;
}
