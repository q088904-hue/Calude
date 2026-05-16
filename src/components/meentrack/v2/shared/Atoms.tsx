"use client";

/**
 * Atoms — MeenTrack V2
 * Reusable primitive components: Badge, Pill, Divider, CardShell, etc.
 */

import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springs } from "../tokens";

// ─── Count-up number ────────────────────────────────────────────────────────────

/**
 * Counts from 0 → target over `duration` ms using ease-out cubic.
 * `delayMs` defers the start so the count begins only once the
 * containing element is visible (after its entrance animation).
 */
export function CountUp({
  target,
  duration = 700,
  delayMs  = 0,
}: {
  target:    number;
  duration?: number;
  delayMs?:  number;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // rafId lives in the outer scope so the cleanup can always cancel it,
    // even when the component unmounts while the delay is still pending or
    // the animation is mid-flight.
    let rafId: number;
    const timer = setTimeout(() => {
      let startTs: number | null = null;
      function step(ts: number) {
        if (startTs === null) startTs = ts;
        const t = Math.min((ts - startTs) / duration, 1);
        setCount(Math.round((1 - Math.pow(1 - t, 3)) * target));
        if (t < 1) rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [target, duration, delayMs]);
  return <>{count}</>;
}

/**
 * Hook variant — returns the current number directly.
 * Use when you need to embed the value inside complex JSX
 * (e.g. `<span className={cfg.color}>{score}</span>`).
 */
export function useCountUp(target: number, duration = 700, delayMs = 0): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let rafId: number;
    const timer = setTimeout(() => {
      let startTs: number | null = null;
      function step(ts: number) {
        if (startTs === null) startTs = ts;
        const t = Math.min((ts - startTs) / duration, 1);
        setCount(Math.round((1 - Math.pow(1 - t, 3)) * target));
        if (t < 1) rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [target, duration, delayMs]);
  return count;
}

// ─── Skeleton block (shimmer placeholder) ───────────────────────────────────────

/**
 * Single pulsing placeholder block. Compose these into layout-matching
 * skeletons so a screen reserves its space before data arrives (no layout
 * shift on reveal). The opacity loop needs no globals.css keyframe.
 */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`bg-mt-surface rounded-[10px] ${className}`}
      animate={{ opacity: [0.45, 0.85, 0.45] }}
      transition={{ duration: 1.55, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── Section Label (GO Club-inspired ALL CAPS) ──────────────────────────────────

export function SectionLabel({
  children,
  action,
  onAction,
}: {
  children: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mt-dim">
        {children}
      </span>
      <AnimatePresence initial={false}>
        {action && (
          <motion.button
            key="action"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            whileTap={{ scale: 0.9 }}
            transition={{
              opacity: { duration: 0.18, ease: "easeOut" },
              x:       { duration: 0.18, ease: "easeOut" },
              scale:   springs.snap,
            }}
            onClick={onAction}
            className="text-[11px] font-semibold text-mt-aqua"
          >
            {action}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Card Shell ─────────────────────────────────────────────────────────────────

export function CardShell({
  children,
  className = "",
  glow,
  onTap,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  onTap?: () => void;
}) {
  // No overflow-hidden here — it clips text/arcs at rounded corners.
  // Apply overflow-hidden on inner gradient divs individually instead.
  const base =
    "bg-mt-surface border border-mt-border rounded-[20px]";
  const glowStyle = glow ? "shadow-mt-card-glow" : "";

  if (onTap) {
    return (
      <motion.button
        whileTap={{ scale: 0.975 }}
        transition={springs.snap}
        onClick={onTap}
        className={`w-full text-left ${base} ${glowStyle} ${className}`}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <div className={`${base} ${glowStyle} ${className}`}>{children}</div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────────

type BadgeVariant = "aqua" | "green" | "amber" | "red" | "neutral";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  aqua:    "bg-mt-aqua/15 text-mt-aqua border border-mt-aqua/25",
  green:   "bg-mt-green/15 text-mt-green border border-mt-green/25",
  amber:   "bg-mt-amber/15 text-mt-amber border border-mt-amber/25",
  red:     "bg-mt-red/15 text-mt-red border border-mt-red/25",
  neutral: "bg-mt-border text-mt-muted border border-mt-border",
};

export function Badge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${BADGE_STYLES[variant]}`}
    >
      {children}
    </span>
  );
}

// ─── Live dot ───────────────────────────────────────────────────────────────────

export function LiveDot({ color = "var(--color-mt-aqua)" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: color }}
      />
    </span>
  );
}

// ─── Progress Arc (SVG, Open-inspired radial) ────────────────────────────────────

export function ProgressArc({
  score,
  color,
  size = 140,
  strokeWidth = 8,
}: {
  score: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const r  = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 3/4 arc: from 135° to 405° (270° total sweep)
  const startAngle = 135;
  const sweep      = 270;
  const endAngle   = startAngle + sweep * (score / 100);

  function polar(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const start    = polar(startAngle);
  const end      = polar(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const bgStart = polar(startAngle);
  const bgEnd   = polar(startAngle + sweep);
  const bgLarge = sweep > 180 ? 1 : 0;

  const trackPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${bgLarge} 1 ${bgEnd.x} ${bgEnd.y}`;
  const fillPath  = score > 0
    ? `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
    : "";

  return (
    // overflow="visible" prevents SVG viewport from clipping the arc stroke
    // at its leftmost point (x≈0 in SVG space, well inside the card boundary).
    <svg width={size} height={size} aria-hidden="true" style={{ overflow: "visible" }}>
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="var(--color-mt-border)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/*
        Score arc — uses Framer Motion pathLength (0 → 1) instead of CSS `d` transition.
        CSS `d` transitions only work in Chrome; Safari ignores them entirely.
        pathLength animates stroke-dasharray/dashoffset internally, which is
        universally supported and correctly handles the spring easing overshoot.
        opacity fades in quickly to hide the round linecap dot at pathLength=0.
      */}
      {fillPath && (
        <motion.path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.85, ease: [0.34, 1.56, 0.64, 1] },
            opacity:    { duration: 0.12, ease: "easeIn" },
          }}
          style={{ filter: `drop-shadow(0 0 8px color-mix(in srgb, ${color} 38%, transparent))` }}
        />
      )}
    </svg>
  );
}

// ─── Horizontal Divider ─────────────────────────────────────────────────────────

export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px bg-mt-border mx-5 ${className}`} />
  );
}

// ─── Chip / Pill filter ─────────────────────────────────────────────────────────

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.91 }}
      transition={springs.snap}
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all duration-200 ${
        active
          ? "bg-mt-aqua text-mt-base border-transparent"
          : "bg-mt-surface border-mt-border text-mt-muted"
      }`}
    >
      {label}
    </motion.button>
  );
}

// ─── Primary Button ─────────────────────────────────────────────────────────────

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={springs.snap}
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-[52px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 transition-colors duration-200 ${
        disabled
          ? "bg-mt-border text-mt-dim cursor-not-allowed"
          : "bg-mt-aqua text-mt-base hover:brightness-90"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

// ─── Ghost Button ───────────────────────────────────────────────────────────────

export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={springs.snap}
      onClick={onClick}
      className={`w-full min-h-[52px] rounded-[14px] font-semibold text-[15px] border border-mt-border text-mt-muted flex items-center justify-center gap-2 hover:border-mt-aqua/30 hover:text-mt-ink transition-all ${className}`}
    >
      {children}
    </motion.button>
  );
}

// ─── FadeSlide entrance wrapper ─────────────────────────────────────────────────

/**
 * Slides + fades children in on mount.
 * Use to stagger major page sections — pass incrementing `delay` values so
 * blocks cascade in rather than appearing all at once.
 */
export function FadeSlide({
  children,
  delay     = 0,
  className = "",
}: {
  children:   ReactNode;
  delay?:     number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Toggle Switch ──────────────────────────────────────────────────────────────

/**
 * Thumb-style toggle switch. Pair with a `role="switch"` + `aria-checked` button
 * (see SettingsSection in ProfileSettings) — this component is purely visual.
 */
export function ToggleSwitch({ active }: { active: boolean }) {
  return (
    <div
      className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors duration-200 ${
        active ? "bg-mt-aqua" : "bg-mt-border"
      }`}
    >
      <motion.div
        className={`w-4 h-4 rounded-full shadow-sm transition-colors duration-200 ${
          active ? "bg-mt-base" : "bg-mt-dim"
        }`}
        animate={{ x: active ? 16 : 0 }}
        transition={springs.snap}
      />
    </div>
  );
}

// ─── Toast Snackbar ─────────────────────────────────────────────────────────────

export type ToastVariant = "info" | "success" | "warning" | "error";

const TOAST_STYLES: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  info:    { bg: "var(--color-mt-surface)", border: "#00E5FF40", text: "var(--color-mt-aqua)"  },
  success: { bg: "#0D2A20",                 border: "#00D97E40", text: "var(--color-mt-green)" },
  warning: { bg: "#2A1E00",                 border: "#FFB80040", text: "var(--color-mt-amber)" },
  error:   { bg: "#2A0D0D",                 border: "#FF3B3040", text: "var(--color-mt-red)"   },
};

export function Toast({
  message,
  variant = "info",
  visible,
}: {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
}) {
  const s = TOAST_STYLES[variant];
  // "error" toasts are assertive (interrupt immediately); all others are polite.
  const politeness = variant === "error" ? "assertive" : "polite";

  return (
    <>
      {/*
        Persistent live region — always mounted so the screen reader tracks it.
        When `visible` flips true and `message` changes, the content change
        triggers an AT announcement. Clearing the text on hide prevents a
        redundant re-announcement if the same message fires twice.
        aria-atomic="true" ensures the full sentence is read, not just the diff.
      */}
      <div
        role="status"
        aria-live={politeness}
        aria-atomic="true"
        className="sr-only"
      >
        {visible ? message : ""}
      </div>

      {/* Visual toast — animates independently of the live region */}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="toast"
            aria-hidden="true"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="pointer-events-none absolute bottom-[76px] left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-[14px] border"
            style={{ background: s.bg, borderColor: s.border }}
          >
            {/* Colour dot */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: s.text }}
            />
            <p className="text-[13px] font-semibold flex-1 leading-snug" style={{ color: s.text }}>
              {message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
