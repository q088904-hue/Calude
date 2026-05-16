"use client";

/**
 * ProfileSettings — MeenTrack V2
 *
 * Design decisions:
 *  - Profile card: large avatar circle with plan badge (GO Club: premium profile)
 *  - Plan status card with usage meters (Revolut: account overview card)
 *  - Settings grouped in rounded list sections (iOS/Revolut: grouped table view)
 *  - Stat summary row (Revolut: inline data metrics)
 *  - Danger zone at the bottom (red tint, separate card)
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Fish, Map, Bell, Globe, Shield, HelpCircle,
  ChevronRight, LogOut, Anchor, Star, Edit3,
  Download, Moon, Vibrate, Info
} from "lucide-react";
import { CardShell, Badge, CountUp, FadeSlide, ToggleSwitch } from "../shared/Atoms";
import { springs } from "../tokens";
import { harborFull, harborShort } from "../constants";
import { useT } from "@/lib/meentrack/i18n";

// ── Mock data ──────────────────────────────────────────────────────────────────

/** Subscription tier — structurally matches DemoControls' DemoTier. */
export type PlanTier = "free" | "trialing" | "pro";

const USER = {
  name:   "Rajan Pillai",
  phone:  "+91 98765 43210",
  memberSince: "Jan 2025",
  catches: 142,
  tripsThisSeason: 38,
  avgScore: 74,
};

