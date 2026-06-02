"use client";

import Link from "next/link";
import { useState } from "react";

export interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GalleryHoverCarousel({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="flex gap-2 w-full h-[420px] overflow-hidden" role="list" aria-label="Company prep packs">
      {items.map((it, idx) => (
        <Link
          key={it.id}
          href={it.href}
          onMouseEnter={() => setActive(idx)}
          onFocus={() => setActive(idx)}
          className={`relative rounded-sc border border-sc-border bg-sc-surface overflow-hidden transition-all duration-300 ease-sc focus:outline-none focus-visible:ring-2 focus-visible:ring-sc-gold ${
            active === idx ? "shadow-sc-md" : "shadow-sc-sm"
          }`}
          style={{ flex: active === idx ? "5 1 0%" : "1 1 0%" }}
        >
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <span className="font-mono text-[10px] tracking-widest text-sc-gold uppercase">
              {it.subtitle}
            </span>
            <span
              className={`font-fraunces text-sc-ink leading-tight transition-all duration-500 ${
                active === idx ? "text-3xl" : "text-base"
              }`}
            >
              {it.title}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
