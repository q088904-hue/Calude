"use client";

/**
 * AIAdvisory — MeenTrack V2
 * Full-screen slide-up overlay. Shows Claude AI's detailed reasoning:
 * confidence breakdown bars, species probabilities, time windows, data sources.
 * Opened from the HomeDashboard "AI Recommendation → Details" action.
 */

import { motion } from "framer-motion";
import { X, Zap, MapPin, Clock, Fish } from "lucide-react";
import { ProgressArc, Badge, Divider, PrimaryButton, CountUp, useCountUp } from "../shared/Atoms";
import { springs } from "../tokens";

// ── Mock data ───────────────────────────────────────────────────────────────────

const ADVISORY = {
  zone:        "Lakshadweep Basin",
  coordinates: "9.2°N, 74.8°E",
  score:        87,
  color:       "var(--color-mt-aqua)",
  headline:    "Optimal 5–9 AM window. Yellowfin & Seer running strong.",
  confidence:   87,
  updated:     "2 min ago",
};

const CONFIDENCE_FACTORS = [
  { label: "PFZ satellite match", value: 91, color: "var(--color-mt-aqua)"  },
  { label: "Tidal alignment",     value: 88, color: "var(--color-mt-green)" },
  { label: "Moon phase",          value: 82, color: "var(--color-mt-muted)" },
  { label: "Historical patterns", value: 85, color: "var(--color-mt-green)" },
  { label: "Wind conditions",     value: 75, color: "var(--color-mt-amber)" },
  { label: "Wave height",         value: 70, color: "var(--color-mt-amber)" },
];

const SPECIES = [
  { name: "Yellowfin Tuna", prob: 84, color: "var(--color-mt-aqua)"  },
  { name: "Seer Fish",      prob: 76, color: "var(--color-mt-green)" },
  { name: "King Fish",      prob: 61, color: "var(--color-mt-muted)" },
  { name: "Barracuda",      prob: 49, color: "var(--color-mt-muted)" },
];

// bgClass / textClass / badgeBgClass: Tailwind opacity modifiers replace hex+alpha strings.
// 0x18 ≈ 9.4% → /10; 0x20 = 12.5% → /[13] (closer than /10 or /15)
const TIME_WINDOWS = [
  { slot: "5–9 AM",   label: "Excellent", textClass: "text-mt-green", bgClass: "bg-mt-green/10", badgeBgClass: "bg-mt-green/[13]" },
  { slot: "9–12 PM",  label: "Good",      textClass: "text-mt-amber", bgClass: "bg-mt-amber/10", badgeBgClass: "bg-mt-amber/[13]" },
  { slot: "12–6 PM",  label: "Poor",      textClass: "text-mt-red",   bgClass: "bg-mt-red/10",   badgeBgClass: "bg-mt-red/[13]"   },
];

const DATA_SOURCES = [
  "INCOIS PFZ Bulletin · Today",
  "IMD Coastal Marine Forecast",
  "ISRO OSCAT Wind Data",
  "Historical catch logs · 90 days",
];

// ── Section card with staggered entrance ────────────────────────────────────────

/**
 * Each card inside AIAdvisory staggered in while the spring overlay is still
 * arriving — gives a cascade feel rather than a static content dump.
 * Base delay 0.18s lets the overlay travel ~40% before cards start appearing.
 */
