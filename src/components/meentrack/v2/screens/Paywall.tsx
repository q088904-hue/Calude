"use client";

/**
 * Paywall — MeenTrack V2
 *
 * Design decisions:
 *  - Full-bleed gradient hero (Open: immersive first impression)
 *  - Monthly/Yearly toggle pill with savings highlight (Revolut: financial toggle)
 *  - FREE card: muted, current-plan disabled (Revolut: ghost card for current state)
 *  - PRO card: glowing aqua border + "Most popular" float badge (GO Club: premium badge)
 *  - FLEET card: compact secondary option (GO Club: tiered depth)
 *  - Feature comparison rows with ✓ / — cells (Revolut: clean tabular data)
 *  - "No card needed" trust chip below CTA (Open: calm reassurance)
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fish, Zap, Shield, Users, Check,
  Minus, Star, ChevronDown, X, ArrowRight
} from "lucide-react";
import { PrimaryButton, Badge } from "../shared/Atoms";
import { gradients, springs } from "../tokens";

// ── Plans ──────────────────────────────────────────────────────────────────────

const PLANS = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Essential safety tools",
    monthly: 0,
    yearly: 0,
    color: "var(--color-mt-muted)",
    features: [
      "SOS + sea status alerts",
      "Basic map — 10 harbors",
      "3 AI advisor queries / day",
      "3-band BiteTime today",
      "5 saved waypoints",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For the serious fisherman",
    monthly: 99,
    yearly: 499,
    color: "var(--color-mt-aqua)",
    badge: "Most popular",
    features: [
      "Everything in Free",
      "Unlimited AI Advisor",
      "BiteTime™ 48h forecast",
      "PFZ heatmap + bathymetry",
      "Fish ID from photo",
      "Full route planner + ETA",
      "Catch history insights",
      "Offline maps (100 km radius)",
    ],
  },
  fleet: {
    id: "fleet",
    name: "Fleet",
    tagline: "Up to 5 boats",
    monthly: 499,
    yearly: 4799,
    color: "var(--color-mt-amber)",
    features: [
      "Everything in Pro",
      "Track all 5 boats live",
      "Fleet catch reports PDF",
      "Priority INCOIS data feed",
      "Dedicated support",
    ],
  },
} as const;

type PlanId = keyof typeof PLANS;

const FEATURE_COMPARE = [
  { feature: "Sea status + SOS",   free: true,  pro: true,  fleet: true  },
  { feature: "AI Advisor queries", free: "3/day", pro: "∞", fleet: "∞"   },
  { feature: "BiteTime™",          free: "Today", pro: "48h", fleet: "48h" },
  { feature: "PFZ heatmap",        free: false, pro: true,  fleet: true  },
  { feature: "Fish ID (photo)",     free: false, pro: true,  fleet: true  },
  { feature: "Route planner",       free: false, pro: true,  fleet: true  },
  { feature: "Fleet tracking",      free: false, pro: false, fleet: true  },
  { feature: "Offline maps",        free: false, pro: true,  fleet: true  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function PaywallHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
      className="relative px-5 pt-8 pb-7 overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, var(--color-mt-mesh) 0%, var(--color-mt-bg) 50%, var(--color-mt-base) 100%)",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] opacity-20"
        style={{
          background:
            gradients.topGlow,
        }}
      />

      <div className="relative text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mt-aqua/10 border border-mt-aqua/25 mb-4">
          <Star className="w-3 h-3 text-mt-aqua" />
          <span className="text-[11px] font-semibold text-mt-aqua">
            7-day free trial · No card needed
          </span>
        </div>

        <h2 className="text-[26px] font-black text-mt-ink leading-tight mb-2">
          Fish smarter.<br />Earn more.
        </h2>
        <p className="text-[13px] text-mt-muted leading-relaxed max-w-[260px] mx-auto">
          AI-powered insights built for South Indian fishermen — Tamil Nadu & Kerala.
        </p>
      </div>
    </motion.div>
  );
}

function BillingToggle({
  interval,
  onChange,
}: {
  interval: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 mx-5 mb-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.3, ease: "easeOut" }}
        className="inline-flex bg-mt-surface border border-mt-border rounded-full p-1 gap-1"
      >
        {(["monthly", "yearly"] as const).map((opt) => (
          <motion.button
            key={opt}
            whileTap={{ scale: 0.94 }}
            transition={springs.snap}
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 ${
              interval === opt
                ? "bg-mt-border text-mt-ink"
                : "text-mt-dim"
            }`}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
            {opt === "yearly" && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-mt-green text-mt-base text-[9px] font-bold">
                -58%
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  isSelected,
  onSelect,
  cardIndex = 0,
}: {
  plan: (typeof PLANS)[PlanId];
  interval: "monthly" | "yearly";
  isSelected: boolean;
  onSelect: () => void;
  cardIndex?: number;
}) {
  // Base delay for this card's entrance (matches the motion.div in the parent .map()).
  // Feature items anchor their stagger to this so they cascade as the card arrives,
  // not before it's visible: card reaches ~85% opacity at cardEntranceDelay + 0.32*0.85.
  // Hero visible at 0.08 + 0.35*0.85 ≈ 0.378s — cards start at 0.38 to cascade after hero.
  const cardEntranceDelay = 0.38 + cardIndex * 0.09;
  const featureBaseDelay  = cardEntranceDelay + 0.27; // 0.32 * 0.85 ≈ 0.27
  const isFree  = plan.monthly === 0;
  const isPro   = plan.id === "pro";
  const isFleet = plan.id === "fleet";
  const price   = interval === "yearly" ? plan.yearly : plan.monthly;
  const perMonth = interval === "yearly" && !isFree
    ? Math.round(plan.yearly / 12)
    : plan.monthly;

  return (
    <motion.button
      whileTap={{ scale: isFree ? 1 : 0.975 }}
      transition={springs.snap}
      onClick={isFree ? undefined : onSelect}
      className="w-full text-left relative"
    >
      {/* "Most popular" float badge */}
      {"badge" in plan && plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="px-3 py-1 rounded-full bg-mt-aqua text-mt-base text-[10px] font-bold flex items-center gap-1">
            <Star className="w-2.5 h-2.5" /> {plan.badge}
          </span>
        </div>
      )}

      {/*
        Fix #2: inner padding px-6 pt-6 pb-5 (was p-5=20px).
        20px padding on a rounded-[20px] card lands exactly in the corner-curve zone,
        clipping "FREE", "PRO" etc. 24px padding clears the Bézier inset.
        overflow-hidden stays here (on the card shell, not on CardShell atom) so the
        gradient/selection highlight clips cleanly to the rounded corners.
      */}
      <div
        className={`rounded-[20px] border px-6 pt-6 pb-5 overflow-hidden transition-all duration-200 ${
          isPro && isSelected
            ? "border-mt-aqua/50 bg-mt-aqua/[0.04] shadow-[0_0_32px_color-mix(in_srgb,var(--color-mt-aqua)_12%,transparent)]"
            : isFleet && isSelected
            ? "border-mt-amber/40 bg-mt-amber/[0.03]"
            : isFree
            ? "border-mt-border bg-mt-surface opacity-70"
            : "border-mt-border bg-mt-surface"
        }`}
        style={{ borderLeftWidth: isPro && isSelected ? "2px" : "1px" }}
      >
        {/* Plan header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: plan.color }}
              >
                {plan.name}
              </p>
              {isFleet && (
                <Badge variant="amber">
                  <Users className="w-2.5 h-2.5" /> Fleet
                </Badge>
              )}
            </div>
            <p className="text-[12px] text-mt-muted">{plan.tagline}</p>
          </div>

          {/* Price — cross-fades when billing interval toggles */}
          <div className="text-right">
            {isFree ? (
              <p className="text-[24px] font-black text-mt-ink">₹0</p>
            ) : (
              <>
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span className="text-[13px] font-semibold text-mt-muted">₹</span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${plan.id}-${interval}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.14 }}
                      className="text-[26px] font-black text-mt-ink leading-none"
                    >
                      {interval === "yearly" ? perMonth : price}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-[12px] text-mt-dim ml-0.5">/mo</span>
                </div>
                <AnimatePresence initial={false}>
                  {interval === "yearly" && (
                    <motion.p
                      key="yearly-note"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.14 }}
                      className="text-[10px] text-mt-dim mt-0.5"
                    >
                      ₹{price}/yr · billed annually
                    </motion.p>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        {/* Features — stagger-cascade as the card arrives */}
        <div className="flex flex-col gap-2">
          {plan.features.map((f, fi) => (
            <motion.div
              key={fi}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay:    featureBaseDelay + fi * 0.04,
                duration: 0.2,
                ease:     "easeOut",
              }}
              className="flex items-center gap-2.5"
            >
              <Check
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: plan.color }}
              />
              <span className="text-[12px] text-mt-muted leading-snug">{f}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-5">
          {isFree ? (
            <div className="w-full py-3 rounded-[12px] bg-mt-border text-center">
              <span className="text-[13px] text-mt-dim font-semibold">
                Current plan
              </span>
            </div>
          ) : (
            <motion.div
              className="w-full py-3 rounded-[12px] flex items-center justify-center overflow-hidden"
              animate={{
                background: isSelected ? plan.color : `color-mix(in srgb, ${plan.color} 9%, transparent)`,
                color:      isSelected ? "var(--color-mt-base)" : plan.color,
              }}
              transition={{ duration: 0.2 }}
            >
              {/* Cross-fade label when selected/unselected */}
              <AnimatePresence mode="wait" initial={false}>
                {isSelected ? (
                  <motion.span
                    key="trial"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{    opacity: 0, y: -4 }}
                    transition={{ duration: 0.13 }}
                    className="text-[13px] font-bold flex items-center gap-2"
                  >
                    Start free trial
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="choose"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{    opacity: 0, y: -4 }}
                    transition={{ duration: 0.13 }}
                    className="text-[13px] font-bold flex items-center gap-2"
                  >
                    Choose {plan.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function FeatureCompare() {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? FEATURE_COMPARE : FEATURE_COMPARE.slice(0, 4);

  function Cell({ val }: { val: boolean | string }) {
    if (val === true)  return <Check className="w-3.5 h-3.5 text-mt-green mx-auto" />;
    if (val === false) return <Minus className="w-3 h-3 text-mt-border mx-auto" />;
    return <span className="text-[10px] font-semibold text-mt-aqua">{val}</span>;
  }

  return (
    <div className="mx-5 mt-6">
      {/* Table header */}
      <div className="grid grid-cols-4 gap-0 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mt-dim col-span-1">
          Feature
        </p>
        {(["free", "pro", "fleet"] as PlanId[]).map((p) => (
          <p
            key={p}
            className="text-[10px] font-bold text-center uppercase tracking-wider"
            style={{ color: PLANS[p].color }}
          >
            {PLANS[p].name}
          </p>
        ))}
      </div>

      {/* Rows — AnimatePresence so hidden rows exit smoothly on collapse */}
      <div className="rounded-[16px] border border-mt-border overflow-hidden divide-y divide-mt-border">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ delay: expanded ? i * 0.04 : 0, duration: 0.22, ease: "easeOut" }}
              className="grid grid-cols-4 items-center py-3 px-4 bg-mt-surface"
            >
              <p className="text-[11px] text-mt-muted col-span-1 leading-snug pr-2">
                {row.feature}
              </p>
              <div className="flex justify-center"><Cell val={row.free} /></div>
              <div className="flex justify-center"><Cell val={row.pro} /></div>
              <div className="flex justify-center"><Cell val={row.fleet} /></div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        transition={springs.snap}
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-[11px] font-semibold text-mt-dim"
      >
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
        {/* Cross-fade the label so it matches the spring rotation on the chevron */}
        <AnimatePresence mode="wait" initial={false}>
          {expanded ? (
            <motion.span
              key="less"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y:  3 }}
              transition={{ duration: 0.13 }}
            >
              Show less
            </motion.span>
          ) : (
            <motion.span
              key="more"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y:  3 }}
              transition={{ duration: 0.13 }}
            >
              See all features
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function Paywall({ onClose }: { onClose?: () => void }) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [selected, setSelected] = useState<PlanId>("pro");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  async function handleCta() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(true);
  }

  const plan = PLANS[selected];

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto scrollbar-none pb-8">
      {/* Close */}
      {onClose && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.2, ease: "easeOut" }}
          className="flex justify-end px-5 pt-5"
        >
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={springs.snap}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-mt-surface border border-mt-border flex items-center justify-center"
          >
            <X className="w-4 h-4 text-mt-muted" />
          </motion.button>
        </motion.div>
      )}

      <PaywallHero />
      <BillingToggle interval={interval} onChange={setInterval} />

      {/* Plan cards — stagger in after hero settles */}
      <div className="flex flex-col gap-4 mx-5">
        {(Object.keys(PLANS) as PlanId[]).map((id, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 + i * 0.09, duration: 0.32, ease: "easeOut" }}
          >
            <PlanCard
              plan={PLANS[id]}
              interval={interval}
              isSelected={selected === id}
              onSelect={() => setSelected(id)}
              cardIndex={i}
            />
          </motion.div>
        ))}
      </div>

      {/* Sticky CTA */}
      <div className="mx-5 mt-6">
        <PrimaryButton onClick={handleCta} disabled={loading}>
          {/* AnimatePresence cross-fades label ↔ spinner so there's no hard swap.
              initial={false} skips the entrance animation on first render.
              Spinner uses border-mt-dim — visible on the disabled dark bg (#1A3050). */}
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.span
                key="spinner"
                initial={{ opacity: 0, scale: 0.55 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.55 }}
                transition={{ duration: 0.16 }}
                className="inline-block w-4 h-4 border-2 border-mt-dim border-t-transparent rounded-full animate-spin"
              />
            ) : (
              <motion.span
                key="label"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.16 }}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Start 7-day free trial with {plan.name}
              </motion.span>
            )}
          </AnimatePresence>
        </PrimaryButton>

        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-mt-dim" />
            <span className="text-[11px] text-mt-dim">No card needed</span>
          </div>
          <div className="w-px h-3 bg-mt-border" />
          <div className="flex items-center gap-1.5">
            <Check className="w-3 h-3 text-mt-dim" />
            <span className="text-[11px] text-mt-dim">Cancel anytime</span>
          </div>
          <div className="w-px h-3 bg-mt-border" />
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-mt-dim" />
            <span className="text-[11px] text-mt-dim">UPI / Razorpay</span>
          </div>
        </div>
      </div>

      {/* Feature compare table */}
      <FeatureCompare />

      {/* Footer note */}
      <p className="text-[11px] text-mt-dim text-center mx-8 mt-6 leading-relaxed">
        Prices in INR. Safety features (SOS, sea status, geofences) are always free — forever.
      </p>
    </div>

    {/* ── Success celebration overlay ─────────────────────────────────────── */}
    <AnimatePresence>
      {success && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-mt-bg px-8"
        >
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.08 }}
            className="w-[88px] h-[88px] rounded-full bg-mt-green/12 border-2 border-mt-green/35 flex items-center justify-center mb-7"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.28, type: "spring", stiffness: 500, damping: 20 }}
            >
              <Check className="w-10 h-10 text-mt-green" strokeWidth={2.5} />
            </motion.div>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.38 }}
            className="text-center mb-8"
          >
            <h2 className="text-[30px] font-black text-mt-ink leading-tight mb-2">
              Welcome to Pro!
            </h2>
            <p className="text-[14px] text-mt-muted leading-relaxed">
              Your 7-day trial has started.<br />
              No card needed — cancel anytime.
            </p>
          </motion.div>

          {/* Unlocked feature chips */}
          <div className="flex flex-wrap gap-2 justify-center mb-9">
            {["BiteTime™ 48h", "PFZ Heatmap", "AI Advisor ∞", "Fish ID"].map((f, i) => (
              <motion.span
                key={f}
                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.36 + i * 0.07, type: "spring", stiffness: 400, damping: 24 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mt-aqua/10 border border-mt-aqua/25 text-[12px] font-semibold text-mt-aqua"
              >
                <Check className="w-3 h-3" />
                {f}
              </motion.span>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.35 }}
            className="w-full"
          >
            <PrimaryButton onClick={onClose}>
              <Fish className="w-4 h-4" />
              Start fishing
            </PrimaryButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}

export default Paywall;
