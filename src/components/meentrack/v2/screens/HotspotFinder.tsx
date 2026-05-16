"use client";

/**
 * HotspotFinder — MeenTrack V2
 *
 * Design decisions:
 *  - Full-bleed map container (Open: full-bleed hero)
 *  - PFZ zone chips on the map (Revolut: inline data on cards)
 *  - Draggable bottom sheet with zone cards (GO Club: layered depth)
 *  - Confidence score bars + distance chips (Revolut: data hierarchy)
 *  - Filter chips row (Revolut: tabbed filter pattern)
 *  - Zone detail bottom sheet: slides up on zone select
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Search, SlidersHorizontal, Navigation, Layers,
  Fish, Waves, ChevronRight, MapPin, Lock,
  X, Wind, Clock, ArrowRight,
} from "lucide-react";
import { SectionLabel, CardShell, Badge, Chip, ProgressArc, PrimaryButton, CountUp, SkeletonBlock } from "../shared/Atoms";
import { getScoreBand, scoreBandConfig, springs } from "../tokens";
import { useEscapeKey } from "../shared/hooks";
import { useT } from "@/lib/meentrack/i18n";

// ── Mock data ──────────────────────────────────────────────────────────────────

const ZONES = [
  {
    id: "z1",
    name: "Vizhinjam Deep",
    score: 91,
    distance: "120 nm",
    species: ["Seer", "Yellowfin"],
    speciesProb: [87, 72],
    depth: "48–65 m",
    pfz: true,
    isLocked: false,
    mapX: "72%", mapY: "35%",
    tideWindow: "5–9 AM · Falling",
    windFit: 82,
    coordinates: "8°22′N  76°58′E",
  },
  {
    id: "z2",
    name: "Kochi Shelf",
    score: 78,
    distance: "12 nm",
    species: ["Mackerel", "Sardine"],
    speciesProb: [74, 68],
    depth: "30–45 m",
    pfz: true,
    isLocked: false,
    mapX: "38%", mapY: "22%",
    tideWindow: "6–10 AM · Rising",
    windFit: 75,
    coordinates: "9°57′N  76°14′E",
  },
  {
    id: "z3",
    name: "Kanyakumari Ridge",
    score: 55,
    distance: "140 nm",
    species: ["Tuna", "Barracuda"],
    speciesProb: [60, 45],
    depth: "80–120 m",
    pfz: false,
    isLocked: true,
    mapX: "85%", mapY: "62%",
    tideWindow: "4–8 AM · Falling",
    windFit: 55,
    coordinates: "8°05′N  77°33′E",
  },
  {
    id: "z4",
    name: "Neendakara Patch",
    score: 62,
    distance: "85 nm",
    species: ["Pomfret", "King Fish"],
    speciesProb: [65, 58],
    depth: "20–35 m",
    pfz: true,
    isLocked: false,
    mapX: "55%", mapY: "48%",
    tideWindow: "7–11 AM · Rising",
    windFit: 60,
    coordinates: "8°56′N  76°33′E",
  },
];

type Zone = typeof ZONES[number];

const FILTERS = ["All zones", "Near (<50 nm)", "PFZ only", "High score"];

// ── Zone detail bottom sheet ───────────────────────────────────────────────────

function ZoneDetailSheet({
  zone,
  onClose,
  onToast,
  dragControls,
}: {
  zone:         Zone;
  onClose:      () => void;
  onToast:      (msg: string) => void;
  dragControls: ReturnType<typeof useDragControls>;
}) {
  const band     = getScoreBand(zone.score);
  const cfg      = scoreBandConfig[band];
  const arcColor = cfg.cssVar;

  return (
    <div className="px-5 pt-3 pb-6">
      {/* Drag handle — pointer-down here activates the sheet drag */}
      <div
        className="flex justify-center mb-4 cursor-grab active:cursor-grabbing select-none"
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

      {/* Header: arc + name + badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.28, ease: "easeOut" }}
        className="flex items-center gap-4 mb-5"
      >
        <div className="relative flex-shrink-0 w-[72px] h-[72px]">
          <ProgressArc score={zone.score} color={arcColor} size={72} strokeWidth={5} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-[20px] font-black leading-none ${cfg.color}`}>
              {/* delayMs=320 anchors to header card visible time: delay 0.08s + dur 0.28×0.85 ≈ 0.318s */}
              <CountUp target={zone.score} duration={700} delayMs={320} />
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[18px] font-bold text-mt-ink leading-tight mb-1">{zone.name}</h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            {zone.pfz && <Badge variant="aqua">PFZ</Badge>}
            <span className="text-[11px] text-mt-muted">{zone.distance}</span>
            <span className="text-[11px] text-mt-dim">·</span>
            <span className="text-[11px] text-mt-dim font-mono">{zone.coordinates}</span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={springs.snap}
          onClick={onClose}
          aria-label="Close zone detail"
          className="w-8 h-8 rounded-full bg-mt-surface border border-mt-border flex items-center justify-center flex-shrink-0"
        >
          <X className="w-3.5 h-3.5 text-mt-muted" />
        </motion.button>
      </motion.div>

      {/* Species forecast */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.28, ease: "easeOut" }}
      >
      <CardShell className="mb-3">
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim mb-3">
            Species Forecast
          </p>
          {zone.species.map((sp, i) => (
            <div key={sp} className={`flex items-center gap-3 ${i > 0 ? "mt-2.5" : ""}`}>
              <div className="flex items-center gap-1.5 w-[88px]">
                <Fish className="w-3 h-3 text-mt-dim flex-shrink-0" />
                <span className="text-[12px] font-semibold text-mt-ink truncate">{sp}</span>
              </div>
              <div className="flex-1 h-1.5 bg-mt-border rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${cfg.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${zone.speciesProb[i]}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.40 + i * 0.08 }}
                />
              </div>
              <span className={`font-mono text-[12px] font-bold w-8 text-right ${cfg.color}`}>
                <CountUp target={zone.speciesProb[i]} duration={550} delayMs={400 + i * 80} />%
              </span>
            </div>
          ))}
        </div>
      </CardShell>
      </motion.div>

      {/* Conditions grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.28, ease: "easeOut" }}
      >
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-mt-surface border border-mt-border rounded-[12px] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-mt-dim" />
            <p className="text-[9px] font-semibold uppercase tracking-wider text-mt-dim">Best window</p>
          </div>
          <p className="text-[13px] font-bold text-mt-ink">{zone.tideWindow}</p>
        </div>
        <div className="bg-mt-surface border border-mt-border rounded-[12px] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Wind className="w-3 h-3 text-mt-dim" />
            <p className="text-[9px] font-semibold uppercase tracking-wider text-mt-dim">Wind fit</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-mt-border rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${cfg.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${zone.windFit}%` }}
                transition={{ duration: 0.55, delay: 0.48, ease: "easeOut" }}
              />
            </div>
            <span className={`font-mono text-[13px] font-bold ${cfg.color}`}>
              <CountUp target={zone.windFit} duration={550} delayMs={480} />
            </span>
          </div>
        </div>
        <div className="bg-mt-surface border border-mt-border rounded-[12px] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Waves className="w-3 h-3 text-mt-dim" />
            <p className="text-[9px] font-semibold uppercase tracking-wider text-mt-dim">Depth</p>
          </div>
          <p className="text-[13px] font-bold text-mt-ink">{zone.depth}</p>
        </div>
        <div className="bg-mt-surface border border-mt-border rounded-[12px] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3 h-3 text-mt-dim" />
            <p className="text-[9px] font-semibold uppercase tracking-wider text-mt-dim">Distance</p>
          </div>
          <p className="text-[13px] font-bold text-mt-ink">{zone.distance}</p>
        </div>
      </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.28, ease: "easeOut" }}
      >
      <PrimaryButton onClick={() => { onToast(`Navigating to ${zone.name}…`); onClose(); }}>
        Navigate here
        <ArrowRight className="w-4 h-4" />
      </PrimaryButton>
      </motion.div>
    </div>
  );
}

// ── Map container ──────────────────────────────────────────────────────────────

function MapContainer({
  zones,
  onSelect,
  isPro,
}: {
  zones:    Zone[];
  onSelect: (z: Zone) => void;
  isPro:    boolean;
}) {
  return (
    <div className="relative w-full h-[260px] bg-mt-base overflow-hidden">
      {/* Ocean grid */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-mt-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-mt-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Depth gradient */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 40% 30%, color-mix(in srgb, var(--color-mt-teal) 13%, transparent) 0%, transparent 60%), radial-gradient(ellipse at 75% 70%, color-mix(in srgb, var(--color-mt-aqua) 7%, transparent) 0%, transparent 50%)",
        }}
      />

      {/* IMBL — India's Maritime Boundary Line */}
      <div
        className="absolute top-0 bottom-0 w-px"
        style={{ left: "90%", background: "color-mix(in srgb, var(--color-mt-red) 50%, transparent)" }}
      />
      <div
        className="absolute right-1 top-3 text-mt-red text-[8px] font-mono font-bold"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        IMBL
      </div>

      {/* Current position */}
      <div className="absolute" style={{ left: "30%", top: "60%" }}>
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-mt-aqua opacity-15 animate-ping" />
          <div className="w-3 h-3 rounded-full bg-mt-aqua border-2 border-mt-base" />
        </div>
      </div>

      {/* Zone pins — radar-lock spring entrance, staggered */}
      {zones.map((z, i) => {
        const band   = getScoreBand(z.score);
        const cfg    = scoreBandConfig[band];
        // z.isLocked = "Pro-gated"; effective lock lifts once the user has Pro.
        const locked = z.isLocked && !isPro;
        const color  = locked ? "var(--color-mt-dim)" : cfg.cssVar;

        return (
          <motion.div
            key={z.id}
            className="absolute"
            style={{ left: z.mapX, top: z.mapY, transform: "translate(-50%,-50%)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.15 + i * 0.12 }}
          >
            {/* Glow blob — suppressed for locked zones */}
            {!locked && (
              <div
                className="absolute rounded-full opacity-20 pointer-events-none"
                style={{
                  width: 48, height: 48,
                  background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                  transform: "translate(-50%,-50%)",
                  left: "50%", top: "50%",
                }}
              />
            )}

            {/* Tappable score pill */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={springs.snap}
              onClick={() => onSelect(z)}
              className="relative px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold flex items-center gap-1"
              style={{
                background:   `${color}18`,
                borderColor:  `${color}40`,
                color,
              }}
            >
              {locked && <Lock className="w-2.5 h-2.5" />}
              {locked
                ? "Pro"
                : <CountUp target={z.score} duration={500} delayMs={(0.34 + i * 0.12) * 1000} />
              }
            </motion.button>
          </motion.div>
        );
      })}

      {/* Map controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={springs.snap}
          aria-label="Toggle map layers"
          className="w-8 h-8 rounded-[8px] bg-mt-surface/90 border border-mt-border flex items-center justify-center"
        >
          <Layers className="w-3.5 h-3.5 text-mt-muted" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={springs.snap}
          aria-label="Center on my location"
          className="w-8 h-8 rounded-[8px] bg-mt-surface/90 border border-mt-border flex items-center justify-center"
        >
          <Navigation className="w-3.5 h-3.5 text-mt-aqua" />
        </motion.button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-mt-base/80">
        <div className="w-1.5 h-1.5 rounded-full bg-mt-aqua" />
        <span className="text-[9px] text-mt-muted font-medium">PFZ zones</span>
      </div>

      {/* Phase 2 watermark */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <span className="text-[9px] text-mt-border font-medium">MapLibre — Phase 2</span>
      </div>
    </div>
  );
}

// ── Zone list card ─────────────────────────────────────────────────────────────

function ZoneCard({ zone, onSelect, index, isPro }: { zone: Zone; onSelect: () => void; index: number; isPro: boolean }) {
  const band     = getScoreBand(zone.score);
  const cfg      = scoreBandConfig[band];
  const locked   = zone.isLocked && !isPro;
  const arcColor = locked ? "var(--color-mt-border)" : cfg.cssVar;

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.975 }}
      onClick={onSelect}
      className="w-full text-left border-b border-mt-border last:border-b-0"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.16 } }}
      transition={{
        opacity: { delay: index * 0.07, duration: 0.28 },
        x:       { delay: index * 0.07, duration: 0.28 },
        scale:   springs.snap,
      }}
    >
      <div className="flex items-center gap-4 py-4">
        <div className="relative flex-shrink-0">
          <ProgressArc score={locked ? 100 : zone.score} color={arcColor} size={52} strokeWidth={4} />
          <div className="absolute inset-0 flex items-center justify-center">
            {locked ? (
              <Lock className="w-3.5 h-3.5 text-mt-dim" />
            ) : (
              <span className={`font-mono text-[13px] font-bold ${cfg.color}`}>
                {/* delayMs anchors to card visible: index*0.07 + 0.28×0.85 ≈ 0.238 + index*0.07s */}
                <CountUp target={zone.score} duration={600} delayMs={238 + index * 70} />
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[14px] font-semibold text-mt-ink truncate">{zone.name}</p>
            {zone.pfz && <Badge variant="aqua">PFZ</Badge>}
            {locked && <Badge variant="neutral"><Lock className="w-2.5 h-2.5" /> Pro</Badge>}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-mt-muted">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{zone.distance}</span>
            <span className="flex items-center gap-1"><Waves className="w-3 h-3" />{zone.depth}</span>
          </div>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {zone.species.map((sp) => (
              <span key={sp} className="text-[10px] font-medium text-mt-muted bg-mt-border px-2 py-0.5 rounded-full">
                {sp}
              </span>
            ))}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-mt-border flex-shrink-0" />
      </div>
    </motion.button>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

/** Mirrors the filter row + zone list so the panel reserves its space. */
function ZoneListSkeleton() {
  return (
    <div>
      <div className="flex gap-2 px-5 pt-4 pb-3">
        {["w-16", "w-24", "w-20", "w-16"].map((w, i) => (
          <SkeletonBlock key={i} className={`h-7 rounded-full ${w}`} />
        ))}
      </div>
      <div className="px-5">
        <SkeletonBlock className="h-2.5 w-32 mb-3" />
      </div>
      <div className="px-5 flex flex-col">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 py-4 border-b border-mt-border last:border-b-0">
            <SkeletonBlock className="w-[52px] h-[52px] rounded-full flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="h-2.5 w-40" />
              <div className="flex gap-1.5">
                <SkeletonBlock className="h-4 w-14 rounded-full" />
                <SkeletonBlock className="h-4 w-14 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function HotspotFinder({ onUpgrade, onToast, isPro = false }: { onUpgrade: () => void; onToast: (msg: string) => void; isPro?: boolean }) {
  const { t } = useT();
  const [filter,       setFilter]       = useState("All zones");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  // Data-load simulation — in production `loaded` is driven by real fetch state.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 650);
    return () => clearTimeout(id);
  }, []);

  // Dismiss the zone detail sheet on Escape.
  useEscapeKey(() => setSelectedZone(null), !!selectedZone);
  const dragControls = useDragControls();

  const filtered = ZONES.filter((z) => {
    if (filter === "PFZ only")      return z.pfz;
    if (filter === "High score")    return z.score >= 70;
    if (filter === "Near (<50 nm)") return parseInt(z.distance) < 50;
    return true;
  });

  function handleSelect(z: Zone) {
    if (z.isLocked && !isPro) { onUpgrade(); return; }
    setSelectedZone(z);
  }

  return (
    // relative so the bottom sheet can be absolutely positioned inside
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Screen landmark — visually hidden, orients screen-reader users */}
      <h1 className="sr-only">{t("screen.hotspotFinder")}</h1>
      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="px-5 pt-5 pb-3"
      >
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={springs.snap}
            onClick={() => onToast("Search — type a harbor or zone name")}
            className="flex-1 flex items-center gap-2.5 bg-mt-surface border border-mt-border rounded-[12px] px-3.5 py-3"
          >
            <Search className="w-4 h-4 text-mt-dim flex-shrink-0" />
            <span className="text-[13px] text-mt-dim">Search waters, harbors…</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={springs.snap}
            onClick={() => onToast("Filters — available in Pro plan")}
            aria-label="Filter zones"
            className="w-11 h-11 rounded-[12px] bg-mt-surface border border-mt-border flex items-center justify-center flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-mt-muted" />
          </motion.button>
        </div>
      </motion.div>

      {/* Map */}
      <MapContainer zones={ZONES} onSelect={handleSelect} isPro={isPro} />

      {/* Zone list */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <AnimatePresence mode="wait">
        {!loaded ? (
          <motion.div key="hs-skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ZoneListSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="hs-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
          >
        {/* Filter chips — slide up after map settles */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.28, ease: "easeOut" }}
          className="flex gap-2 px-5 pt-4 pb-3 overflow-x-auto scrollbar-none"
        >
          {FILTERS.map((f) => (
            <Chip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
          ))}
        </motion.div>

        <SectionLabel>
          {/* key on filtered.length so the label cross-fades on every filter change,
              staying in sync with the AnimatePresence popLayout on the zone cards below. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={filtered.length}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y:  0 }}
              exit={{    opacity: 0, y:  3 }}
              transition={{ duration: 0.14 }}
              className="inline-block"
            >
              {filtered.length} fishing zone{filtered.length !== 1 ? "s" : ""} found
            </motion.span>
          </AnimatePresence>
        </SectionLabel>

        <div className="px-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((z, i) => (
              <ZoneCard key={z.id} zone={z} onSelect={() => handleSelect(z)} index={i} isPro={isPro} />
            ))}
            {filtered.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="py-10 flex flex-col items-center gap-2 text-center"
              >
                <Fish className="w-8 h-8 text-mt-border" />
                <p className="text-[13px] font-semibold text-mt-dim">No zones match this filter</p>
                <p className="text-[11px] text-mt-border">Try &quot;All zones&quot; to see everything</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Unlock CTA — hidden for Pro/trial users (nothing to unlock) */}
        {!isPro && (
        <div className="mx-5 mt-3 mb-6">
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
            className="w-full py-3 rounded-[14px] border border-mt-aqua/25 bg-mt-aqua/5 flex items-center justify-center gap-2"
          >
            <Fish className="w-4 h-4 text-mt-aqua" />
            <span className="text-[13px] font-semibold text-mt-aqua">Unlock deeper intel — Pro</span>
          </motion.button>
        </div>
        )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Zone detail sheet — slides up from bottom */}
      <AnimatePresence>
        {selectedZone && (
          <>
            {/* Dimmed backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-10 bg-mt-base/65"
              onClick={() => setSelectedZone(null)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label={`Zone details: ${selectedZone.name}`}
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
                  setSelectedZone(null);
                }
              }}
              whileDrag="dragging"
              className="absolute bottom-0 left-0 right-0 z-20 bg-mt-bg border-t border-mt-border rounded-t-[24px] overflow-hidden"
              style={{ boxShadow: "0 -16px 48px rgba(0,0,0,0.55)" }}
            >
              <ZoneDetailSheet
                zone={selectedZone}
                onClose={() => setSelectedZone(null)}
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

export default HotspotFinder;
