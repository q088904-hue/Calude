"use client";

/**
 * Onboarding — MeenTrack V2
 * First-run flow: Welcome → Harbor → Boat type → Species targets.
 * Calls onComplete() when the user finishes or skips.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, MapPin, Anchor } from "lucide-react";
import { PrimaryButton } from "../shared/Atoms";
import { gradients, springs } from "../tokens";
import { HARBOR_OPTIONS } from "../constants";

// ── Data ────────────────────────────────────────────────────────────────────────

// Single source of truth lives in ../constants (covers Kerala, Karnataka and
// Tamil Nadu — Colachel, Muttom, Chinnamuttom, Thoothukudi, Nagapattinam).
const HARBORS = HARBOR_OPTIONS;

const BOAT_TYPES = [
  { id: "trawler", label: "Trawler",      desc: "Deep sea · 12–60 nm" },
  { id: "country", label: "Country boat", desc: "Coastal · < 12 nm" },
  { id: "motor",   label: "Motorboat",    desc: "Inshore · < 8 nm" },
  { id: "frp",     label: "FRP boat",     desc: "Flexible range" },
];

const SPECIES_LIST = [
  "Seer", "Yellowfin", "Mackerel", "Sardine",
  "Tuna", "Pomfret", "Barracuda", "Snapper",
  "King Fish", "Squid",
];

// ── Slide transition ─────────────────────────────────────────────────────────────
/**
 * 24 px directional nudge instead of 55%:
 * The travel distance is tiny so mode="wait" (required for flex layout — can't
 * overlap two flex-1 panels) feels near-instant. Spring on x gives a natural
 * snap; 0.13 s opacity ensures the flash between steps is almost imperceptible.
 */
const slide = {
  initial: (d: number) => ({ x: d > 0 ? 24 : -24, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit:    (d: number) => ({ x: d > 0 ? -24 : 24, opacity: 0 }),
};

const tx = {
  x:       { type: "spring" as const, stiffness: 380, damping: 34 },
  opacity: { duration: 0.13, ease: "easeInOut" as const },
};

// ── Progress bar ─────────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="h-1 rounded-full"
          animate={{ width: i === step - 1 ? 28 : 8, background: i < step ? "var(--color-mt-aqua)" : "var(--color-mt-border)" }}
          transition={{ duration: 0.25 }}
        />
      ))}
    </div>
  );
}

// ── Step 0: Welcome ────────────────────────────────────────────────────────────

const LOCALES: { id: Locale; label: string; native: string }[] = [
  { id: "en", label: "English",   native: "English"    },
  { id: "ta", label: "Tamil",     native: "தமிழ்"      },
  { id: "ml", label: "Malayalam", native: "മലയാളം"     },
];

