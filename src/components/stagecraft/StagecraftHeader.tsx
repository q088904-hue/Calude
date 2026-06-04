"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { CountdownChip } from "@/components/stagecraft/CountdownChip";

export function StagecraftHeader({
  label,
  sticky = true,
  children,
  backHref = "/stagecraft",
  backLabel = "← Stagecraft",
}: {
  label: string;
  sticky?: boolean;
  children?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  // Persistent header (never hides). Gains a soft elevation shadow once content
  // scrolls underneath it — twenty.com behaviour. Shadow is a non-motion change,
  // so no reduced-motion concern.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!sticky) return;
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky]);

  return (
    <header
      data-scrolled={scrolled ? "true" : undefined}
      className={`border-b border-sc-border px-6 py-4 flex flex-wrap items-center justify-between gap-y-2 bg-sc-bg transition-shadow duration-150 ease-sc data-[scrolled=true]:shadow-sc-sm ${
        sticky ? "sticky top-0 z-10" : ""
      }`}
    >
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={backHref}
          className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors min-h-[36px] inline-flex items-center"
        >
          {backLabel}
        </Link>
        <span className="text-sc-border text-xs">·</span>
        <span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <CountdownChip />
        {children}
        <a
          href="/api/stagecraft/auth/logout"
          className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors min-h-[36px] inline-flex items-center"
          title="Sign out"
        >
          Sign out
        </a>
        <AnimatedThemeToggler />
      </div>
    </header>
  );
}
