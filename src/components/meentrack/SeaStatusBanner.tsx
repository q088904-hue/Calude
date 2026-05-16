"use client";

// Feature: Sea Status Banner
// Outcome: #1 Safety first
// Success metric: 0 trips started under Red/No-Go — enforced by blocking "Start Trip" CTA
//
// Rules:
//   - Always visible at top of every screen
//   - Red / No-Go: NOT dismissible
//   - If both IMD + INCOIS unreachable: show "Unverified" badge, never silently default to Green

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle, WifiOff } from "lucide-react";

export type SeaLevel = "green" | "amber" | "red" | "nogo";

interface Props {
  level: SeaLevel;
  waveHeight?: number;      // metres
  source?: string;          // "INCOIS" | "IMD" | "Open-Meteo"
  isStale?: boolean;        // true when both primary sources unreachable
  locale?: "en" | "ta" | "ml";
}

const CONFIG: Record<SeaLevel, {
  bg:      string;
  border:  string;
  text:    string;
  icon:    React.ElementType;
  labelEn: string;
  labelTa: string;
  labelMl: string;
  /** ARIA live role — "alert" for dangerous levels, "status" for informational. */
  role:    "alert" | "status";
}> = {
  green: {
    bg:      "bg-mt-green/10",
    border:  "border-mt-green/30",
    text:    "text-mt-green",
    icon:    CheckCircle,
    labelEn: "Safe to fish",
    labelTa: "மீன் பிடிக்க பாதுகாப்பு",
    labelMl: "മീൻപിടിത്തം സുരക്ഷിതം",
    role:    "status",
  },
  amber: {
    bg:      "bg-mt-amber/10",
    border:  "border-mt-amber/30",
    text:    "text-mt-amber",
    icon:    AlertTriangle,
    labelEn: "Caution",
    labelTa: "எச்சரிக்கை",
    labelMl: "ശ്രദ്ധിക്കുക",
    role:    "status",
  },
  red: {
    bg:      "bg-mt-red/10",
    border:  "border-mt-red/30",
    text:    "text-mt-red",
    icon:    AlertTriangle,
    labelEn: "Dangerous · Return to harbor",
    labelTa: "ஆபத்து · துறைமுகம் திரும்பவும்",
    labelMl: "അപകടം · തുറമുഖത്തേക്ക് മടങ്ങുക",
    role:    "alert",
  },
  nogo: {
    bg:      "bg-mt-crimson/20",
    border:  "border-mt-crimson/50",
    text:    "text-mt-red",
    icon:    XCircle,
    labelEn: "Do not go to sea today",
    labelTa: "இன்று கடலுக்கு போகவேண்டாம்",
    labelMl: "ഇന്ന് കടലിൽ പോകരുത്",
    role:    "alert",
  },
};

export function SeaStatusBanner({
  level,
  waveHeight,
  source = "INCOIS",
  isStale = false,
  locale = "en",
}: Props) {
  const cfg = CONFIG[level];
  const Icon = cfg.icon;
  const label =
    locale === "ta" ? cfg.labelTa : locale === "ml" ? cfg.labelMl : cfg.labelEn;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${level}-${locale}`}
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -4, opacity: 0 }}
        transition={{ duration: 0.15 }}
        role={cfg.role}
        className={`w-full flex items-center gap-3 px-4 py-2.5 border-b ${cfg.bg} ${cfg.border}`}
      >
        {/* Decorative — label text conveys the same meaning */}
        <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.text}`} aria-hidden="true" />

        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${cfg.text}`}>{label}</span>

          {waveHeight !== undefined && (
            <span className="text-xs text-mt-muted">
              · Waves{" "}
              <span
                className={
                  waveHeight >= 2.5
                    ? "text-mt-red"
                    : waveHeight >= 1.5
                    ? "text-mt-amber"
                    : "text-mt-green"
                }
              >
                {waveHeight.toFixed(1)} m
              </span>
            </span>
          )}

          {isStale && (
            <span className="flex items-center gap-1 text-mt-amber text-xs bg-mt-amber/10 px-2 py-0.5 rounded-full">
              <WifiOff className="w-3 h-3" aria-hidden="true" />
              Unverified · use caution
            </span>
          )}
        </div>

        <span className="text-mt-muted text-xs flex-shrink-0">{source}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// Full-screen No-Go modal — blocks Start Trip
export function NoGoModal({ locale = "en" }: { locale?: "en" | "ta" | "ml" }) {
  const headline =
    locale === "ta"
      ? "இன்று கடலுக்கு போகவேண்டாம்."
      : locale === "ml"
      ? "ഇന്ന് കടലിൽ പോകരുത്."
      : "Do not go to sea today.";

  const sub =
    locale === "ta"
      ? "IMD கடுமையான சூறாவளி எச்சரிக்கை · அலை 4.2 மீ"
      : locale === "ml"
      ? "IMD ഗുരുതര ചുഴലിക്കാറ്റ് മുന്നറിയിപ്പ് · തിര 4.2 മീ"
      : "IMD severe cyclone warning · Waves 4.2 m";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="nogo-headline"
      className="fixed inset-0 z-50 bg-mt-bg flex flex-col items-center justify-center px-6 gap-6"
    >
      <XCircle className="w-20 h-20 text-mt-crimson" aria-hidden="true" />
      <h1
        id="nogo-headline"
        className="text-mt-ink text-3xl font-bold text-center leading-snug"
      >
        {headline}
      </h1>
      <p className="text-mt-muted text-base text-center">{sub}</p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="mt-4 min-h-[56px] px-8 rounded-xl bg-mt-raised border border-mt-border text-mt-ink text-base font-semibold"
      >
        Back to home
      </motion.button>
    </div>
  );
}

export default SeaStatusBanner;
