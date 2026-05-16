"use client";

// Demo control panel — only shown in dev/demo mode.
// Lets you flip subscription tier, sea status, locale, and trial state
// to walk through the full paywall UX without a real payment.

import { motion } from "framer-motion";
import { SeaLevel } from "./SeaStatusBanner";

export type DemoTier = "free" | "trialing" | "pro";
export type DemoLocale = "en" | "ta" | "ml";

interface Props {
  tier: DemoTier;
  seaLevel: SeaLevel;
  locale: DemoLocale;
  trialDaysLeft: number;
  onTier: (t: DemoTier) => void;
  onSeaLevel: (l: SeaLevel) => void;
  onLocale: (l: DemoLocale) => void;
  onTrialDays: (n: number) => void;
}

const Pill = ({
  label,
  active,
  color = "cyan",
  onClick,
}: {
  label: string;
  active: boolean;
  color?: "cyan" | "green" | "amber" | "red" | "nogo";
  onClick: () => void;
}) => {
  const activeStyle: Record<string, string> = {
    cyan:  "bg-mt-aqua/20 text-mt-aqua border-mt-aqua/40",
    green: "bg-mt-green/20 text-mt-green border-mt-green/40",
    amber: "bg-mt-amber/20 text-mt-amber border-mt-amber/40",
    red:   "bg-mt-red/20 text-mt-red border-mt-red/40",
    nogo:  "bg-mt-crimson/30 text-mt-red border-mt-crimson/60",
  };
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all min-h-[36px] ${
        active
          ? activeStyle[color]
          : "bg-mt-surface text-mt-muted border-mt-border hover:border-mt-subtle"
      }`}
    >
      {label}
    </button>
  );
};

export function DemoControls({
  tier, seaLevel, locale, trialDaysLeft,
  onTier, onSeaLevel, onLocale, onTrialDays,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.3 }}
      className="mx-4 mt-3 mb-1 bg-mt-surface border border-mt-border rounded-2xl p-4 flex flex-col gap-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-mt-aqua text-xs font-mono font-semibold uppercase tracking-wider">
          ⚙ Demo controls
        </span>
        <span className="text-mt-muted text-xs">— not shown in production</span>
      </div>

      {/* Subscription tier */}
      <div className="flex flex-col gap-2">
        <p className="text-mt-muted text-xs">Subscription tier</p>
        <div className="flex gap-2 flex-wrap">
          <Pill label="Free"     active={tier === "free"}     color="cyan"  onClick={() => onTier("free")} />
          <Pill label="Trialing" active={tier === "trialing"} color="cyan"  onClick={() => onTier("trialing")} />
          <Pill label="Pro"      active={tier === "pro"}      color="green" onClick={() => onTier("pro")} />
        </div>
      </div>

      {/* Trial days (only when trialing) */}
      {tier === "trialing" && (
        <div className="flex flex-col gap-2">
          <p className="text-mt-muted text-xs">
            Trial days left:{" "}
            <span className={trialDaysLeft <= 1 ? "text-mt-red" : trialDaysLeft <= 2 ? "text-mt-amber" : "text-mt-aqua"}>
              {trialDaysLeft}
            </span>
          </p>
          <input
            type="range" min={0} max={7} step={1}
            value={trialDaysLeft}
            onChange={(e) => onTrialDays(Number(e.target.value))}
            className="w-full accent-mt-aqua h-1.5"
          />
        </div>
      )}

      {/* Sea status */}
      <div className="flex flex-col gap-2">
        <p className="text-mt-muted text-xs">Sea status</p>
        <div className="flex gap-2 flex-wrap">
          <Pill label="🟢 Green" active={seaLevel === "green"} color="green" onClick={() => onSeaLevel("green")} />
          <Pill label="🟡 Amber" active={seaLevel === "amber"} color="amber" onClick={() => onSeaLevel("amber")} />
          <Pill label="🔴 Red"   active={seaLevel === "red"}   color="red"   onClick={() => onSeaLevel("red")} />
          <Pill label="⛔ No-Go" active={seaLevel === "nogo"}  color="nogo"  onClick={() => onSeaLevel("nogo")} />
        </div>
      </div>

      {/* Locale */}
      <div className="flex flex-col gap-2">
        <p className="text-mt-muted text-xs">Language</p>
        <div className="flex gap-2">
          <Pill label="English"  active={locale === "en"} color="cyan" onClick={() => onLocale("en")} />
          <Pill label="தமிழ்"    active={locale === "ta"} color="cyan" onClick={() => onLocale("ta")} />
          <Pill label="മലയാളം" active={locale === "ml"} color="cyan" onClick={() => onLocale("ml")} />
        </div>
      </div>
    </motion.div>
  );
}

export default DemoControls;
