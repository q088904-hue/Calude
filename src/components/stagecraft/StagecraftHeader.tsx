"use client";

import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function StagecraftHeader({
  label,
  sticky = true,
  children,
}: {
  label: string;
  sticky?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={`border-b border-sc-border px-6 py-4 flex items-center justify-between bg-sc-bg ${
        sticky ? "sticky top-0 z-10" : ""
      }`}
    >
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/stagecraft"
          className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
        >
          ← Stagecraft
        </Link>
        <span className="text-sc-border text-xs">·</span>
        <span className="font-mono text-xs tracking-widest text-sc-gold uppercase">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <AnimatedThemeToggler />
      </div>
    </header>
  );
}
