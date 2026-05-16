"use client";

/**
 * WeatherAlerts — MeenTrack V2
 *
 * Design decisions:
 *  - Hero weather card with gradient + large wind number (Revolut data display)
 *  - Tide chart using SVG wave bars (Open radial/visual elements)
 *  - Alert cards with colored left border accent (Revolut transaction rows)
 *  - 5-day mini forecast strip (Revolut horizontal card row)
 *  - ALL CAPS section labels (GO Club premium typography)
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wind, Waves, Thermometer, Eye,
  AlertTriangle, CheckCircle, XCircle, Clock,
  TrendingDown, Minus
} from "lucide-react";
import { SectionLabel, CardShell, Badge, LiveDot, Divider, CountUp, SkeletonBlock } from "../shared/Atoms";
import { gradients } from "../tokens";
import { harborLabel } from "../constants";
import { useT } from "@/lib/meentrack/i18n";

// ── Mock data ──────────────────────────────────────────────────────────────────

const WEATHER = {
  wind:      { speed: 12, dir: "SW", gust: 18 },
  wave:      { height: 0.8, period: 6 },
  rain:      { chance: 15, intensity: "Light" },
  temp:      { sea: 27, air: 31 },
  visibility:12,
  source:    "INCOIS + IMD",
  updatedAt: "4 min ago",
};

const TIDE_DATA = [
  { time: "00:00", height: 0.4 },
  { time: "03:00", height: 0.8 },
  { time: "06:00", height: 1.6 },  // high
  { time: "09:00", height: 1.4 },
  { time: "12:00", height: 0.6 },
  { time: "15:00", height: 0.3 },  // low
  { time: "18:00", height: 1.0 },
  { time: "21:00", height: 1.5 },
  { time: "24:00", height: 1.3 },
];

const FORECAST = [
  { day: "Mon", icon: "fair",   wave: 0.8, wind: 12 },
  { day: "Tue", icon: "good",   wave: 0.6, wind: 10 },
  { day: "Wed", icon: "fair",   wave: 1.2, wind: 16 },
  { day: "Thu", icon: "caution",wave: 2.1, wind: 22 },
  { day: "Fri", icon: "danger", wave: 3.4, wind: 28 },
];

// Fix #11: alerts ordered by severity — most critical first
const ALERTS = [
  {
    id: "a3",
    severity: "red" as const,
    title: "Cyclone watch active",
    body: "Deep depression in Bay of Bengal. Friday conditions severe (3.4 m). Avoid open sea after Thursday.",
    source: "IMD",
    time: "3 hr ago",
    icon: XCircle,
  },
  {
    id: "a2",
    severity: "amber" as const,
    title: "Rising swell Thursday",
    body: "IMD forecast: wave height increasing to 2.1 m from Thursday noon. Plan returns before 12:00.",
    source: "IMD",
    time: "1 hr ago",
    icon: AlertTriangle,
  },
  {
    id: "a1",
    severity: "green" as const,
    title: "Safe to fish",
    body: "All parameters within safe limits. Wave height 0.8 m · Wind 12 kt SW.",
    source: "INCOIS",
    time: "4 min ago",
    icon: CheckCircle,
  },
];

const SEVERITY_CONFIG = {
  green: {
    border:  "border-l-mt-green",
    bg:      "bg-mt-green/5",
    icon:    "text-mt-green",
    badge:   "green" as const,
  },
  amber: {
    border:  "border-l-mt-amber",
    bg:      "bg-mt-amber/5",
    icon:    "text-mt-amber",
    badge:   "amber" as const,
  },
  red: {
    border:  "border-l-mt-red",
    bg:      "bg-mt-red/5",
    icon:    "text-mt-red",
    badge:   "red" as const,
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function WeatherHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
    <CardShell className="mx-5 mt-5">
      <div
        className="p-5"
        style={{
          background:
            "linear-gradient(135deg, var(--color-mt-mesh) 0%, var(--color-mt-bg) 70%, var(--color-mt-base) 100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <LiveDot color="var(--color-mt-green)" />
            <span className="text-[12px] font-semibold text-mt-green">
              Safe conditions
            </span>
          </div>
          <span className="text-[11px] text-mt-dim">
            {WEATHER.source} · {WEATHER.updatedAt}
          </span>
        </div>

        {/* Hero metric: Wind */}
        <div className="flex items-end gap-3 mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim mb-1">
              Wind Speed
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[52px] font-black text-mt-aqua leading-none">
                <CountUp target={WEATHER.wind.speed} duration={750} delayMs={350} />
              </span>
              <span className="text-[16px] font-semibold text-mt-dim mb-1">kt</span>
            </div>
            <p className="text-[12px] text-mt-muted">
              {WEATHER.wind.dir} · Gusts <CountUp target={WEATHER.wind.gust} duration={750} delayMs={350} /> kt
            </p>
          </div>

          {/* Wind direction compass — Fix #8: SVG needle rotates around compass centre */}
          <div className="mb-2 ml-auto w-14 h-14 relative">
            <svg width={56} height={56} viewBox="0 0 56 56" aria-hidden="true" style={{ overflow: "visible" }}>
              {/* Ring */}
              <circle cx="28" cy="28" r="26" fill="none" stroke="var(--color-mt-border)" strokeWidth="2" />
              {/* Cardinal tick marks */}
              <circle cx="28" cy="4"  r="1.5" fill="var(--color-mt-border)" />
              <circle cx="28" cy="52" r="1.5" fill="var(--color-mt-border)" />
              <circle cx="4"  cy="28" r="1.5" fill="var(--color-mt-border)" />
              <circle cx="52" cy="28" r="1.5" fill="var(--color-mt-border)" />
              {/*
                SW = 225° clockwise from N.
                Needle tip (active/aqua) points to wind origin: SW.
                Rotate a North-pointing needle 225° around centre (28,28).
                North-facing needle: tip at (28,6), tail at (28,44).
              */}
              <g transform="rotate(225 28 28)">
                {/* Aqua tip half (N half of the rotated needle → ends up pointing SW) */}
                <polygon points="28,6 25.5,16 30.5,16" fill="var(--color-mt-aqua)" />
                <rect x="27" y="16" width="2" height="10" rx="1" fill="var(--color-mt-aqua)" />
                {/* Grey tail half */}
                <rect x="27" y="30" width="2" height="16" rx="1" fill="var(--color-mt-border)" />
              </g>
              {/* Centre pivot dot */}
              <circle cx="28" cy="28" r="3.5" fill="var(--color-mt-aqua)" />
              <circle cx="28" cy="28" r="2"   fill="var(--color-mt-base)" />
              {/* Direction label */}
              <text x="28" y="52.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--color-mt-aqua)">SW</text>
            </svg>
          </div>
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Waves",      node: <>{WEATHER.wave.height}m</>,                                                                   icon: <Waves className="w-3.5 h-3.5" />,       iconColor: "text-mt-teal"  },
            { label: "Sea Temp",   node: <><CountUp target={WEATHER.temp.sea}   duration={700} delayMs={(0.30 + 1 * 0.07) * 1000} />°C</>, icon: <Thermometer className="w-3.5 h-3.5" />, iconColor: "text-mt-green" },
            { label: "Visibility", node: <><CountUp target={WEATHER.visibility} duration={700} delayMs={(0.30 + 2 * 0.07) * 1000} />km</>, icon: <Eye className="w-3.5 h-3.5" />,          iconColor: "text-mt-amber" },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.30 + i * 0.07, duration: 0.28, ease: "easeOut" }}
              className="rounded-[10px] p-3 flex flex-col gap-1.5 bg-mt-base"
            >
              <span className={m.iconColor}>{m.icon}</span>
              <p className="text-[10px] text-mt-dim">{m.label}</p>
              <p className="text-[15px] font-bold text-mt-ink">{m.node}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </CardShell>
    </motion.div>
  );
}

