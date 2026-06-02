"use client";

// Stagecraft — Company Prep Overview.
// Company cards linking to each company's deep-dive page.

import Link from "next/link";
import { COMPANY_PACKS } from "@/lib/stagecraft/companyPacks";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { ScrollReveal } from "@/components/stagecraft/ScrollReveal";
import {
  GalleryHoverCarousel,
  type GalleryItem,
} from "@/components/stagecraft/GalleryHoverCarousel";

const MARKET_LABELS: Record<string, string> = {
  "kohler-india": "Mumbai · India",
  "hettich-india": "Mumbai · India",
  "marriott-dubai": "Dubai · UAE",
  "emaar-dubai": "Dubai · UAE",
  "marina-bay-sands": "Singapore",
  "pidilite-india": "Mumbai · India",
};

const MARKET_ICONS: Record<string, string> = {
  "kohler-india": "🇮🇳",
  "hettich-india": "🇮🇳",
  "marriott-dubai": "🇦🇪",
  "emaar-dubai": "🇦🇪",
  "marina-bay-sands": "🇸🇬",
  "pidilite-india": "🇮🇳",
};

const galleryItems: GalleryItem[] = COMPANY_PACKS.map((pack) => ({
  id: pack.id,
  title: pack.shortName,
  subtitle: MARKET_LABELS[pack.id] ?? "Global",
  href: `/stagecraft/companies/${pack.id}`,
}));

export default function CompaniesPage() {
  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      <StagecraftHeader label="Companies" />

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-2">
            Target companies
          </p>
          <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
            Know the room before you walk in.
          </h1>
          <p className="mt-1.5 text-sm text-sc-muted leading-relaxed">
            Each company has a different creative bar, brand vocabulary, and set of
            traps. Study the brief. Know the watch-outs. Start a targeted session.
          </p>
        </div>

        <ScrollReveal as="section">
          {/* Desktop: hover carousel */}
          <div className="hidden sm:block mb-6">
            <GalleryHoverCarousel items={galleryItems} />
          </div>

          {/* Mobile + desktop fallback: existing list */}
          <div className="space-y-3 sm:hidden">
            {COMPANY_PACKS.map((pack) => (
              <Link
                key={pack.id}
                href={`/stagecraft/companies/${pack.id}`}
                className="block rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm hover:border-sc-gold-dim hover:bg-sc-raised transition-all group"
              >
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{MARKET_ICONS[pack.id]}</span>
                      <p className="text-sm font-semibold text-sc-ink group-hover:text-sc-gold transition-colors leading-snug">
                        {pack.shortName}
                      </p>
                    </div>
                    <p className="font-mono text-xs text-sc-dim mb-2">
                      {MARKET_LABELS[pack.id] ?? "Global"} · {pack.rounds.split("→")[0].trim()}
                      {" → "}
                      {pack.rounds.split("→").slice(-1)[0].trim()}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pack.watchOuts.slice(0, 2).map((w, i) => (
                        <span
                          key={i}
                          className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-2 py-0.5 font-mono text-[10px] text-sc-dim"
                        >
                          {w.length > 40 ? w.slice(0, 40) + "…" : w}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-sc-dim group-hover:text-sc-gold transition-colors shrink-0 mt-1">
                    Study →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </ScrollReveal>

        <div className="border-t border-sc-border pt-6">
          <Link
            href="/stagecraft"
            className="font-mono text-xs text-sc-dim hover:text-sc-gold transition-colors"
          >
            ← Back to practice
          </Link>
        </div>
      </main>
    </div>
  );
}
