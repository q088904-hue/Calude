"use client";

/**
 * ActiveTrip — MeenTrack V2
 * Catch tab live state: elapsed timer, compact BiteScore arc,
 * species-chip catch logger, running catch total, 2-step End Trip confirm.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fish, MapPin, Plus, CheckCircle, Share2, Navigation } from "lucide-react";
import { SectionLabel, CardShell, ProgressArc, Divider, PrimaryButton, GhostButton, CountUp } from "../shared/Atoms";
import { gradients, getScoreBand, scoreBandConfig, springs } from "../tokens";
import { harborLabel } from "../constants";
import { useEscapeKey } from "../shared/hooks";
import type { TripRecord } from "@/lib/meentrack/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const SPECIES = ["Seer", "Yellowfin", "Mackerel", "Tuna", "Sardine", "Barracuda"];

const ZONE_SCORE = 84;

function zoneDetail(harbor: string) {
  const port = harborLabel(harbor);
  return { name: "SW Zone", detail: `12 nm out · ${port}`, score: ZONE_SCORE };
}

// ── Elapsed timer ──────────────────────────────────────────────────────────────

function fmt(startTime: Date) {
  const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function useElapsedTime(startTime: Date) {
  const [elapsed, setElapsed] = useState(() => fmt(startTime));

  useEffect(() => {
    const id = setInterval(() => setElapsed(fmt(startTime)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

type Zone = ReturnType<typeof zoneDetail>;

function TripHeader({ elapsed, startTime, zone }: { elapsed: string; startTime: Date; zone: Zone }) {
  return (
    <div className="px-5 pt-5 pb-4">
      {/* Pulsing "TRIP ACTIVE" label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mt-aqua opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-mt-aqua" />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mt-aqua">
          Trip Active
        </p>
      </div>

      {/* Large elapsed timer */}
      <p className="font-mono text-[48px] font-black text-mt-ink leading-none tracking-tight">
        {elapsed}
      </p>

      {/* Zone */}
      <div className="flex items-center gap-1.5 mt-2">
        <MapPin className="w-3 h-3 text-mt-dim" />
        <p className="text-[12px] text-mt-muted">
          {zone.name} · {zone.detail}
        </p>
        <span className="ml-1 text-[11px] text-mt-dim">
          · Started {startTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function LiveScore({ zone }: { zone: Zone }) {
  const band     = getScoreBand(zone.score);
  const cfg      = scoreBandConfig[band];
  const arcColor = cfg.cssVar;

  return (
    <CardShell className="mx-5" glow={band === "excellent" || band === "good"}>
      <div
        className="px-5 py-4 rounded-[20px]"
        style={{
          background: gradients.heroCard,
          overflow: "hidden",
        }}
      >
        <div className="flex items-center gap-4">
          {/* Compact arc */}
          <div className="relative flex-shrink-0 w-[80px] h-[80px]">
            <ProgressArc score={zone.score} color={arcColor} size={80} strokeWidth={6} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-mono text-[24px] font-black leading-none ${cfg.color}`}>
                {/* delayMs=340 syncs with the card's entrance: parent delay 0.08s +
                    dur 0.3s × 0.85 ≈ 0.34s — count starts as the card is reaching
                    full opacity, not before it arrives. */}
                <CountUp target={zone.score} duration={700} delayMs={340} />
              </span>
            </div>
          </div>

          {/* Label */}
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim mb-1 whitespace-nowrap">
              Live BiteScore™
            </p>
            <p className={`text-[22px] font-black leading-none ${cfg.color}`}>{cfg.label}</p>
            <p className="text-[11px] text-mt-muted mt-1">Updated · INCOIS + IMD</p>
          </div>

          {/* Mini bar breakdown */}
          <div className="flex flex-col gap-2 w-[72px]">
            {[
              { label: "PFZ",  val: 88 },
              { label: "Tide", val: 72 },
              { label: "Wind", val: 65 },
            ].map(({ label, val }, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <p className="text-[9px] text-mt-dim w-6">{label}</p>
                <div className="flex-1 h-1 bg-mt-border rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${cfg.bar}`}
                    style={{ opacity: 0.7 + val / 300 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.55, delay: 0.34 + i * 0.08, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function CatchLogger({
  catches,
  onIncrement,
}: {
  catches: Record<string, number>;
  onIncrement: (sp: string) => void;
}) {
  return (
    <div className="mt-4">
      <SectionLabel>Log a catch</SectionLabel>
      {/* Horizontally scrollable species chips */}
      <div className="flex gap-2 px-5 mt-2 overflow-x-auto scrollbar-none pb-1">
        {SPECIES.map((sp, i) => {
          const count  = catches[sp] || 0;
          const active = count > 0;

          return (
            <motion.button
              key={sp}
              aria-label={`Log ${sp} catch${catches[sp] > 0 ? ` (${catches[sp]} logged)` : ""}`}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                opacity: { delay: 0.40 + i * 0.05, duration: 0.22, ease: "easeOut" },
                x:       { delay: 0.40 + i * 0.05, duration: 0.22, ease: "easeOut" },
                scale:   springs.snap,
              }}
              onClick={() => onIncrement(sp)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] border transition-all duration-150 ${
                active
                  ? "bg-mt-aqua/15 border-mt-aqua/40"
                  : "bg-mt-surface border-mt-border"
              }`}
            >
              <Plus className={`w-3 h-3 transition-colors duration-150 ${active ? "text-mt-aqua" : "text-mt-dim"}`} />
              <span
                className={`text-[12px] font-semibold transition-colors duration-150 ${active ? "text-mt-aqua" : "text-mt-muted"}`}
              >
                {sp}
              </span>
              {/* Count badge — bounces on each increment */}
              {active && (
                <motion.span
                  key={count}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="font-mono text-[12px] font-bold text-mt-aqua"
                >
                  ×{count}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function CaughtList({ catches }: { catches: Record<string, number> }) {
  const entries = Object.entries(catches).filter(([, n]) => n > 0);
  const total   = entries.reduce((sum, [, n]) => sum + n, 0);

  return (
    <div className="mt-4">
      <SectionLabel action={total > 0 ? `${total} fish` : undefined}>
        Caught so far
      </SectionLabel>

      <CardShell className="mx-5 mt-2">
        <div className="p-4">
          <AnimatePresence mode="popLayout">
            {entries.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[12px] text-mt-dim text-center py-2"
              >
                Tap a species above to log your first catch
              </motion.p>
            ) : (
              <>
                {entries.map(([sp, count]) => (
                  <motion.div
                    key={sp}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Fish className="w-3.5 h-3.5 text-mt-green" />
                      <span className="text-[13px] font-semibold text-mt-ink">{sp}</span>
                    </div>
                    {/* key={count} remounts on each increment → same spring bounce as the chip badge above */}
                    <motion.span
                      key={count}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 480, damping: 22 }}
                      className="font-mono text-[13px] font-bold text-mt-green inline-block"
                    >
                      ×{count}
                    </motion.span>
                  </motion.div>
                ))}

                {/* Total divider row */}
                <motion.div
                  layout
                  className="flex items-center justify-between pt-2.5 mt-1.5 border-t border-mt-border"
                >
                  <span className="text-[11px] text-mt-dim">Total</span>
                  <span className="font-mono text-[14px] font-black text-mt-ink">
                    {/* key={total} re-mounts the span on each increment → spring bounce */}
                    <motion.span
                      key={total}
                      initial={{ scale: 1.35 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 480, damping: 22 }}
                      className="inline-block tabular-nums"
                    >
                      {total}
                    </motion.span>
                    {" fish"}
                  </span>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </CardShell>
    </div>
  );
}

// ── Trip summary sheet ─────────────────────────────────────────────────────────

function TripSummarySheet({
  catches,
  elapsed,
  zone,
  onDone,
  onShare,
}: {
  catches:  Record<string, number>;
  elapsed:  string;
  zone:     Zone;
  onDone:   () => void;
  onShare:  () => void;
}) {
  const entries  = Object.entries(catches).filter(([, n]) => n > 0);
  const total    = entries.reduce((sum, [, n]) => sum + n, 0);
  const maxCount = entries.length > 0 ? Math.max(...entries.map(([, n]) => n)) : 1;
  const band     = getScoreBand(zone.score);
  const cfg      = scoreBandConfig[band];
  const arcColor = cfg.cssVar;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none pb-8">
      {/* ── Celebration header ── */}
      <div className="flex flex-col items-center pt-8 pb-6 px-5 text-center">
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
          className="w-16 h-16 rounded-full bg-mt-green/15 border border-mt-green/30 flex items-center justify-center mb-4"
        >
          <CheckCircle className="w-8 h-8 text-mt-green" />
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mt-green mb-1">
            Trip Complete
          </p>
          <h2 className="text-[28px] font-black text-mt-ink leading-none">
            {elapsed}
          </h2>
          <p className="text-[12px] text-mt-dim mt-1.5">
            {zone.name} · {zone.detail}
          </p>
        </motion.div>
      </div>

      {/* ── Score + stats ── */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.22, duration: 0.35 }}
        className="mx-5"
      >
        <div
          className="rounded-[20px] p-5"
          style={{ background: gradients.heroCard }}
        >
          <div className="flex items-center gap-5">
            {/* Score arc */}
            <div className="relative flex-shrink-0 w-[96px] h-[96px]">
              <ProgressArc score={zone.score} color={arcColor} size={96} strokeWidth={7} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono text-[28px] font-black leading-none ${cfg.color}`}>
                  <CountUp target={zone.score} duration={700} delayMs={520} />
                </span>
                <span className="text-[9px] font-semibold text-mt-dim uppercase tracking-wide mt-0.5">
                  BiteScore
                </span>
              </div>
            </div>

            {/* Stat column */}
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mt-dim">Total catch</p>
                <p className="text-[24px] font-black text-mt-ink leading-tight">
                  <CountUp target={total} duration={600} delayMs={520} />
                  <span className="text-[13px] font-semibold text-mt-muted ml-1">fish</span>
                </p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-mt-dim">Species</p>
                  <p className="text-[16px] font-bold text-mt-ink">
                    <CountUp target={entries.length} duration={400} delayMs={520} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-mt-dim">Rating</p>
                  <p className={`text-[16px] font-bold ${cfg.color}`}>{cfg.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Species breakdown ── */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.32, duration: 0.35 }}
        className="mx-5 mt-4"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim mb-3">
          Species caught
        </p>

        {entries.length === 0 ? (
          <div className="bg-mt-surface border border-mt-border rounded-[16px] p-5 text-center">
            <Fish className="w-8 h-8 text-mt-border mx-auto mb-2" />
            <p className="text-[13px] text-mt-dim">No catches logged this trip</p>
          </div>
        ) : (
          <div className="bg-mt-surface border border-mt-border rounded-[16px] p-4 flex flex-col gap-3.5">
            {entries.map(([sp, count], i) => {
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={sp}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Fish className="w-3 h-3 text-mt-green" />
                      <p className="text-[13px] font-semibold text-mt-ink">{sp}</p>
                    </div>
                    <p className="text-[12px] font-mono font-bold text-mt-green">
                      <CountUp target={count} duration={500} delayMs={(0.62 + i * 0.08) * 1000} /> fish
                    </p>
                  </div>
                  <div className="h-1.5 bg-mt-border rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-mt-green"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.55, delay: 0.62 + i * 0.08, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}

            <Divider className="mx-0 my-0.5" />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-mt-dim">Total</p>
              <p className="font-mono text-[14px] font-black text-mt-ink">
                <CountUp target={total} duration={600} delayMs={620} /> fish
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── CTAs ── */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.42, duration: 0.35 }}
        className="mx-5 mt-5 flex flex-col gap-3"
      >
        <PrimaryButton onClick={onDone}>
          <Navigation className="w-4 h-4" />
          Back to trip log
        </PrimaryButton>
        <GhostButton onClick={onShare}>
          <Share2 className="w-4 h-4" />
          Share trip
        </GhostButton>
      </motion.div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function ActiveTrip({
  startTime,
  onEndTrip,
  onToast,
  harbor = "",
}: {
  startTime: Date;
  onEndTrip: (trip: TripRecord) => void;
  onToast:   (msg: string) => void;
  harbor?:   string;
}) {
  const zone        = zoneDetail(harbor);
  const elapsed     = useElapsedTime(startTime);
  const [catches,       setCatches]      = useState<Record<string, number>>({});
  const [confirming,    setConfirming]   = useState(false);
  const [showSummary,   setShowSummary]  = useState(false);

  // Build the persisted record at finish time and hand it up to be saved.
  function handleFinish() {
    const endedAt = new Date();
    const trip: TripRecord = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `trip-${endedAt.getTime()}`,
      startedAt:   startTime.toISOString(),
      endedAt:     endedAt.toISOString(),
      durationSec: Math.max(0, Math.floor((endedAt.getTime() - startTime.getTime()) / 1000)),
      zoneName:    zone.name,
      biteScore:   zone.score,
      catches:     Object.entries(catches)
        .filter(([, n]) => n > 0)
        .map(([species, count]) => ({ species, count })),
      harbor,
    };
    onEndTrip(trip);
  }

  // Cancel the end-trip confirmation on Escape.
  useEscapeKey(() => setConfirming(false), confirming);
  const [frozenElapsed, setFrozenElapsed] = useState("");

  const increment = useCallback((sp: string) => {
    setCatches((prev) => ({ ...prev, [sp]: (prev[sp] || 0) + 1 }));
  }, []);

  function handleConfirmEnd() {
    setFrozenElapsed(elapsed);   // freeze the clock at the exact end moment
    setConfirming(false);
    setShowSummary(true);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Screen landmark — visually hidden, orients screen-reader users */}
      <h1 className="sr-only">Active Trip</h1>
      {/* ── Scrollable live trip content ── */}
      <div className="flex-1 flex flex-col overflow-y-auto pb-4 scrollbar-none">
        {/* Staggered entrance: header slides from above, cards cascade up */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <TripHeader elapsed={elapsed} startTime={startTime} zone={zone} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3, ease: "easeOut" }}
        >
          <LiveScore zone={zone} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
        >
          <CatchLogger catches={catches} onIncrement={increment} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.3, ease: "easeOut" }}
        >
          <CaughtList catches={catches} />
        </motion.div>

        {/* Pushes End Trip button to bottom when content is short */}
        <div className="flex-1 min-h-[24px]" />

        {/* End Trip — 2-step confirm */}
        <div className="px-5 pb-2">
          <AnimatePresence mode="wait">
            {confirming ? (
              <motion.div
                key="confirm"
                role="alert"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.16, ease: "easeIn" } }}
                className="flex flex-col gap-2"
              >
                <p className="text-[12px] text-mt-muted text-center mb-1">
                  Save trip to log and return to history?
                </p>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={springs.snap}
                    onClick={() => setConfirming(false)}
                    className="flex-1 min-h-[48px] rounded-[14px] border border-mt-border text-mt-muted text-[14px] font-semibold"
                  >
                    Continue
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={springs.snap}
                    onClick={handleConfirmEnd}
                    className="flex-1 min-h-[48px] rounded-[14px] bg-mt-red/10 border border-mt-red/35 text-mt-red text-[14px] font-bold"
                  >
                    End Trip
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="end-btn"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.14, ease: "easeIn" } }}
                whileTap={{ scale: 0.97 }}
                transition={{
                  opacity: { duration: 0.2, ease: "easeInOut" },
                  y:       { duration: 0.2, ease: "easeOut" },
                  scale:   springs.snap,
                }}
                onClick={() => setConfirming(true)}
                className="w-full min-h-[52px] rounded-[14px] border border-mt-red/30 text-mt-red text-[15px] font-bold"
              >
                End Trip
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Trip Summary — slides up over the live view ── */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            key="summary"
            role="dialog"
            aria-modal="true"
            aria-label="Trip summary"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%", transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute inset-0 z-20 bg-mt-bg flex flex-col"
          >
            <TripSummarySheet
              catches={catches}
              elapsed={frozenElapsed}
              zone={zone}
              onDone={handleFinish}
              onShare={() => onToast("Trip shared — screenshot saved to gallery")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ActiveTrip;