function SectionCard({
  children,
  index,
  className = "",
}: {
  children: React.ReactNode;
  index:    number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 + index * 0.08, duration: 0.32, ease: "easeOut" }}
      className={`bg-mt-surface border border-mt-border rounded-[20px] p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ── Bar component ───────────────────────────────────────────────────────────────

/**
 * `delay` is the bar-specific stagger offset (seconds).
 * `cardDelay` is the parent SectionCard's *visible* time in seconds:
 *   cardDelay = SectionCard delay + SectionCard duration × 0.85
 * Both are added so the bar fill and count-up start only once the card
 * is on-screen at ~85% opacity, not before it even appears.
 */
function FactorBar({
  label,
  value,
  color,
  delay     = 0,
  cardDelay = 0,
}: {
  label:      string;
  value:      number;
  color:      string;
  delay?:     number;
  cardDelay?: number;
}) {
  const totalDelay   = cardDelay + delay;      // seconds for motion
  const totalDelayMs = totalDelay * 1000;      // ms for CountUp
  const count        = useCountUp(value, 620, totalDelayMs);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[12px] text-mt-muted">{label}</p>
        <p className="text-[12px] font-mono font-bold" style={{ color }}>{count}%</p>
      </div>
      <div className="h-1.5 bg-mt-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.65, delay: totalDelay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function AIAdvisory({
  onClose,
  onToast,
}: {
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header — fades in after overlay starts arriving */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25, ease: "easeOut" }}
        className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-aqua">
            Claude AI Advisory
          </p>
          <h2 className="text-[20px] font-bold text-mt-ink leading-tight mt-0.5">
            Confidence Breakdown
          </h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={springs.snap}
          onClick={onClose}
          aria-label="Close advisory"
          className="w-9 h-9 rounded-full bg-mt-border flex items-center justify-center"
        >
          <X className="w-4 h-4 text-mt-muted" />
        </motion.button>
      </motion.div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-5 pb-8 space-y-5">

        {/* Zone + score hero */}
        <SectionCard index={0}>
          <div className="flex items-start gap-5">
            {/* Arc */}
            <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 88, height: 88 }}>
              <ProgressArc score={ADVISORY.score} color={ADVISORY.color} size={88} strokeWidth={7} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[22px] font-black leading-none" style={{ color: ADVISORY.color }}>
                  {/* delayMs 450 ≈ SectionCard index=0 visible time: 180 + 320*0.85 */}
                  <CountUp target={ADVISORY.score} duration={700} delayMs={450} />
                </p>
                <p className="text-[9px] font-semibold text-mt-dim uppercase tracking-wide">Score</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="aqua">PFZ Active</Badge>
              </div>
              <p className="text-[15px] font-bold text-mt-ink leading-snug mb-1">
                {ADVISORY.zone}
              </p>
              <div className="flex items-center gap-1.5 mb-0.5">
                <MapPin className="w-3 h-3 text-mt-dim" />
                <p className="text-[11px] text-mt-dim font-mono">{ADVISORY.coordinates}</p>
              </div>
              <p className="text-[11px] text-mt-dim">Updated {ADVISORY.updated}</p>
            </div>
          </div>

          <Divider className="mt-4 mb-3 mx-0" />
          <p className="text-[13px] text-mt-muted leading-relaxed">
            {ADVISORY.headline}
          </p>
        </SectionCard>

        {/* Confidence factors */}
        <SectionCard index={1}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-mt-aqua" />
            <p className="text-[13px] font-bold text-mt-ink">Confidence factors</p>
            <span className="ml-auto text-[12px] font-mono font-bold text-mt-aqua">
              {/* delayMs 530 ≈ SectionCard index=1 visible time: 260 + 320*0.85 */}
              <CountUp target={ADVISORY.confidence} duration={700} delayMs={530} />%
            </span>
          </div>
          <div className="flex flex-col gap-3.5">
            {/* cardDelay anchors to card visible time: delay 0.26 + dur 0.32×0.85 ≈ 0.532s */}
            {CONFIDENCE_FACTORS.map((f, i) => (
              <FactorBar key={f.label} label={f.label} value={f.value} color={f.color} delay={i * 0.07} cardDelay={0.53} />
            ))}
          </div>
        </SectionCard>

        {/* Species probability */}
        <SectionCard index={2}>
          <div className="flex items-center gap-2 mb-4">
            <Fish className="w-4 h-4 text-mt-green" />
            <p className="text-[13px] font-bold text-mt-ink">Species probability</p>
          </div>
          <div className="flex flex-col gap-3.5">
            {/* cardDelay anchors to card visible time: delay 0.34 + dur 0.32×0.85 ≈ 0.612s */}
            {SPECIES.map((sp, i) => (
              <FactorBar key={sp.name} label={sp.name} value={sp.prob} color={sp.color} delay={i * 0.07} cardDelay={0.61} />
            ))}
          </div>
        </SectionCard>

        {/* Time windows */}
        <SectionCard index={3}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-mt-amber" />
            <p className="text-[13px] font-bold text-mt-ink">Bite windows — today</p>
          </div>
          <div className="flex flex-col gap-2">
            {TIME_WINDOWS.map((w, i) => (
              <motion.div
                key={w.slot}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.74 + i * 0.07, duration: 0.24, ease: "easeOut" }}
                className={`flex items-center justify-between px-4 py-3 rounded-[12px] ${w.bgClass}`}
              >
                <div>
                  <p className="text-[13px] font-semibold text-mt-ink">{w.slot}</p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${w.textClass} ${w.badgeBgClass}`}>
                  {w.label}
                </span>
              </motion.div>
            ))}
          </div>
        </SectionCard>

        {/* Data sources */}
        <SectionCard index={4}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mt-dim mb-3">
            Data sources
          </p>
          <div className="flex flex-col gap-2">
            {DATA_SOURCES.map((src, i) => (
              <motion.div
                key={src}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.82 + i * 0.06, duration: 0.22, ease: "easeOut" }}
                className="flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-mt-border flex-shrink-0" />
                <p className="text-[12px] text-mt-muted">{src}</p>
              </motion.div>
            ))}
          </div>
        </SectionCard>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 + 5 * 0.08, duration: 0.32, ease: "easeOut" }}
        >
          <PrimaryButton onClick={() => { onToast("Navigating to zone — open in maps app"); onClose(); }}>
            <MapPin className="w-4 h-4" />
            Navigate to zone
          </PrimaryButton>
        </motion.div>
      </div>
    </div>
  );
}

export default AIAdvisory;