function TideChart() {
  const max = Math.max(...TIDE_DATA.map((d) => d.height));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.3, ease: "easeOut" }}
      className="mt-5"
    >
      <SectionLabel>Tide Today</SectionLabel>
      <CardShell className="mx-5 mt-3">
        <div className="p-5">
          {/* Labels */}
          <div className="flex items-end gap-0 mb-1" style={{ height: 80 }}>
            {TIDE_DATA.map((d, i) => {
              const pct  = d.height / max;
              const isHigh = d.height === max;
              const isLow  = d.height === Math.min(...TIDE_DATA.map((x) => x.height));
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  {(isHigh || isLow) && (
                    <span
                      className={`text-[8px] font-bold ${isHigh ? "text-mt-aqua" : "text-mt-muted"}`}
                    >
                      {d.height}m
                    </span>
                  )}
                  <motion.div
                    className={`w-full rounded-t-[3px] ${isHigh ? "bg-mt-aqua" : isLow ? "bg-mt-border" : "bg-mt-teal"}`}
                    style={{ opacity: 0.4 + pct * 0.6 }}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct * 68}px` }}
                    transition={{ delay: 0.34 + i * 0.04, duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              );
            })}
          </div>
          {/* Time labels — Fix #9: edge labels left/right aligned to avoid clipping */}
          <div className="flex gap-0">
            {TIDE_DATA.map((d, i) => {
              const align =
                i === 0                    ? "justify-start" :
                i === TIDE_DATA.length - 1 ? "justify-end"   : "justify-center";
              return (
                <div key={i} className={`flex-1 flex ${align}`}>
                  {i % 2 === 0 && (
                    <span className="text-[8px] text-mt-dim">
                      {d.time.replace(":00", "")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <Divider className="my-3 mx-0" />

          {/* High/Low summary */}
          <div className="flex justify-between">
            <div>
              <p className="text-[10px] text-mt-dim">High tide</p>
              <p className="text-[13px] font-bold text-mt-aqua">06:00 · 1.6 m</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-mt-dim">Low tide</p>
              <p className="text-[13px] font-bold text-mt-muted">15:00 · 0.3 m</p>
            </div>
          </div>
        </div>
      </CardShell>
    </motion.div>
  );
}

function ForecastStrip() {
  const iconMap: Record<string, React.ElementType> = {
    good:    CheckCircle,
    fair:    Minus,
    caution: TrendingDown,
    danger:  XCircle,
  };
  const colorMap: Record<string, string> = {
    good:    "text-mt-green",
    fair:    "text-mt-amber",
    caution: "text-mt-orange",
    danger:  "text-mt-red",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.3, ease: "easeOut" }}
      className="mt-5"
    >
      <SectionLabel>5-Day Outlook</SectionLabel>
      {/*
        Fix #10: relative wrapper so the right-fade gradient sits over the scrollable strip.
        FRI (danger day) is partially visible at rest — fade signals it's scrollable.
        Cards trimmed to w-[74px] so FRI's danger red peeks in without a card width change.
      */}
      <div className="relative mt-3">
        <div className="flex gap-2.5 px-5 overflow-x-auto scrollbar-none pb-1 snap-x snap-mandatory">
          {FORECAST.map((f, i) => {
            const Icon  = iconMap[f.icon] ?? Minus;
            const color = colorMap[f.icon] ?? "text-mt-muted";
            const isDanger = f.icon === "danger";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.40 + i * 0.07, duration: 0.3 }}
                className={`snap-start flex-shrink-0 w-[74px] rounded-[14px] p-3 flex flex-col items-center gap-2 border ${
                  isDanger
                    ? "bg-mt-red/5 border-mt-red/30"
                    : "bg-mt-surface border-mt-border"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mt-dim">
                  {f.day}
                </p>
                <Icon className={`w-4 h-4 ${color}`} aria-label={f.icon} />
                <div className="w-full flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <Waves className="w-2.5 h-2.5 text-mt-dim" aria-hidden="true" />
                    <span className={`text-[10px] font-mono ${isDanger ? "text-mt-red font-bold" : "text-mt-muted"}`}>
                      {f.wave}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Wind className="w-2.5 h-2.5 text-mt-dim" aria-hidden="true" />
                    <span className={`text-[10px] font-mono ${isDanger ? "text-mt-red font-bold" : "text-mt-muted"}`}>
                      <CountUp target={f.wind} duration={500} delayMs={(0.40 + i * 0.07) * 1000} />kt
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right-fade gradient: scroll affordance — reveals FRI danger card partially */}
        <div
          className="pointer-events-none absolute top-0 right-0 bottom-1 w-10"
          style={{ background: gradients.scrollFade }}
        />
      </div>
    </motion.div>
  );
}

