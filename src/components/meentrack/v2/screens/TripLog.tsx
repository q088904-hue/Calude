"use client";

/**
 * TripLog — MeenTrack V2
 * Catch tab default state (no active trip).
 * Shows lifetime stats, scrollable trip history (free + pro-gated), upgrade CTA.
 */

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Fish, Clock, MapPin, Lock, Star, ChevronRight,
  Navigation, TrendingUp, Anchor, Wind, Waves,
} from "lucide-react";
import { SectionLabel, CardShell, ProgressArc, Divider, Badge, PrimaryButton, CountUp, SkeletonBlock } from "../shared/Atoms";
import { getScoreBand, scoreBandConfig, springs } from "../tokens";
import { harborLabel } from "../constants";
import { useEscapeKey } from "../shared/hooks";
import type { TripRecord } from "@/lib/meentrack/types";
import { useT } from "@/lib/meentrack/i18n";

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_STATS = [
  { icon: <Navigation className="w-4 h-4" />, label: "Trips",  target: 23,  unit: undefined, iconClass: "text-mt-aqua",  bgClass: "bg-mt-aqua/10"  },
  { icon: <Fish className="w-4 h-4" />,       label: "Catch",  target: 187, unit: "fish",    iconClass: "text-mt-green", bgClass: "bg-mt-green/10" },
  { icon: <TrendingUp className="w-4 h-4" />, label: "Best",   target: 31,  unit: "fish",    iconClass: "text-mt-amber", bgClass: "bg-mt-amber/10" },
  { icon: <Star className="w-4 h-4" />,       label: "Avg",    target: 74,  unit: "/100",    iconClass: "text-mt-teal",  bgClass: "bg-mt-teal/10"  },
];

// ── Animated stat components ───────────────────────────────────────────────────