/** Display label for the plan badge / heading per tier. */
function planLabel(tier: PlanTier): string {
  return tier === "free" ? "Free" : "Pro";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function speciesLabel(sp: string[]) {
  if (sp.length === 0) return "All";
  if (sp.length <= 2)  return sp.join(", ");
  return `${sp.slice(0, 2).join(", ")} +${sp.length - 2}`;
}

const USAGE = [
  { label: "AI queries today",  used: 8,  total: "∞",  color: "var(--color-mt-aqua)"  },
  { label: "Saved waypoints",   used: 12, total: 50,   color: "var(--color-mt-green)" },
  { label: "Offline map cache", used: 68, total: 100,  color: "var(--color-mt-amber)", unit: "MB" },
];

type SettingItem =
  | { kind: "link";    icon: React.ElementType; label: string; value?: string; onTap: () => void }
  | { kind: "toggle";  icon: React.ElementType; label: string; value: boolean; onToggle: () => void }
  | { kind: "select";  icon: React.ElementType; label: string; value: string; onTap: () => void };

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProfileCard({ harbor, tier }: { harbor: string; tier: PlanTier }) {
  return (
    <CardShell className="mx-5 mt-5">
      <div
        className="p-5"
        style={{
          background:
            "linear-gradient(135deg, var(--color-mt-mesh) 0%, var(--color-mt-surface) 100%)",
        }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-[24px] font-black text-mt-base"
              style={{ background: "linear-gradient(135deg, var(--color-mt-aqua), var(--color-mt-green))" }}
            >
              R
            </div>
            {/* Edit button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={springs.snap}
              aria-label="Edit profile photo"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-mt-raised border border-mt-border flex items-center justify-center"
            >
              <Edit3 className="w-3 h-3 text-mt-muted" />
            </motion.button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-[18px] font-bold text-mt-ink truncate">
                {USER.name}
              </h2>
              <Badge variant={tier === "free" ? "neutral" : "aqua"}>
                <Star className="w-2.5 h-2.5" /> {planLabel(tier)}
              </Badge>
            </div>
            <p className="text-[12px] text-mt-muted">{USER.phone}</p>
            <p className="text-[12px] text-mt-dim flex items-center gap-1 mt-0.5">
              <Anchor className="w-3 h-3" />
              {harborFull(harbor)}
            </p>
          </div>
        </div>

        {/* Season stats row — numbers count up on mount (Revolut: inline metrics) */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-mt-border">
          {[
            // startDelay anchors to ProfileCard's FadeSlide visible time:
            // FadeSlide delay 0.06s + duration 0.32*0.85 = 0.332s → 340ms base, 70ms stagger.
            { label: "Catches",   value: USER.catches,         duration: 650, startDelay: 340 },
            { label: "Trips",     value: USER.tripsThisSeason, duration: 730, startDelay: 410 },
            { label: "Avg Score", value: USER.avgScore,        duration: 810, startDelay: 480 },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-mono text-[22px] font-black text-mt-ink tabular-nums">
                <CountUp target={s.value} duration={s.duration} delayMs={s.startDelay} />
              </p>
              <p className="text-[10px] text-mt-dim mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

function PlanStatusCard({
  tier,
  trialDaysLeft,
  onUpgrade,
}: {
  tier: PlanTier;
  trialDaysLeft: number;
  onUpgrade: () => void;
}) {
  // Trial urgency only applies while trialing; clamp to the 7-day window.
  const trialTotal = 7;
  const daysLeft   = Math.max(0, Math.min(trialTotal, trialDaysLeft));
  const trialUsed  = trialTotal - daysLeft;
  const trialPct   = Math.round((trialUsed / trialTotal) * 100);

  const isTrial = tier === "trialing";
  const isPaid  = tier === "pro";
  const heading = tier === "free" ? "Free" : "Pro";

  return (
    <CardShell className="mx-5 mt-4" glow={!isPaid}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim">
              Your Plan
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-[18px] font-black ${tier === "free" ? "text-mt-muted" : "text-mt-aqua"}`}>
                {heading}
              </p>
              {isTrial && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mt-amber/15 border border-mt-amber/30 text-mt-amber text-[10px] font-bold">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mt-amber opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-mt-amber" />
                  </span>
                  {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                </span>
              )}
              {isPaid && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mt-green/15 border border-mt-green/30 text-mt-green text-[10px] font-bold">
                  Active
                </span>
              )}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={springs.snap}
            onClick={onUpgrade}
            className="px-3 py-1.5 rounded-full bg-mt-aqua/10 border border-mt-aqua/30 text-mt-aqua text-[11px] font-semibold"
          >
            {isPaid ? "Manage" : "Upgrade"}
          </motion.button>
        </div>

        {/* Trial countdown — only while trialing */}
        {isTrial && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-mt-dim">Trial period</p>
              <p className="text-[10px] font-mono text-mt-amber">
                {/* delayMs 390 = FadeSlide delay 0.12s + dur 0.32*0.85 ≈ 0.392s */}
                <CountUp target={trialUsed} duration={700} delayMs={390} /> / {trialTotal} days used
              </p>
            </div>
            <div className="h-1.5 bg-mt-border rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(to right, var(--color-mt-amber), var(--color-mt-orange))" }}
                initial={{ width: 0 }}
                animate={{ width: `${trialPct}%` }}
                transition={{ duration: 0.7, delay: 0.39, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Free-tier upsell line — replaces the trial bar when not trialing/paid */}
        {tier === "free" && (
          <p className="text-[11px] text-mt-muted leading-relaxed mb-4">
            You&apos;re on the free plan. Upgrade for 48h BiteTime™, PFZ heatmap and the AI Advisor.
          </p>
        )}

        {/* Usage meters */}
        <div className="flex flex-col gap-3">
          {USAGE.map((u, i) => {
            const pct      = typeof u.total === "number"
              ? Math.round((u.used / u.total) * 100)
              : 30;
            // 390ms = FadeSlide delay 0.12s + dur 0.32*0.85 ≈ 0.392s (card visible time)
            const barDelay = 0.39 + i * 0.07;
            return (
              <div key={u.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] text-mt-muted">{u.label}</p>
                  <p className="text-[11px] font-mono text-mt-ink">
                    <CountUp target={u.used} duration={700} delayMs={390 + i * 70} />
                    {u.unit ? ` ${u.unit}` : ""}
                    {" / "}
                    <span className="text-mt-dim">
                      {u.total}
                      {u.unit ? ` ${u.unit}` : ""}
                    </span>
                  </p>
                </div>
                <div className="h-1.5 bg-mt-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: u.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.65, delay: barDelay, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CardShell>
  );
}

// Fix (Profile icon colors): each section gets its own icon tint so they're visually distinct.
function SettingsSection({
  title,
  items,
  iconBgClass  = "bg-mt-border/10",
  iconClass    = "text-mt-muted",
  entranceDelay = 0,
}: {
  title: string;
  items: SettingItem[];
  /** Tailwind bg class for the icon container (e.g. "bg-mt-teal/10"). */
  iconBgClass?:  string;
  /** Tailwind text class for the icon (e.g. "text-mt-teal"). */
  iconClass?:    string;
  /** Base delay (s) so row stagger starts just as the section is fully visible. */
  entranceDelay?: number;
}) {
  return (
    <div className="mx-5 mt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim mb-2 px-1">
        {title}
      </p>
      <div className="rounded-[16px] border border-mt-border overflow-hidden divide-y divide-mt-border bg-mt-surface">
        {items.map((item, i) => {
          const Icon = item.icon;
          if (item.kind === "toggle") {
            return (
              <motion.button
                key={i}
                role="switch"
                aria-checked={item.value}
                aria-label={item.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  opacity: { delay: entranceDelay + i * 0.04, duration: 0.2, ease: "easeOut" },
                  y:       { delay: entranceDelay + i * 0.04, duration: 0.2, ease: "easeOut" },
                  scale:   springs.snap,
                }}
                onClick={item.onToggle}
                className="w-full flex items-center gap-3 px-4 py-3.5"
              >
                <div
                  className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${iconBgClass}`}
                >
                  <Icon className={`w-4 h-4 ${iconClass}`} />
                </div>
                <span className="flex-1 text-[13px] text-mt-ink text-left">
                  {item.label}
                </span>
                <ToggleSwitch active={item.value} />
              </motion.button>
            );
          }
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                opacity: { delay: entranceDelay + i * 0.04, duration: 0.2, ease: "easeOut" },
                y:       { delay: entranceDelay + i * 0.04, duration: 0.2, ease: "easeOut" },
                scale:   springs.snap,
              }}
              onClick={item.onTap}
              className="w-full flex items-center gap-3 px-4 py-3.5"
            >
              <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                <Icon className={`w-4 h-4 ${iconClass}`} />
              </div>
              <span className="flex-1 text-[13px] text-mt-ink text-left">
                {item.label}
              </span>
              {item.kind === "select" && (
                <span className="text-[12px] text-mt-dim mr-1">{item.value}</span>
              )}
              <ChevronRight className="w-4 h-4 text-mt-border" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function ProfileSettings({
  onUpgrade,
  onToast,
  harbor  = "",
  species = [],
  tier    = "trialing",
  trialDaysLeft = 5,
}: {
  onUpgrade: () => void;
  onToast:   (msg: string) => void;
  harbor?:   string;
  species?:  string[];
  tier?:     PlanTier;
  trialDaysLeft?: number;
}) {
  const { t } = useT();
  const [notifs,  setNotifs]  = useState(true);
  const [offline, setOffline] = useState(true);
  const [haptic,  setHaptic]  = useState(false);

  const fishingSettings: SettingItem[] = [
    { kind: "select", icon: Anchor, label: "Home harbor",    value: harborShort(harbor),   onTap: () => onToast("Harbor selection — coming soon") },
    { kind: "select", icon: Globe,  label: "Language",       value: "English",             onTap: () => onToast("Language settings — coming soon") },
    { kind: "select", icon: Fish,   label: "Target species", value: speciesLabel(species), onTap: () => onToast("Species preferences — coming soon") },
    { kind: "link",   icon: Map,    label: "Saved waypoints",                              onTap: () => onToast("Waypoints — saved in Pro plan") },
  ];

  const appSettings: SettingItem[] = [
    { kind: "toggle", icon: Bell,     label: "Safety alerts",  value: notifs,  onToggle: () => setNotifs(n => !n) },
    { kind: "toggle", icon: Download, label: "Offline mode",   value: offline, onToggle: () => setOffline(o => !o) },
    { kind: "toggle", icon: Vibrate,  label: "Haptic feedback",value: haptic,  onToggle: () => setHaptic(h => !h) },
    { kind: "select", icon: Moon,     label: "Appearance",     value: "Dark",  onTap: () => onToast("Theme — Dark mode only for now") },
  ];

  const supportSettings: SettingItem[] = [
    { kind: "link", icon: HelpCircle, label: "Help & FAQs",    onTap: () => onToast("Opening Help centre…") },
    { kind: "link", icon: Info,       label: "About MeenTrack", onTap: () => onToast("MeenTrack v2.0.0 · Built for fishermen") },
    { kind: "link", icon: Shield,     label: "Privacy policy",  onTap: () => onToast("Opening Privacy policy…") },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none pb-8">

      {/* Title */}
      <FadeSlide delay={0}>
        <div className="px-5 pt-5 pb-1">
          <h1 className="text-[22px] font-bold text-mt-ink">{t("screen.profile")}</h1>
          <p className="text-[12px] text-mt-dim mt-0.5">
            Member since {USER.memberSince}
          </p>
        </div>
      </FadeSlide>

      <FadeSlide delay={0.06}>
        <ProfileCard harbor={harbor} tier={tier} />
      </FadeSlide>

      <FadeSlide delay={0.12}>
        <PlanStatusCard tier={tier} trialDaysLeft={trialDaysLeft} onUpgrade={onUpgrade} />
      </FadeSlide>

      <FadeSlide delay={0.18}>
        <SettingsSection title="Fishing" items={fishingSettings} iconBgClass="bg-mt-teal/10"  iconClass="text-mt-teal"  entranceDelay={0.46} />
      </FadeSlide>

      <FadeSlide delay={0.24}>
        <SettingsSection title="App" items={appSettings} iconBgClass="bg-mt-aqua/10"  iconClass="text-mt-aqua"  entranceDelay={0.52} />
      </FadeSlide>

      <FadeSlide delay={0.30}>
        <SettingsSection title="Support" items={supportSettings} iconBgClass="bg-mt-amber/10" iconClass="text-mt-amber" entranceDelay={0.58} />
      </FadeSlide>

      {/* Danger zone */}
      <FadeSlide delay={0.36}>
        <div className="mx-5 mt-4 rounded-[16px] border border-mt-red/20 overflow-hidden">
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={springs.snap}
            onClick={() => onToast("Sign out — confirm in the full app")}
            className="w-full flex items-center gap-3 px-4 py-4 bg-mt-red/5"
          >
            <LogOut className="w-4 h-4 text-mt-red" />
            <span className="text-[13px] font-semibold text-mt-red">Sign out</span>
          </motion.button>
        </div>
      </FadeSlide>

      <p className="text-center text-[10px] text-mt-border mt-6">
        MeenTrack v2.0.0 · Built for fishermen
      </p>
    </div>
  );
}

export default ProfileSettings;