function AlertCards() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.20, duration: 0.3, ease: "easeOut" }}
      className="mt-5"
    >
      <SectionLabel>Active Alerts</SectionLabel>
      <div className="flex flex-col gap-3 mx-5 mt-3">
        {ALERTS.map((a, i) => {
          const sev  = SEVERITY_CONFIG[a.severity];
          const Icon = a.icon;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46 + i * 0.09, duration: 0.3 }}
              className={`rounded-[16px] border-l-4 border border-mt-border overflow-hidden ${sev.border} ${sev.bg}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${sev.icon}`} aria-hidden="true" />
                    <p className="text-[13px] font-semibold text-mt-ink">
                      {a.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant={sev.badge}>{a.source}</Badge>
                  </div>
                </div>
                <p className="text-[12px] text-mt-muted leading-relaxed">
                  {a.body}
                </p>
                <p className="text-[10px] text-mt-dim mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />{a.time}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// ── Main export ─────────────────────────────────────────────────────────────────

/** Mirrors the hero + tide + forecast + alerts stack — no layout shift. */
function WeatherSkeleton() {
  return (
    <div>
      {/* Hero card */}
      <div className="mx-5 mt-5 bg-mt-surface border border-mt-border rounded-[20px] p-5">
        <div className="flex items-center justify-between mb-5">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-2.5 w-20" />
        </div>
        <div className="flex items-end justify-between mb-5">
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className="h-12 w-24" />
            <SkeletonBlock className="h-2.5 w-28" />
          </div>
          <SkeletonBlock className="w-14 h-14 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-16 rounded-[10px]" />
          ))}
        </div>
      </div>

      {/* Tide chart */}
      <div className="mt-5">
        <div className="px-5"><SkeletonBlock className="h-2.5 w-24" /></div>
        <div className="mx-5 mt-3 bg-mt-surface border border-mt-border rounded-[20px] p-5">
          <SkeletonBlock className="h-20 w-full rounded-[8px]" />
        </div>
      </div>

      {/* Forecast strip */}
      <div className="mt-5">
        <div className="px-5"><SkeletonBlock className="h-2.5 w-28" /></div>
        <div className="flex gap-2.5 px-5 mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} className="w-[74px] h-[92px] rounded-[14px] flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="mt-5">
        <div className="px-5"><SkeletonBlock className="h-2.5 w-24" /></div>
        <div className="flex flex-col gap-3 mx-5 mt-3">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-24 rounded-[16px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WeatherAlerts({ harbor = "" }: { harbor?: string }) {
  const { t } = useT();
  const port = harborLabel(harbor);
  // Data-load simulation — in production `loaded` is driven by real fetch state.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 650);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="px-5 pt-5 pb-1"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim">
          {port} Harbor · {TODAY}
        </p>
        <h1 className="text-[22px] font-bold text-mt-ink mt-0.5">
          {t("screen.weatherAlerts")}
        </h1>
      </motion.div>

      <AnimatePresence mode="wait">
        {!loaded ? (
          <motion.div key="wx-skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <WeatherSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="wx-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
          >
            <WeatherHero />
            <TideChart />
            <ForecastStrip />
            <AlertCards />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WeatherAlerts;