function WelcomeStep({
  onNext,
  onSkip,
  locale,
  onLocaleChange,
}: {
  onNext:          () => void;
  onSkip:          () => void;
  locale:          Locale;
  onLocaleChange:  (l: Locale) => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-6 pt-12 pb-8">
      {/* Ambient top glow */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[280px] opacity-[0.18]"
        style={{ background: gradients.topGlow }}
      />

      {/* Brand block */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-20 h-20 rounded-[24px] bg-mt-aqua/12 border border-mt-aqua/25 flex items-center justify-center mx-auto mb-5"
        >
          <Anchor className="w-9 h-9 text-mt-aqua" />
        </motion.div>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <h1 className="text-[34px] font-black text-mt-ink leading-none tracking-tight">
            MeenTrack
          </h1>
          <p className="text-mt-aqua font-semibold text-[13px] mt-1.5 tracking-widest uppercase">
            AI Fishing Intelligence
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="mt-8 mb-8"
        >
          <p className="text-[22px] font-bold text-mt-ink leading-snug mb-3">
            Fish smarter.<br />Stay safer.
          </p>
          <p className="text-[13px] text-mt-muted leading-relaxed max-w-[260px] mx-auto">
            Real-time PFZ zones, BiteTime™ scores, and AI-powered predictions for Kerala&apos;s coastal fishermen.
          </p>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="flex items-center gap-3"
        >
          <div className="flex -space-x-2">
            {["bg-mt-aqua/25", "bg-mt-green/25", "bg-mt-amber/25", "bg-mt-teal/25"].map((bgClass, i) => (
              <div key={i} className={`w-7 h-7 rounded-full border-2 border-mt-bg ${bgClass}`} />
            ))}
          </div>
          <p className="text-[12px] text-mt-muted">
            <span className="text-mt-ink font-semibold">12,400+</span> fishermen trust MeenTrack
          </p>
        </motion.div>

        {/* Language picker */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.3 }}
          className="flex items-center gap-2 mt-5"
        >
          {LOCALES.map(({ id, label, native }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.92 }}
              transition={springs.snap}
              aria-label={`${label}${locale === id ? " (selected)" : ""}`}
              aria-pressed={locale === id}
              onClick={() => onLocaleChange(id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all duration-150 ${
                locale === id
                  ? "bg-mt-aqua/15 border-mt-aqua/40 text-mt-aqua"
                  : "bg-mt-surface border-mt-border text-mt-dim"
              }`}
            >
              {native}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* CTAs */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="flex flex-col gap-3"
      >
        <PrimaryButton onClick={onNext}>
          Get started
          <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={springs.snap}
          onClick={onSkip}
          className="text-[13px] text-mt-dim font-medium py-2"
        >
          Skip for now
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── Step 1: Harbor ─────────────────────────────────────────────────────────────

function HarborStep({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-5 pb-8 overflow-y-auto scrollbar-none">
      <div className="mb-5">
        <h2 className="text-[24px] font-bold text-mt-ink leading-tight">
          Where do you fish from?
        </h2>
        <p className="text-[13px] text-mt-muted mt-1.5">
          We&apos;ll prioritise zones near your home port.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {HARBORS.map((h, i) => {
          const active = value === h.id;
          return (
            <motion.button
              key={h.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(h.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                opacity: { delay: 0.08 + i * 0.05, duration: 0.26, ease: "easeOut" },
                y:       { delay: 0.08 + i * 0.05, duration: 0.26, ease: "easeOut" },
                scale:   springs.snap,
              }}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] border transition-all duration-150 ${
                active ? "bg-mt-aqua/10 border-mt-aqua/40" : "bg-mt-surface border-mt-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <MapPin className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${active ? "text-mt-aqua" : "text-mt-dim"}`} />
                <div className="text-left">
                  <p className={`text-[14px] font-semibold transition-colors duration-150 ${active ? "text-mt-aqua" : "text-mt-ink"}`}>
                    {h.label}
                  </p>
                  <p className="text-[11px] text-mt-dim">{h.sub}</p>
                </div>
              </div>
              <AnimatePresence>
                {active && (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={springs.snap}
                    className="w-5 h-5 rounded-full bg-mt-aqua flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-3 h-3 text-mt-base" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 sticky bottom-0">
        <PrimaryButton onClick={onNext} disabled={!value}>
          Continue <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>
    </div>
  );
}

// ── Step 2: Boat type ──────────────────────────────────────────────────────────

function BoatStep({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-5 pb-8">
      <div className="mb-5">
        <h2 className="text-[24px] font-bold text-mt-ink leading-tight">
          What&apos;s your vessel?
        </h2>
        <p className="text-[13px] text-mt-muted mt-1.5">
          Helps us filter zones by safe fishing range.
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {BOAT_TYPES.map((b, i) => {
          const active = value === b.id;
          return (
            <motion.button
              key={b.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(b.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                opacity: { delay: 0.08 + i * 0.06, duration: 0.26, ease: "easeOut" },
                y:       { delay: 0.08 + i * 0.06, duration: 0.26, ease: "easeOut" },
                scale:   springs.snap,
              }}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-[16px] border transition-all duration-150 ${
                active ? "bg-mt-aqua/10 border-mt-aqua/40" : "bg-mt-surface border-mt-border"
              }`}
            >
              <div className="text-left">
                <p className={`text-[15px] font-semibold transition-colors duration-150 ${active ? "text-mt-aqua" : "text-mt-ink"}`}>
                  {b.label}
                </p>
                <p className="text-[12px] text-mt-dim mt-0.5">{b.desc}</p>
              </div>
              <AnimatePresence>
                {active && (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={springs.snap}
                    className="w-6 h-6 rounded-full bg-mt-aqua flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 text-mt-base" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5">
        <PrimaryButton onClick={onNext} disabled={!value}>
          Continue <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>
    </div>
  );
}

// ── Step 3: Species ────────────────────────────────────────────────────────────

function SpeciesStep({ value, onChange, onNext }: { value: string[]; onChange: (v: string[]) => void; onNext: () => void }) {
  function toggle(sp: string) {
    onChange(value.includes(sp) ? value.filter((s) => s !== sp) : [...value, sp]);
  }

  return (
    <div className="flex-1 flex flex-col px-5 pb-8">
      <div className="mb-5">
        <h2 className="text-[24px] font-bold text-mt-ink leading-tight">
          What do you target?
        </h2>
        <p className="text-[13px] text-mt-muted mt-1.5">
          Select all that apply — we&apos;ll weight AI predictions for your catches.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5 flex-1 content-start">
        {SPECIES_LIST.map((sp, i) => {
          const active = value.includes(sp);
          return (
            <motion.button
              key={sp}
              whileTap={{ scale: 0.93 }}
              onClick={() => toggle(sp)}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                opacity: { delay: 0.06 + i * 0.04, duration: 0.24, ease: "easeOut" },
                scale:   springs.snap,
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[13px] font-semibold transition-all duration-150 ${
                active
                  ? "bg-mt-aqua/15 border-mt-aqua/40 text-mt-aqua"
                  : "bg-mt-surface border-mt-border text-mt-muted"
              }`}
            >
              {/* Always rendered — opacity fade avoids the layout shift
                  that spring-scale causes (scale:0 still occupies layout space). */}
              <motion.span
                animate={{ opacity: active ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                className="flex-shrink-0 flex items-center"
              >
                <Check className="w-3 h-3" />
              </motion.span>
              {sp}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={onNext} disabled={value.length === 0}>
          {/* AnimatePresence cross-fades the two label states so the text
              and icon swap in sync with the button's transition-colors */}
          <AnimatePresence mode="wait" initial={false}>
            {value.length === 0 ? (
              <motion.span
                key="placeholder"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14 }}
              >
                Select at least one
              </motion.span>
            ) : (
              <motion.span
                key="done"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14 }}
                className="flex items-center gap-2"
              >
                Done — {value.length} selected
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </PrimaryButton>
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export type Locale = "en" | "ta" | "ml";

export type OnboardingData = {
  harbor:   string;
  boatType: string;
  species:  string[];
  locale:   Locale;
};

export function Onboarding({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const [step,     setStep]     = useState(0);
  const [dir,      setDir]      = useState(1);
  const [harbor,   setHarbor]   = useState("");
  const [boatType, setBoatType] = useState("");
  const [species,  setSpecies]  = useState<string[]>([]);
  const [locale,   setLocale]   = useState<Locale>("en");

  function finish() {
    onComplete({ harbor, boatType, species, locale });
  }

  function advance() {
    setDir(1);
    if (step >= 3) { finish(); } else { setStep((s) => s + 1); }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress bar + back + skip (hidden on welcome) */}
      <AnimatePresence>
        {step > 0 && (
          <motion.div
            key="onboarding-header"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0"
          >
            <div className="flex items-center gap-3">
              {/* Back button — reverses the slide direction */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                transition={springs.snap}
                aria-label="Go back"
                onClick={() => { setDir(-1); setStep((s) => s - 1); }}
                className="w-8 h-8 rounded-full bg-mt-surface border border-mt-border flex items-center justify-center flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-mt-muted" aria-hidden="true" />
              </motion.button>
              <ProgressBar step={step} total={3} />
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              transition={springs.snap}
              onClick={finish}
              className="text-[11px] text-mt-dim font-medium"
            >
              Skip
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={dir}>
        {step === 0 && (
          <motion.div key="welcome" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={tx} className="flex-1 flex flex-col overflow-hidden">
            <WelcomeStep onNext={advance} onSkip={finish} locale={locale} onLocaleChange={setLocale} />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="harbor" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={tx} className="flex-1 flex flex-col overflow-hidden">
            <HarborStep value={harbor} onChange={setHarbor} onNext={advance} />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="boat" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={tx} className="flex-1 flex flex-col overflow-hidden">
            <BoatStep value={boatType} onChange={setBoatType} onNext={advance} />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="species" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={tx} className="flex-1 flex flex-col overflow-hidden">
            <SpeciesStep value={species} onChange={setSpecies} onNext={advance} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Onboarding;
