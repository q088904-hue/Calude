"use client";

import { useEffect, useState } from "react";

export function GooeyText({
  texts,
  interval = 2600,
  className = "",
}: {
  texts: string[];
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduce || texts.length < 2) return;
    const id = setInterval(() => setI((p) => (p + 1) % texts.length), interval);
    return () => clearInterval(id);
  }, [texts.length, interval, reduce]);

  return (
    <span className={`relative inline-block ${className}`}>
      <svg aria-hidden className="absolute w-0 h-0">
        <defs>
          <filter id="sc-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
            <feColorMatrix
              in="b"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8"
            />
          </filter>
        </defs>
      </svg>
      <span style={{ filter: "url(#sc-goo)" }} className="block">
        {texts.map((t, idx) => (
          <span
            key={t}
            aria-hidden={idx !== i}
            className="block transition-opacity duration-500"
            style={{
              position: idx === i ? "relative" : "absolute",
              inset: idx === i ? undefined : 0,
              opacity: idx === i ? 1 : 0,
            }}
          >
            {t}
          </span>
        ))}
      </span>
      <span className="sr-only">{texts[i]}</span>
    </span>
  );
}