function AnimStatCell({
  icon, label, target, unit,
  iconClass = "text-mt-muted", bgClass = "bg-mt-muted/10",
  duration = 700, index = 0,
}: {
  icon:       ReactNode;
  label:      string;
  target:     number;
  unit?:      string;
  iconClass?: string;
  bgClass?:   string;
  duration?:  number;
  index?:     number;
}) {
  // delayMs anchors to cell visible time: delay 0.08+index*0.06 + dur 0.26×0.85 ≈ 0.30+index*0.06s
  const delayMs = (0.30 + index * 0.06) * 1000;

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06, duration: 0.26, ease: "easeOut" }}
    >
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${bgClass}`}>
        <span className={iconClass}>{icon}</span>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-mt-dim">
        {label}
      </p>
      <p className="text-[14px] font-bold text-mt-ink leading-none">
        <CountUp target={target} duration={duration} delayMs={delayMs} />
        {unit && (
          <span className="text-[10px] font-medium text-mt-muted ml-0.5">{unit}</span>
        )}
      </p>
    </motion.div>
  );
}

const MOCK_TRIPS = [
  {
    id: "t1",
    date: "Today",
    location: "SW Zone · 12 nm",
    duration: "6h 40m",
    catchCount: 18,
    species: [
      { name: "Seer Fish",      count: 11 },
      { name: "Yellowfin Tuna", count: 7  },
    ],
    score:     82,
    wind:      14,
    wave:      0.9,
    startTime: "05:20 AM",
    endTime:   "12:00 PM",
    locked:    false,
  },
  {
    id: "t2",
    date: "Yesterday",
    location: "Kochi harbour zone",
    duration: "4h 15m",
    catchCount: 9,
    species: [
      { name: "Mackerel", count: 6 },
      { name: "Sardine",  count: 3 },
    ],
    score:     61,
    wind:      18,
    wave:      1.3,
    startTime: "06:00 AM",
    endTime:   "10:15 AM",
    locked:    false,
  },
  {
    id: "t3",
    date: "26 Apr",
    location: "NW Zone · 8 nm",
    duration: "7h 30m",
    catchCount: 24,
    species: [
      { name: "Tuna",      count: 10 },
      { name: "Seer Fish", count: 9  },
      { name: "Barracuda", count: 5  },
    ],
    score:     91,
    wind:      10,
    wave:      0.6,
    startTime: "04:45 AM",
    endTime:   "12:15 PM",
    locked:    false,
  },
  {
    id: "t4",
    date: "23 Apr",
    location: "Vizhinjam zone",
    duration: "5h 00m",
    catchCount: 12,
    species: [
      { name: "Snapper", count: 7 },
      { name: "Grouper", count: 5 },
    ],
    score:     68,
    wind:      16,
    wave:      1.1,
    startTime: "05:30 AM",
    endTime:   "10:30 AM",
    locked:    true,
  },
];

// ── Trip card ──────────────────────────────────────────────────────────────────

type Trip = typeof MOCK_TRIPS[number];

// Adapt a persisted TripRecord to the card shape. Wind/wave aren't captured
// live yet (Milestone 1 data feeds) — shown as 0 until the real feed lands.
function recordToTrip(r: TripRecord): Trip {
  const ended   = new Date(r.endedAt);
  const started = new Date(r.startedAt);
  const today   = new Date();
  const isToday = ended.toDateString() === today.toDateString();
  const h = Math.floor(r.durationSec / 3600);
  const m = Math.floor((r.durationSec % 3600) / 60);
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return {
    id:         r.id,
    date:       isToday ? "Today" : ended.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    location:   `${r.zoneName} · ${harborLabel(r.harbor)}`,
    duration:   `${h}h ${String(m).padStart(2, "0")}m`,
    catchCount: r.catches.reduce((s, c) => s + c.count, 0),
    species:    r.catches.map((c) => ({ name: c.species, count: c.count })),
    score:      r.biteScore,
    wind:       0,
    wave:       0,
    startTime:  fmtTime(started),
    endTime:    fmtTime(ended),
    locked:     false,
  };
}

function TripCard({
  trip,
  index,
  onSelect,
  onUpgrade,
  isPro,
}: {
  trip:      Trip;
  index:     number;
  onSelect:  (t: Trip) => void;
  onUpgrade: () => void;
  isPro:     boolean;
}) {
  const band = getScoreBand(trip.score);
  const cfg  = scoreBandConfig[band];
  // trip.locked = "Pro-gated history"; unlocks once the user has Pro.
  const locked = trip.locked && !isPro;

  if (locked) {
    return (
      // wrapper clips the blur and the overlay to the same rounded corners
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 + index * 0.07, duration: 0.3 }}
        className="relative rounded-[16px] overflow-hidden"
      >
        {/* Blurred teaser — pointer events off so it can't be tapped */}
        <div
          className="p-4 bg-mt-surface border border-mt-border rounded-[16px] select-none pointer-events-none"
          style={{ filter: "blur(2px)", opacity: 0.4 }}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[13px] font-bold text-mt-ink">{trip.date}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-mt-dim" />
                <p className="text-[11px] text-mt-muted">{trip.location}</p>
              </div>
            </div>
            <span className={`font-mono text-[18px] font-black ${cfg.color}`}>{trip.score}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-mt-dim" />
              <p className="text-[11px] text-mt-muted">{trip.duration}</p>
            </div>
            <div className="flex items-center gap-1">
              <Fish className="w-3 h-3 text-mt-dim" />
              <p className="text-[11px] text-mt-muted">{trip.catchCount} fish</p>
            </div>
          </div>
        </div>

        {/* Lock overlay — tapping routes to upgrade */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={springs.snap}
          onClick={onUpgrade}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-mt-base/50 w-full"
        >
          <Lock className="w-4 h-4 text-mt-muted" />
          <p className="text-[11px] font-semibold text-mt-muted">Pro — unlock full history</p>
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.07, duration: 0.3 }}
    >
      <CardShell onTap={() => onSelect(trip)}>
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[13px] font-bold text-mt-ink">{trip.date}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-mt-dim" />
                <p className="text-[11px] text-mt-muted">{trip.location}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`font-mono text-[18px] font-black leading-none ${cfg.color}`}>
                {/* delayMs anchors to card visible: 0.08 + index*0.07 + 0.3×0.85 ≈ 0.335 + index*0.07s */}
                <CountUp target={trip.score} duration={700} delayMs={(0.335 + index * 0.07) * 1000} />
              </span>
              <span className={`text-[10px] font-semibold mt-0.5 ${cfg.color}`}>{cfg.label}</span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-mt-dim" />
              <p className="text-[11px] text-mt-muted">{trip.duration}</p>
            </div>
            <div className="flex items-center gap-1">
              <Fish className="w-3 h-3 text-mt-dim" />
              <p className="text-[11px] text-mt-muted">{trip.catchCount} fish</p>
            </div>
          </div>

          {/* Species pills — show species names only in the card */}
          <div className="flex gap-1.5 flex-wrap">
            {trip.species.map((sp) => (
              <span
                key={sp.name}
                className="px-2 py-0.5 rounded-full bg-mt-border text-mt-muted text-[10px] font-semibold"
              >
                {sp.name}
              </span>
            ))}
          </div>

          {/* Chevron hint */}
          <div className="flex justify-end mt-2">
            <ChevronRight className="w-3.5 h-3.5 text-mt-border" />
          </div>
        </div>
      </CardShell>
    </motion.div>
  );
}

// ── Trip detail sheet ──────────────────────────────────────────────────────────

function TripDetailSheet({
  trip,
  onClose,
  onToast,
  dragControls,
}: {
  trip:         Trip;
  onClose:      () => void;
  onToast:      (msg: string) => void;
  dragControls: ReturnType<typeof useDragControls>;
}) {
  const band     = getScoreBand(trip.score);
  const cfg      = scoreBandConfig[band];
  const arcColor = cfg.cssVar;
  const maxCount = Math.max(...trip.species.map((s) => s.count));

  return (
    <div className="px-5 pt-3 pb-8">
      {/* Drag handle — pointer-down here activates the sheet drag */}
      <div
        className="flex justify-center mb-5 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={(e) => dragControls.start(e)}
        style={{ touchAction: "none" }}
      >
        <motion.div
          className="h-1 rounded-full"
          style={{ width: 40, background: "var(--color-mt-border)" }}
          variants={{ dragging: { width: 52, backgroundColor: "var(--color-mt-subtle)" } }}
          transition={{ duration: 0.18 }}
        />
      </div>

      {/* Score hero — fades in just after sheet spring, matching ZoneDetailSheet pattern */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.28, ease: "easeOut" }}
        className="flex items-start gap-5 mb-5"
      >
        {/* Arc */}
        <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 84, height: 84 }}>
          <ProgressArc score={trip.score} color={arcColor} size={84} strokeWidth={7} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[20px] font-black leading-none" style={{ color: arcColor }}>
              <CountUp target={trip.score} duration={750} delayMs={300} />
            </p>
            <p className="text-[8px] font-semibold text-mt-dim uppercase tracking-wide mt-0.5">
              BiteScore
            </p>
          </div>
        </div>

        {/* Trip meta */}
        <div className="flex-1 pt-1">
          <p className="text-[17px] font-bold text-mt-ink leading-tight">
            {trip.date}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3 h-3 text-mt-dim" />
            <p className="text-[12px] text-mt-muted">{trip.location}</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-mt-dim" />
              <p className="text-[11px] text-mt-muted">{trip.duration}</p>
            </div>
            <p className="text-[11px] text-mt-dim">{trip.startTime} – {trip.endTime}</p>
          </div>
          <div className="mt-2">
            <Badge variant={band === "excellent" ? "aqua" : band === "good" ? "green" : band === "fair" ? "amber" : "neutral"}>
              {cfg.label}
            </Badge>
          </div>
        </div>
      </motion.div>

      <Divider className="mx-0 mb-4" />

      {/* Conditions row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { icon: <Fish className="w-3 h-3 text-mt-green" />,  label: "Catch", node: <CountUp target={trip.catchCount} duration={550} delayMs={(0.30 + 0.08 + 0 * 0.07) * 1000} />, sub: "fish total" },
          { icon: <Wind className="w-3 h-3 text-mt-aqua" />,  label: "Wind",  node: <><CountUp target={trip.wind}       duration={550} delayMs={(0.30 + 0.08 + 1 * 0.07) * 1000} />kt</>,            sub: "at sea"     },
          { icon: <Waves className="w-3 h-3 text-mt-teal" />, label: "Wave",  node: <>{trip.wave}m</>,                                                                                           sub: "height"     },
        ].map((cell, i) => (
          <motion.div
            key={cell.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.07, duration: 0.26, ease: "easeOut" }}
            className="bg-mt-base rounded-[12px] p-3 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1">
              {cell.icon}
              <p className="text-[9px] font-semibold uppercase tracking-wider text-mt-dim">{cell.label}</p>
            </div>
            <p className="text-[15px] font-bold text-mt-ink">{cell.node}</p>
            <p className="text-[9px] text-mt-dim">{cell.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Species breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.28, ease: "easeOut" }}
        className="mb-5"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim mb-3">
          Species caught
        </p>
        <div className="flex flex-col gap-3">
          {trip.species.map((sp, i) => {
            const pct = Math.round((sp.count / maxCount) * 100);
            return (
              <div key={sp.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[13px] font-semibold text-mt-ink">{sp.name}</p>
                  <p className="text-[12px] font-mono font-bold text-mt-green">
                    {/* delayMs anchors to parent visible time: 0.28 + 0.28*0.85 ≈ 0.52s */}
                    <CountUp target={sp.count} duration={500} delayMs={(0.52 + i * 0.08) * 1000} /> fish
                  </p>
                </div>
                <div className="h-1.5 bg-mt-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-mt-green"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.55, delay: 0.52 + i * 0.08, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: 0.28, ease: "easeOut" }}
      >
        <PrimaryButton onClick={() => { onToast(`Returning to ${trip.location}…`); onClose(); }}>
          <Navigation className="w-4 h-4" />
          Repeat this zone
        </PrimaryButton>
      </motion.div>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

/** Mirrors the stats strip + trip list so there's no layout shift on reveal. */
function TripLogSkeleton() {
  return (
    <>
      {/* Lifetime stats strip */}
      <div className="mx-5 mt-2 bg-mt-surface border border-mt-border rounded-[20px] px-2 py-4">
        <div className="flex items-center justify-around">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <SkeletonBlock className="w-9 h-9 rounded-[10px]" />
              <SkeletonBlock className="h-2 w-8" />
              <SkeletonBlock className="h-3.5 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent trips */}
      <div className="mt-5">
        <div className="px-5">
          <SkeletonBlock className="h-2.5 w-24" />
        </div>
        <div className="flex flex-col gap-3 mt-3 px-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-mt-surface border border-mt-border rounded-[20px] p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col gap-2">
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="h-2.5 w-28" />
                </div>
                <SkeletonBlock className="h-5 w-10" />
              </div>
              <div className="flex gap-4 mb-3">
                <SkeletonBlock className="h-2.5 w-14" />
                <SkeletonBlock className="h-2.5 w-14" />
              </div>
              <div className="flex gap-1.5">
                <SkeletonBlock className="h-4 w-16 rounded-full" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function TripLog({
  onStartTrip,
  onUpgrade,
  onToast,
  isPro = false,
  trips = [],
}: {
  onStartTrip: () => void;
  onUpgrade:   () => void;
  onToast:     (msg: string) => void;
  isPro?:      boolean;
  /** Persisted trips (newest first) — rendered above the sample history. */
  trips?:      TripRecord[];
}) {
  const { t } = useT();
  // Real logged trips first, then the seeded sample history beneath.
  const allTrips: Trip[] = [...trips.map(recordToTrip), ...MOCK_TRIPS];
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const dragControls = useDragControls();

  // Data-load simulation — in production `loaded` is driven by real fetch state.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 650);
    return () => clearTimeout(id);
  }, []);

  // Dismiss the detail sheet on Escape.
  useEscapeKey(() => setSelectedTrip(null), !!selectedTrip);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4 scrollbar-none">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="flex items-center justify-between px-5 pt-5 pb-2"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim">
              Your history
            </p>
            <h1 className="text-[22px] font-bold text-mt-ink leading-tight mt-0.5">{t("screen.tripLog")}</h1>
          </div>
          {/* Ghost "New Trip" — for when the user is already on this tab */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={springs.snap}
            onClick={onStartTrip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mt-aqua/10 border border-mt-aqua/25 text-mt-aqua text-[12px] font-semibold"
          >
            <Anchor className="w-3 h-3" />
            New Trip
          </motion.button>
        </motion.div>

        <AnimatePresence mode="wait">
        {!loaded ? (
          <motion.div key="tl-skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <TripLogSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="tl-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
          >

        {/* Lifetime stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.28, ease: "easeOut" }}
        >
        <CardShell className="mx-5 mt-2">
          <div className="flex items-center justify-around px-2 py-4">
            {MOCK_STATS.map((s, i) => (
              <AnimStatCell
                key={s.label}
                icon={s.icon}
                label={s.label}
                target={s.target}
                unit={s.unit}
                iconClass={s.iconClass}
                bgClass={s.bgClass}
                duration={650 + i * 80}
                index={i}
              />
            ))}
          </div>
        </CardShell>
        </motion.div>

        {/* Trip list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3, ease: "easeOut" }}
          className="mt-5"
        >
          <SectionLabel>Recent Trips</SectionLabel>
          <div className="flex flex-col gap-3 mt-3 px-5">
            {allTrips.map((trip, i) => (
              <TripCard
                key={trip.id}
                trip={trip}
                index={i}
                onSelect={setSelectedTrip}
                onUpgrade={onUpgrade}
                isPro={isPro}
              />
            ))}
          </div>
        </motion.div>

        {/* Pro upgrade nudge — hidden for Pro/trial users (nothing to unlock) */}
        {!isPro && (
        <div className="mx-5 mt-3 mb-4">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            transition={{
              opacity: { delay: 0.28, duration: 0.28, ease: "easeOut" },
              y:       { delay: 0.28, duration: 0.28, ease: "easeOut" },
              scale:   springs.snap,
            }}
            onClick={onUpgrade}
            className="w-full flex items-center gap-3 p-4 bg-mt-aqua/5 border border-dashed border-mt-aqua/25 rounded-[16px]"
          >

            <Star className="w-4 h-4 text-mt-aqua flex-shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold text-mt-ink">Unlock 90-day history</p>
              <p className="text-[11px] text-mt-muted mt-0.5">+more trips · Export CSV · Pro feature</p>
            </div>
            <ChevronRight className="w-4 h-4 text-mt-aqua flex-shrink-0" />
          </motion.button>
        </div>
        )}

          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Trip detail sheet — slides up from bottom */}
      <AnimatePresence>
        {selectedTrip && (
          <>
            {/* Dimmed backdrop */}
            <motion.div
              key="trip-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-10 bg-mt-base/70"
              onClick={() => setSelectedTrip(null)}
            />

            {/* Sheet */}
            <motion.div
              key="trip-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={`Trip details: ${selectedTrip.date} · ${selectedTrip.location}`}
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%", transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: "spring", stiffness: 300, damping: 34 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) {
                  setSelectedTrip(null);
                }
              }}
              whileDrag="dragging"
              className="absolute bottom-0 left-0 right-0 z-20 bg-mt-bg border-t border-mt-border rounded-t-[24px] overflow-hidden"
              style={{ boxShadow: "0 -16px 48px rgba(0,0,0,0.55)" }}
            >
              <TripDetailSheet
                trip={selectedTrip}
                onClose={() => setSelectedTrip(null)}
                onToast={onToast}
                dragControls={dragControls}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TripLog;
