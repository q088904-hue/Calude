"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

interface NavbarProps {
  showBack?: boolean;
  onBack?: () => void;
  onHome?: () => void;
  canGoHome?: boolean;
}

export default function Navbar({ showBack, onBack, onHome, canGoHome }: NavbarProps) {
  const logoContent = (
    <motion.div
      whileHover={canGoHome ? { opacity: 0.75 } : undefined}
      transition={{ duration: 0.2 }}
      className="relative h-[32px] w-[86px]"
    >
      {/* Light-mode logo (black wordmark) */}
      <Image
        src="/logo.svg"
        alt="Datamatics Design Intelligence"
        width={180}
        height={67}
        className="absolute inset-0 h-[32px] w-auto block dark:hidden"
        priority
      />
      {/* Dark-mode logo (white wordmark, red accent preserved) */}
      <Image
        src="/logo-dark.svg"
        alt="Datamatics Design Intelligence"
        width={180}
        height={67}
        className="absolute inset-0 h-[32px] w-auto hidden dark:block"
        priority
      />
    </motion.div>
  );

  return (
    <motion.nav
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--background)]/80 backdrop-blur-2xl"
    >
      <div className="section-container h-14 flex items-center justify-between">

        {/* Left: back chevron + logo */}
        <div className="flex items-center gap-2">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)]
                hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]
                transition-all duration-200"
              aria-label="Go back"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {canGoHome && onHome ? (
            <button
              onClick={onHome}
              aria-label="Back to home"
              className="flex items-center rounded-lg focus:outline-none
                focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2"
            >
              {logoContent}
            </button>
          ) : (
            logoContent
          )}
        </div>

        {/* Right: status pill + theme toggle + home */}
        <div className="flex items-center gap-1.5 sm:gap-3">

          {/* Home pill — shown from all non-landing states */}
          {canGoHome && onHome && (
            <button
              onClick={onHome}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]
                font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                border border-[var(--border-subtle)] hover:border-[var(--border-medium)]
                bg-transparent hover:bg-[var(--surface-secondary)]
                transition-all duration-200"
              aria-label="Back to home"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 6.5L7 2L12 6.5V12H9V8H5V12H2V6.5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Home
            </button>
          )}

          {/* AI status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
            <div className="relative w-1.5 h-1.5">
              <div className="absolute inset-0 rounded-full bg-emerald-500" />
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
            </div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)] tracking-wide">
              AI Active
            </span>
          </div>

          {/* Theme toggle */}
          <AnimatedThemeToggler />
        </div>
      </div>
    </motion.nav>
  );
}
