"use client";

// Compact, omnipresent interview countdown for the shared header — so the
// days-left urgency follows the user across every Stagecraft page. Reads the
// interview date from config; renders nothing when no date is set or it's past.
// Reuses the shared computeCountdown util (no duplicate math).

import { useEffect, useState } from "react";
import { computeCountdown, type CountdownUrgency } from "@/lib/stagecraft/countdown";

const URGENCY_COLOR: Record<CountdownUrgency, string> = {
  today: "text-sc-green",
  urgent: "text-sc-red",
  soon: "text-sc-gold",
  far: "text-sc-dim",
  past: "text-sc-dim",
};

export function CountdownChip() {
  const [info, setInfo] = useState<{
    label: string;
    urgency: CountdownUrgency;
    company?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/stagecraft/config", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ interviewDate?: string; interviewCompany?: string }>)
      .then((cfg) => {
        if (!cfg.interviewDate) return;
        const c = computeCountdown(cfg.interviewDate);
        if (c.urgency === "past") return;
        setInfo({ label: c.label, urgency: c.urgency, company: cfg.interviewCompany });
      })
      .catch(() => {});
  }, []);

  if (!info) return null;

  return (
    <span
      title={info.company ? `Interview: ${info.company}` : "Interview countdown"}
      className={`font-mono text-xs font-medium whitespace-nowrap ${URGENCY_COLOR[info.urgency]}`}
    >
      ◷ {info.label}
    </span>
  );
}
