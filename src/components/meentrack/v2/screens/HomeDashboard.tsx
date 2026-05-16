"use client";

/**
 * HomeDashboard — MeenTrack V2  (UX fixes applied)
 *
 * Fixes in this revision:
 *  #3  Start trip moved OUT of BiteTime card → standalone primary action
 *  #4  Redundant "Safe to fish" removed from top bar (SeaStatusBanner owns that)
 *  #5  "Best window" now shows "Next window: 5–9 AM" (context-accurate)
 *  #6  Harbor carousel gets a right-fade gradient hint for scroll affordance
 *  #2  Card gradient divs get rounded-[20px] overflow-hidden so corners clip clean
 *      without the parent CardShell having overflow-hidden (which clipped SVG arcs)
 */

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Wind, Waves, Thermometer, Eye, Bell, Anchor,
  ChevronRight, Star, TrendingUp, Zap, ArrowRight, Clock
} from "lucide-react";
import {
  SectionLabel, CardShell, Badge,
  ProgressArc, PrimaryButton, CountUp, useCountUp, SkeletonBlock
} from "../shared/Atoms";
import { gradients, getScoreBand, scoreBandConfig, springs } from "../tokens";
import { harborLabel } from "../constants";
import { useT } from "@/lib/meentrack/i18n";
import { AIAdvisory } from "./AIAdvisory";
import { useEscapeKey } from "../shared/hooks";

/**
 * Matches the BiteTimeHero layout exactly so there's no layout shift on reveal.
 * Arc placeholder is a full circle (not an arc SVG) — simpler and fast enough.
 */
