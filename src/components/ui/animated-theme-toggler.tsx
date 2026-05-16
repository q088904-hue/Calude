"use client";

import { useState, useEffect, useRef, useId } from "react";
import { motion } from "framer-motion";

/** Tiny Web Audio click sound */
function playTick(lastSnd: React.MutableRefObject<number>) {
  try {
    const now = Date.now();
    if (now - lastSnd.current < 200) return;
    lastSnd.current = now;
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length / 5));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.04;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
    src.onended = () => ctx.close();
  } catch {
    /* silently ignore if AudioContext is unavailable */
  }
}

export interface AnimatedThemeTogglerProps {
  sound?: boolean;
  className?: string;
}

export function AnimatedThemeToggler({
  sound = true,
  className,
}: AnimatedThemeTogglerProps) {
  const rawId = useId();
  const maskId = `att${rawId.replace(/:/g, "")}`;
  const lastSnd = useRef(0);
  const isFirst = useRef(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read initial preference
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefersDark;
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    setIsDark(dark);
    requestAnimationFrame(() => {
      isFirst.current = false;
    });
  }, []);

  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    setIsDark(dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
    if (sound) playTick(lastSnd);
  };

  const spring = isFirst.current
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30 };

  // Moon crescent mask circle position
  const maskCx = isDark ? 14 : 28;
  const maskCy = isDark ? 4 : 4;

  // Sun ray animation
  const raysOpacity = isDark ? 0 : 1;
  const raysScale = isDark ? 0.4 : 1;
  const raysRotate = isDark ? 45 : 0;

  // The 8 ray angles (spokes)
  const rayAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.84 }}
      className={`relative flex items-center justify-center w-9 h-9 rounded-full
        text-[var(--text-primary)]
        border border-[var(--border-subtle)]
        bg-[var(--surface-secondary)]
        hover:bg-[var(--surface-tertiary)] hover:border-[var(--border-medium)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50
        transition-colors duration-200 ${className ?? ""}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="overflow-visible"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="24" height="24" fill="white" />
            <motion.circle
              cx={maskCx}
              cy={maskCy}
              r="7"
              fill="black"
              animate={{ cx: maskCx, cy: maskCy }}
              transition={spring}
            />
          </mask>
        </defs>

        {/* Sun/Moon body */}
        <motion.circle
          cx="12"
          cy="12"
          r="5.5"
          mask={`url(#${maskId})`}
          animate={{ r: isDark ? 6.5 : 5.5 }}
          transition={spring}
        />

        {/* Rays — rotate group as a whole */}
        <motion.g
          animate={{ opacity: raysOpacity, scale: raysScale, rotate: raysRotate }}
          transition={spring}
          style={{ transformOrigin: "12px 12px" }}
        >
          {rayAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 12 + 8.5 * Math.cos(rad);
            const y1 = 12 + 8.5 * Math.sin(rad);
            const x2 = 12 + 11 * Math.cos(rad);
            const y2 = 12 + 11 * Math.sin(rad);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
        </motion.g>
      </svg>
    </motion.button>
  );
}
