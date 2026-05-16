"use client";

/**
 * AppShell — MeenTrack V2
 * Mobile-first wrapper: 390px max-width, centered on desktop,
 * with the ocean-gradient mesh background.
 */

import { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-dvh w-full flex justify-center bg-mt-base">
      <div
        className="meentrack-v2 relative w-full max-w-[390px] min-h-dvh flex flex-col overflow-hidden bg-mt-bg"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Ambient mesh glow — top left */}
        <div
          className="pointer-events-none absolute top-0 left-0 w-[280px] h-[280px] opacity-[0.07]"
          style={{ background: "radial-gradient(circle at 30% 30%, var(--color-mt-aqua) 0%, transparent 70%)" }}
        />
        {/* Ambient mesh glow — bottom right */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-[220px] h-[220px] opacity-[0.05]"
          style={{ background: "radial-gradient(circle at 70% 70%, var(--color-mt-teal) 0%, transparent 70%)" }}
        />
        {/*
          reducedMotion="user" — Framer Motion reads the OS/browser
          prefers-reduced-motion media query and collapses every animation
          (springs, fades, slides, path draws) to instant cuts when the user
          has enabled Reduce Motion in their accessibility settings.
          Applied at the root so it covers every motion.* component in the
          entire app without any per-component changes.
        */}
        <MotionConfig reducedMotion="user">
          {children}
        </MotionConfig>
      </div>
    </div>
  );
}

export default AppShell;