function BiteTimeHeroSkeleton() {
  return (
    <div className="mx-5 mt-3 bg-mt-surface border border-mt-border rounded-[20px] px-6 pt-7 pb-5">
      {/* Label row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-2.5 w-[90px]" />
          <SkeletonBlock className="h-2 w-[110px]" />
        </div>
        <SkeletonBlock className="h-5 w-10 rounded-full" />
      </div>

      {/* Arc + breakdown row */}
      <div className="flex items-center gap-5">
        {/* Arc placeholder: full circle */}
        <SkeletonBlock className="flex-shrink-0 w-[130px] h-[130px] rounded-full" />

        {/* Right column */}
        <div className="flex-1 flex flex-col gap-3">
          <SkeletonBlock className="h-6 w-20" />
          <SkeletonBlock className="h-3 w-28 rounded-full" />

          {/* Three mini bars — staggered widths via Tailwind fractions */}
          {(["w-4/5", "w-2/3", "w-1/2"] as const).map((wCls, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonBlock className="h-2 w-7" />
              <SkeletonBlock className={`h-1 rounded-full ${wCls}`} />
              <SkeletonBlock className="h-2 w-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Matches the QuickStats row layout. */
function QuickStatsSkeleton() {
  return (
    <div className="mx-5 mt-3 bg-mt-surface border border-mt-border rounded-[20px] px-2 py-5">
      <div className="flex items-center justify-around">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <SkeletonBlock className="w-9 h-9 rounded-[10px]" />
            <SkeletonBlock className="h-2 w-8" />
            <SkeletonBlock className="h-3.5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_SCORE = 78;
const MOCK_DATE  = new Date().toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "short",
});

const QUICK_STATS = [
  { icon: <Wind className="w-4 h-4" />,        label: "Wind",  value: "12",  numTarget: 12,        unit: "kt",  iconClass: "text-mt-aqua",  bgClass: "bg-mt-aqua/10"  },
  { icon: <Waves className="w-4 h-4" />,       label: "Wave",  value: "0.8", numTarget: undefined, unit: "m",   iconClass: "text-mt-teal",  bgClass: "bg-mt-teal/10"  },
  { icon: <Thermometer className="w-4 h-4" />, label: "Sea",   value: "27",  numTarget: 27,        unit: "°C",  iconClass: "text-mt-green", bgClass: "bg-mt-green/10" },
  { icon: <Eye className="w-4 h-4" />,         label: "Vis",   value: "12",  numTarget: 12,        unit: "km",  iconClass: "text-mt-amber", bgClass: "bg-mt-amber/10" },
];

const HARBORS = [
  { slug: "vizhinjam",   name: "Vizhinjam",   score: 91, state: "KL", dist: "120 nm" },
  { slug: "kochi",       name: "Kochi",       score: 78, state: "KL", dist: "0 nm"   },
  { slug: "neendakara",  name: "Neendakara",  score: 62, state: "KL", dist: "85 nm"  },
  { slug: "kanyakumari", name: "Kanyakumari", score: 55, state: "TN", dist: "140 nm" },
  { slug: "thoothukudi", name: "Thoothukudi", score: 44, state: "TN", dist: "210 nm" },
];

const AI_REC = {
  headline:   "Head south-west 12 nm",
  detail:     "Strong PFZ overlap detected. New moon + falling tide window opens 5–9 AM. Seer + yellowfin likely.",
  species:    ["Seer", "Yellowfin", "Mackerel"],
  confidence: 87,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "home.greeting.morning";
  if (h < 17) return "home.greeting.afternoon";
  return "home.greeting.evening";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TopBar({
  onNotify,
  hasUnread,
  harbor,
}: {
  onNotify:  () => void;
  hasUnread: boolean;
  harbor:    string;
}) {
  const { t } = useT();
  const port = harborLabel(harbor);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex items-center justify-between px-5 pt-5 pb-2"
    >
      <div>
        {/* Fix #4: date label only — sea status lives in SeaStatusBanner, not here */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim">
          {port} · {MOCK_DATE}
        </p>
        <h1 className="text-[22px] font-bold text-mt-ink leading-tight mt-0.5">
          {t(greetingKey())}, {t("home.captain")}
        </h1>
      </div>
      {/* Notification bell — red dot when there are unread alerts */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        transition={springs.snap}
        onClick={onNotify}
        aria-label={hasUnread ? "Open notifications (unread alerts)" : "Open notifications"}
        className="relative w-10 h-10 rounded-full bg-mt-surface border border-mt-border flex items-center justify-center"
      >
        <Bell className="w-4 h-4 text-mt-muted" />
        <AnimatePresence>
          {hasUnread && (
            <motion.span
              key="unread-dot"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={springs.snap}
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-mt-red border border-mt-bg"
            />
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

function StartTripButton({
  onStartTrip,
  tripStartTime,
}: {
  onStartTrip:   () => void;
  tripStartTime: Date | null;
}) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    // Both branches defer setState off the synchronous effect body via rAF
    // so neither triggers a cascading render (react-hooks/set-state-in-effect).
    if (!tripStartTime) {
      const raf = requestAnimationFrame(() => setElapsed(""));
      return () => cancelAnimationFrame(raf);
    }
    const tick = () => {
      const secs = Math.floor((Date.now() - tripStartTime.getTime()) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed([h, m, s].map((n) => String(n).padStart(2, "0")).join(":"));
    };
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(id); };
  }, [tripStartTime]);

  // ── AnimatePresence cross-fades the two button states (mode="wait" so the
  //    exiting button fully disappears before the entering one slides in).
  return (
    <div className="px-5 mt-4">
      <AnimatePresence mode="wait" initial={false}>
        {tripStartTime ? (
          // Active trip: ghost button with pulsing dot + live elapsed
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={springs.snap}
              onClick={onStartTrip}
              className="w-full min-h-[52px] rounded-[14px] bg-mt-aqua/10 border border-mt-aqua/30 text-mt-aqua font-bold text-[15px] flex items-center justify-center gap-3"
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mt-aqua opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-mt-aqua" />
              </span>
              Return to trip
              <span className="font-mono text-[14px] opacity-75">{elapsed}</span>
            </motion.button>
          </motion.div>
        ) : (
          // Default: solid aqua primary CTA
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <PrimaryButton onClick={onStartTrip}>
              <Anchor className="w-4 h-4" />
              Start trip
            </PrimaryButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BiteTimeHero({ score }: { score: number }) {
  const band         = getScoreBand(score);
  const cfg          = scoreBandConfig[band];
  const arcColor     = cfg.cssVar;
  // delayMs=280 matches the skeleton→content fade-in so the count starts
  // only once the card is fully visible, not while it's still opacity-0.
  const countedScore = useCountUp(score, 900, 280);

  return (
    <CardShell className="mx-5 mt-3" glow={band === "excellent" || band === "good"}>
      {/*
        Fix #2: overflow-hidden applied HERE on the inner div (not on CardShell),
        so the gradient clips to rounded corners without cutting the SVG arc strokes.
      */}
      <div
        className="px-6 pt-7 pb-5 rounded-[20px]"
        style={{
          background: gradients.heroCard,
          overflow: "hidden",
        }}
      >
        {/* Label row — px-6 gives 4px more room than px-5, avoiding the corner-radius clip zone */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mt-dim">
              BiteTime™ Score
            </p>
            <p className="text-[12px] text-mt-muted mt-0.5">Today · INCOIS + IMD</p>
          </div>
          <motion.span
            animate={{ opacity: [1, 0.55, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Badge variant={band === "excellent" || band === "good" ? "green" : band === "fair" ? "amber" : "neutral"}>
              Live
            </Badge>
          </motion.span>
        </div>

        {/* Arc + breakdown row */}
        <div className="flex items-center gap-5">
          {/* Arc — SVG now uses overflow="visible" so leftmost stroke isn't clipped */}
          <div className="relative flex-shrink-0 w-[130px] h-[130px]">
            <ProgressArc score={score} color={arcColor} size={130} strokeWidth={9} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono text-[38px] font-black leading-none tabular-nums ${cfg.color}`}>
                {countedScore}
              </span>
              <span className="text-[10px] text-mt-dim font-medium tracking-wide">/ 100</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="flex-1 flex flex-col gap-3">
            <div>
              <p className={`text-[22px] font-black leading-tight ${cfg.color}`}>{cfg.label}</p>
              {/* Fix #5: accurate time reference instead of stale "today" window */}
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-mt-dim" />
                <p className="text-[11px] text-mt-muted leading-snug whitespace-nowrap">
                  Next window: 5–9 AM
                </p>
              </div>
            </div>

            {[
              { label: "PFZ",  val: 88 },
              { label: "Tide", val: 72 },
              { label: "Wind", val: 65 },
            ].map(({ label, val }, i) => (
              <div key={label} className="flex items-center gap-2">
                <p className="text-[10px] text-mt-dim w-7">{label}</p>
                <div className="flex-1 h-1 bg-mt-border rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${cfg.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.24 + i * 0.08 }}
                    style={{ opacity: 0.7 + val / 300 }}
                  />
                </div>
                <p className="text-[10px] font-mono text-mt-muted w-6 text-right">
                  {/* delayMs anchors to content-fade visible time: dur 0.28×0.85 ≈ 0.238s */}
                  <CountUp target={val} duration={650} delayMs={(0.24 + i * 0.08) * 1000} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function QuickStats() {
  return (
    <CardShell className="mx-5 mt-3">
      <div className="flex items-center justify-around px-2 py-5">
        {QUICK_STATS.map((s, i) => {
          // delayMs anchors to cell visible time: content-fade (0.28×0.85=0.238s) is done
          // before cells appear; cell itself adds delay 0.08+i*0.06 + dur 0.26×0.85 ≈ 0.30+i*0.06s
          const delayMs = (0.30 + i * 0.06) * 1000;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.26, ease: "easeOut" }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${s.bgClass}`}>
                <span className={s.iconClass}>{s.icon}</span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-mt-dim">
                {s.label}
              </p>
              <p className="text-[14px] font-bold text-mt-ink leading-none">
                {s.numTarget !== undefined
                  ? <CountUp target={s.numTarget} duration={600} delayMs={delayMs} />
                  : s.value}
                {s.unit && (
                  <span className="text-[10px] font-medium text-mt-muted ml-0.5">{s.unit}</span>
                )}
              </p>
            </motion.div>
          );
        })}
      </div>
    </CardShell>
  );
}

function AIRecommendation({
  onToast,
  onDetails,
  species,
}: {
  onToast:   (msg: string) => void;
  onDetails: () => void;
  species:   string[];
}) {
  // Use the user's onboarding species when available, fall back to defaults
  const displaySpecies = species.length > 0
    ? species.slice(0, 4)          // show up to 4 so the pill row doesn't overflow
    : AI_REC.species;

  return (
    <div className="mt-5">
      <SectionLabel action="Details" onAction={onDetails}>
        AI Recommendation
      </SectionLabel>
      <CardShell className="mx-5 mt-3" glow>
        <div
          className="p-5 rounded-[20px]"
          style={{ background: "linear-gradient(135deg, var(--color-mt-surface) 0%, var(--color-mt-deep) 100%)", overflow: "hidden" }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-3.5 h-3.5 text-mt-aqua" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-aqua">
                  Claude AI · <CountUp target={AI_REC.confidence} duration={600} delayMs={280} />% confidence
                </p>
              </div>
              <h2 className="text-[18px] font-bold text-mt-ink leading-snug">
                {AI_REC.headline}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-mt-aqua/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-mt-aqua" />
            </div>
          </div>

          <p className="text-[13px] text-mt-muted leading-relaxed mb-3">{AI_REC.detail}</p>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            {displaySpecies.map((sp, i) => (
              <motion.span
                key={sp}
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.30 + i * 0.05, duration: 0.22, ease: "easeOut" }}
                className="px-2.5 py-1 rounded-full bg-mt-aqua/10 text-mt-aqua text-[11px] font-semibold border border-mt-aqua/20"
              >
                {sp}
              </motion.span>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={springs.snap}
            onClick={() => onToast("Opening in map — Pro feature")}
            className="w-full flex items-center justify-between py-3 border-t border-mt-border"
          >
            <span className="text-[13px] font-semibold text-mt-ink">View on map</span>
            <ArrowRight className="w-4 h-4 text-mt-aqua" />
          </motion.button>
        </div>
      </CardShell>
    </div>
  );
}

// Extracted so useCountUp can be called at component top level (not inside .map())
function HarborCard({
  h,
  index,
  isHome,
}: {
  h:      typeof HARBORS[0];
  index:  number;
  isHome: boolean;
}) {
  const band         = getScoreBand(h.score);
  const cfg          = scoreBandConfig[band];
  // delayMs anchors to the card's visible time: (0.08 + index*0.06) + 0.3*0.85 ≈ 0.34 + index*0.06s.
  // Bar uses the same delay so both start growing at the same moment the card reaches full opacity.
  const countedScore = useCountUp(h.score, 600 + index * 60, 340 + index * 60);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08 + index * 0.06, duration: 0.3 }}
      className={`snap-start flex-shrink-0 w-[148px] rounded-[16px] p-4 border ${
        isHome
          ? "bg-mt-aqua/5 border-mt-aqua/25"
          : "bg-mt-surface border-mt-border"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        {isHome ? (
          <span className="text-[9px] font-bold uppercase tracking-wider text-mt-aqua">
            Home port
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-mt-dim">
            {h.state}
          </span>
        )}
        <span className={`text-[10px] font-semibold ${cfg.color}`}>#{index + 1}</span>
      </div>

      {/* truncate prevents long names overflowing the fixed card width */}
      <p className="text-[14px] font-bold text-mt-ink leading-tight mb-1 truncate">
        {h.name}
      </p>
      <p className="text-[11px] text-mt-dim mb-3">{h.dist}</p>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-mt-border rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isHome ? "bg-mt-aqua" : cfg.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${h.score}%` }}
            transition={{ duration: 0.55, delay: 0.34 + index * 0.06, ease: "easeOut" }}
          />
        </div>
        <span className={`font-mono text-[13px] font-bold ${isHome ? "text-mt-aqua" : cfg.color}`}>
          {countedScore}
        </span>
      </div>
    </motion.div>
  );
}

function HarborScroll({ onUnlock, onToast, harbor, isPro }: { onUnlock: () => void; onToast: (msg: string) => void; harbor: string; isPro: boolean }) {
  const port = harborLabel(harbor);

  // Float the user's home harbor to the front; leave the rest in score order
  const sorted = harbor
    ? [...HARBORS].sort((a, b) =>
        a.slug === harbor ? -1 : b.slug === harbor ? 1 : 0
      )
    : HARBORS;

  return (
    <div className="mt-5">
      <SectionLabel action="All harbors" onAction={() => onToast("Full harbor map — see Hotspots tab")}>
        Near {port} · Today
      </SectionLabel>

      {/* Fix #6: wrapper is relative so the right-fade gradient sits over the scroll */}
      <div className="relative mt-3">
        <div className="flex gap-3 px-5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
          {sorted.map((h, i) => (
            <HarborCard
              key={h.slug}
              h={h}
              index={i}
              isHome={h.slug === harbor}
            />
          ))}

          {/* Unlock 48h card — only for non-Pro users */}
          {!isPro && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.96 }}
              transition={{
                opacity: { delay: 0.4, duration: 0.3 },           // entrance fade
                scale:   springs.snap, // tap spring
              }}
              onClick={onUnlock}
              className="snap-start flex-shrink-0 w-[148px] bg-mt-aqua/5 border border-dashed border-mt-aqua/30 rounded-[16px] p-4 flex flex-col items-center justify-center gap-2"
            >
              <Star className="w-5 h-5 text-mt-aqua" />
              <p className="text-[12px] font-semibold text-mt-aqua text-center leading-snug">
                Unlock 48h forecast
              </p>
              <p className="text-[10px] text-mt-muted text-center">Pro feature</p>
            </motion.button>
          )}
        </div>

        {/* Right-fade gradient: scroll affordance hint */}
        <div
          className="pointer-events-none absolute top-0 right-0 bottom-2 w-12"
          style={{ background: gradients.scrollFade }}
        />
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function HomeDashboard({
  onUpgrade,
  onStartTrip,
  onNotify,
  onToast,
  tripStartTime,
  hasUnread,
  harbor  = "",
  species = [],
  isPro   = false,
}: {
  onUpgrade:     () => void;
  onStartTrip:   () => void;
  onNotify:      () => void;
  onToast:       (msg: string) => void;
  tripStartTime: Date | null;
  hasUnread:     boolean;
  harbor?:       string;
  species?:      string[];
  isPro?:        boolean;
}) {
  const [showAdvisory, setShowAdvisory] = useState(false);

  // Dismiss the AI Advisory overlay on Escape.
  useEscapeKey(() => setShowAdvisory(false), showAdvisory);

  // ── Data-load simulation ─────────────────────────────────────────────────────
  // In production, `loaded` would be driven by a real fetch state.
  const [loaded,     setLoaded]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 700);
    return () => clearTimeout(id);
  }, []);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────────
  const scrollRef    = useRef<HTMLDivElement>(null);
  const touchStartY  = useRef(0);
  const pullY        = useMotionValue(0);                           // raw pull distance (px)
  const clampedPull  = useTransform(pullY, (v) => Math.max(0, v)); // never negative
  // Indicator height: grows 0→48px over first 80px of pull
  const indicatorH   = useTransform(clampedPull, [0, 80], [0, 48]);
  // Spinner/arrow opacity + scale: ramp in over 20→60px of pull
  const indicatorOp  = useTransform(clampedPull, [20, 60], [0, 1]);
  const indicatorSc  = useTransform(clampedPull, [20, 70], [0.5, 1]);

  const PULL_THRESHOLD = 62; // px at which release triggers a refresh

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    const el = scrollRef.current;
    // Only activate when scroll is already at the very top
    if (!el || el.scrollTop > 0) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) pullY.set(dy * 0.45); // dampen so the indicator lags the finger
  }

  async function onTouchEnd() {
    const pulled = pullY.get();
    animate(pullY, 0, { duration: 0.3, ease: "easeOut" });

    if (pulled >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setLoaded(false);
      await new Promise((r) => setTimeout(r, 820));
      setLoaded(true);
      setRefreshing(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-4 scrollbar-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-refresh indicator — height animates with pull distance */}
        <motion.div
          style={{ height: indicatorH, overflow: "hidden" }}
          className="flex items-center justify-center"
        >
          <motion.div style={{ opacity: indicatorOp, scale: indicatorSc }}>
            {/* AnimatePresence cross-fades the passive ring ↔ active spinner */}
            <AnimatePresence mode="wait" initial={false}>
              {refreshing ? (
                <motion.span
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  className="flex h-5 w-5 items-center justify-center"
                >
                  <span className="h-full w-full rounded-full border-2 border-mt-aqua border-t-transparent animate-spin block" />
                </motion.span>
              ) : (
                <motion.span
                  key="ring"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  className="flex h-5 w-5 items-center justify-center"
                >
                  <span className="h-full w-full rounded-full border-2 border-mt-dim border-t-mt-aqua block" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        <TopBar onNotify={onNotify} hasUnread={hasUnread} harbor={harbor} />

        {/* Fix #3: Start trip is the first thing after the greeting, not buried in a card */}
        {/* Entrance wrapper: delay 0.02s lets TopBar (dur 0.28s) lead by a beat */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.02, duration: 0.26, ease: "easeOut" }}
        >
          <StartTripButton onStartTrip={onStartTrip} tripStartTime={tripStartTime} />
        </motion.div>

        {/* BiteTimeHero + QuickStats swap skeleton → real content at 700ms */}
        <AnimatePresence mode="wait">
          {!loaded ? (
            <motion.div
              key="skeletons"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <BiteTimeHeroSkeleton />
              <QuickStatsSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.28 }}
            >
              <BiteTimeHero score={MOCK_SCORE} />
              <QuickStats />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.3, ease: "easeOut" }}
        >
          <AIRecommendation
            onToast={onToast}
            onDetails={() => (isPro ? setShowAdvisory(true) : onUpgrade())}
            species={species}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3, ease: "easeOut" }}
        >
          <HarborScroll onUnlock={onUpgrade} onToast={onToast} harbor={harbor} isPro={isPro} />
        </motion.div>

        {/* Upgrade nudge — hidden for Pro/trial users (nothing to unlock) */}
        {!isPro && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.3, ease: "easeOut" }}
          className="mx-5 mt-5 mb-6"
        >
          <CardShell onTap={onUpgrade}>
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-[12px] bg-mt-aqua/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-mt-aqua" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-mt-ink">Start 7-day free trial</p>
                <p className="text-[11px] text-mt-muted mt-0.5">
                  Unlock 48h BiteTime™, PFZ map, AI Advisor
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-mt-aqua flex-shrink-0" />
            </div>
          </CardShell>
        </motion.div>
        )}
      </div>

      {/* AI Advisory full-screen overlay — slides up from bottom */}
      <AnimatePresence>
        {showAdvisory && (
          <motion.div
            key="advisory"
            role="dialog"
            aria-modal="true"
            aria-label="AI Fishing Advisory"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%", transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="absolute inset-0 z-20 flex flex-col bg-mt-bg"
          >
            <AIAdvisory
              onClose={() => setShowAdvisory(false)}
              onToast={onToast}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HomeDashboard;
