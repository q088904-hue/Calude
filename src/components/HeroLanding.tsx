"use client";


import Floating, { FloatingElement } from "@/components/ui/parallax-floating";

interface HeroLandingProps {
  onStart: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

/* ─────────────────────────────────────────────────────
   DESIGN CARD COMPONENTS — floating around the hero
   ───────────────────────────────────────────────────── */

function CardBrandPalette() {
  return (
    <div className="w-[120px] md:w-[148px] rounded-xl overflow-hidden border border-white/10 shadow-xl">
      <div className="h-8 w-full bg-[#E4002B]" />
      <div className="h-5 w-full bg-[#1a1a1a]" />
      <div className="h-4 w-full bg-[#333]" />
      <div className="h-3 w-full bg-[#555]" />
      <div className="bg-[#111] dark:bg-[#0d0d0d] px-3 py-2">
        <div className="h-1.5 w-2/3 rounded bg-white/20 mb-1.5" />
        <div className="h-1.5 w-1/2 rounded bg-white/10" />
      </div>
    </div>
  );
}

function CardTypography() {
  return (
    <div className="w-[100px] md:w-[124px] rounded-xl border border-white/10 bg-[#111]/90 dark:bg-[#0e0e0e]/90 backdrop-blur-sm shadow-xl p-4">
      <p className="text-white/20 text-[9px] uppercase tracking-[0.15em] mb-2">Typography</p>
      <p className="text-white font-bold text-4xl leading-none tracking-tighter">Aa</p>
      <p className="text-white/40 text-[8px] mt-3 leading-tight">Inter · 700<br/>Plus Jakarta</p>
    </div>
  );
}

function CardUILayout() {
  return (
    <div className="w-[136px] md:w-[164px] rounded-xl border border-white/10 bg-[#0d0d0d]/90 backdrop-blur-sm shadow-xl overflow-hidden">
      {/* fake browser chrome */}
      <div className="bg-[#1a1a1a] h-6 flex items-center gap-1.5 px-3">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
      </div>
      <div className="p-3 space-y-2">
        <div className="h-2 w-full rounded bg-white/15" />
        <div className="h-2 w-4/5 rounded bg-white/10" />
        <div className="h-8 w-full rounded-lg bg-[#E4002B]/80 mt-3 flex items-center justify-center">
          <div className="h-1.5 w-12 rounded bg-white/60" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <div className="h-6 rounded bg-white/8 border border-white/5" />
          <div className="h-6 rounded bg-white/8 border border-white/5" />
        </div>
      </div>
    </div>
  );
}

function CardHeatmap() {
  const cells = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div className="w-[90px] md:w-[108px] rounded-xl border border-white/10 bg-[#111]/90 backdrop-blur-sm shadow-xl overflow-hidden">
      <div className="p-2">
        <p className="text-white/30 text-[7px] uppercase tracking-widest mb-2">Heat Map</p>
        <div className="grid grid-cols-8 gap-0.5">
          {cells.map((i) => {
            const intensity = Math.random();
            const opacity = 0.05 + intensity * 0.9;
            const hue = intensity > 0.7 ? "#E4002B" : intensity > 0.4 ? "#ff6b35" : "#ffcc44";
            return (
              <div
                key={i}
                className="rounded-[1px]"
                style={{ height: 7, backgroundColor: hue, opacity }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CardScore() {
  return (
    <div className="w-[90px] md:w-[108px] rounded-xl border border-white/10 bg-[#111]/90 backdrop-blur-sm shadow-xl p-3">
      <p className="text-white/30 text-[7px] uppercase tracking-widest mb-2">Score</p>
      <p className="text-white font-bold text-3xl leading-none">87</p>
      <p className="text-white/30 text-[8px] mt-0.5">/100</p>
      <div className="mt-3 space-y-1">
        {[75, 90, 82, 68].map((v, i) => (
          <div key={i} className="h-1 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#E4002B]"
              style={{ width: `${v}%`, opacity: 0.7 + i * 0.075 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CardGradientBlob() {
  return (
    <div className="w-[110px] md:w-[132px] aspect-square rounded-2xl shadow-xl overflow-hidden border border-white/10"
      style={{
        background: "radial-gradient(circle at 30% 40%, #E4002B 0%, #7c0017 40%, #1a0a0e 100%)",
      }}
    >
      <div className="w-full h-full flex items-end p-3">
        <div className="space-y-1">
          <div className="h-1 w-8 rounded bg-white/30" />
          <div className="h-1 w-5 rounded bg-white/15" />
        </div>
      </div>
    </div>
  );
}

function CardAnalysisTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full bg-[#1a1a1a]/90 dark:bg-[#111]/90 backdrop-blur-sm border border-white/10
      px-3 py-1.5 shadow-lg flex items-center gap-2 whitespace-nowrap">
      <div className="w-1.5 h-1.5 rounded-full bg-[#E4002B]" />
      <span className="text-white/60 text-[10px] font-medium">{label}</span>
      <span className="text-white text-[10px] font-semibold">{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MAIN HERO
   ───────────────────────────────────────────────────── */

export default function HeroLanding({ onStart }: HeroLandingProps) {

  return (
    <section
      className="relative min-h-[calc(100svh-56px)] flex items-center justify-center overflow-hidden
        bg-[var(--background)]"
    >
      {/* ── Noise grain ── */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── Subtle radial glow — adapts to theme ── */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(228,0,43,0.06) 0%, transparent 70%)",
        }}
      />

      {/* ── Floating parallax cards ── */}
      <Floating sensitivity={-0.8} easingFactor={0.04} className="z-[2]">

        {/* ── Top-left cluster ── */}
        <FloatingElement depth={0.8} className="top-[5%] left-[2%] xl:left-[5%]">
          <div className="float-card-1"><CardBrandPalette /></div>
        </FloatingElement>

        <FloatingElement depth={2} className="top-[22%] left-[14%] xl:left-[17%]">
          <div className="float-card-2 hidden md:block"><CardAnalysisTag label="Hierarchy" value="Strong" /></div>
        </FloatingElement>

        {/* ── Top-right cluster ── */}
        <FloatingElement depth={1.5} className="top-[4%] right-[2%] xl:right-[5%]">
          <div className="float-card-3"><CardUILayout /></div>
        </FloatingElement>

        <FloatingElement depth={0.6} className="top-[24%] right-[14%] xl:right-[17%]">
          <div className="float-card-4 hidden md:block"><CardAnalysisTag label="CTA Visibility" value="68%" /></div>
        </FloatingElement>

        {/* ── Mid-left (hidden on mobile to avoid text overlap) ── */}
        <FloatingElement depth={3} className="top-[40%] left-[1%] xl:left-[3%]">
          <div className="float-card-5 hidden md:block"><CardScore /></div>
        </FloatingElement>

        <FloatingElement depth={1.2} className="top-[58%] left-[13%] xl:left-[16%]">
          <div className="float-card-6 hidden md:block"><CardAnalysisTag label="Contrast" value="AA ✓" /></div>
        </FloatingElement>

        {/* ── Mid-right (hidden on mobile to avoid text overlap) ── */}
        <FloatingElement depth={2.5} className="top-[38%] right-[1%] xl:right-[3%]">
          <div className="float-card-7 hidden md:block"><CardTypography /></div>
        </FloatingElement>

        <FloatingElement depth={1} className="top-[56%] right-[13%] xl:right-[16%]">
          <div className="float-card-8 hidden md:block"><CardAnalysisTag label="Brand Fit" value="91%" /></div>
        </FloatingElement>

        {/* ── Bottom cluster ── */}
        <FloatingElement depth={1.8} className="bottom-[8%] left-[2%] xl:left-[6%]">
          <div className="float-card-9"><CardHeatmap /></div>
        </FloatingElement>

        <FloatingElement depth={0.7} className="bottom-[6%] right-[2%] xl:right-[6%]">
          <div className="float-card-10"><CardGradientBlob /></div>
        </FloatingElement>

        <FloatingElement depth={1.4} className="bottom-[22%] left-[16%] xl:left-[20%]">
          <div className="float-card-11 hidden md:block"><CardAnalysisTag label="Typography" value="3 issues" /></div>
        </FloatingElement>

        <FloatingElement depth={0.9} className="bottom-[22%] right-[16%] xl:right-[20%]">
          <div className="float-card-12 hidden md:block"><CardAnalysisTag label="Eye Flow" value="F-pattern" /></div>
        </FloatingElement>
      </Floating>

      {/* ── Center content — above parallax ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[660px]">

        {/* Label */}
        <div className="hero-enter-1 mb-8 inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] uppercase
            text-[var(--text-tertiary)]">
          <span className="w-4 h-px bg-[var(--text-tertiary)] opacity-50" />
          Design Intelligence Platform
          <span className="w-4 h-px bg-[var(--text-tertiary)] opacity-50" />
        </div>

        {/* Headline */}
        <h1 className="hero-enter-2 text-[clamp(2.6rem,6vw,5rem)] font-bold leading-[1.05] tracking-[-0.03em]
            text-[var(--text-primary)] mb-6">
          Your design isn&apos;t
          <br />being judged.
          <br />
          <span className="text-[#E4002B]">It&apos;s being</span>
          <br />
          <em className="not-italic text-[#E4002B]">understood.</em>
        </h1>

        {/* Subhead */}
        <p className="hero-enter-3 text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[420px] mb-10">
          AI-powered design analysis built for{" "}
          <span className="text-[var(--text-primary)] font-medium">
            Datamatics-level precision.
          </span>
        </p>

        {/* CTAs */}
        <div className="hero-enter-4 flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={onStart}
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5
              bg-[var(--text-primary)] text-[var(--text-inverse)]
              rounded-full text-[14px] font-semibold
              hover:opacity-90 active:scale-[0.97]
              transition-all duration-200
              shadow-[0_2px_20px_rgba(0,0,0,0.15)]"
          >
            Analyze Your Design
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7H11M8 4L11 7L8 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            className="inline-flex items-center gap-2 px-5 py-3.5
              rounded-full text-[14px] font-medium
              text-[var(--text-secondary)] hover:text-[var(--text-primary)]
              border border-[var(--border-subtle)] hover:border-[var(--border-medium)]
              hover:bg-[var(--surface-secondary)]
              transition-all duration-200"
          >
            View sample
          </button>
        </div>

        {/* Subtle divider + proof line */}
        <div className="hero-enter-5 mt-12 flex items-center gap-4 text-[11px] text-[var(--text-tertiary)] tracking-wide">
          <span>PNG · JPG · PDF · PPTX</span>
          <span className="w-px h-3 bg-[var(--border-subtle)]" />
          <span>10 design dimensions</span>
          <span className="w-px h-3 bg-[var(--border-subtle)]" />
          <span>~20 sec</span>
        </div>
      </div>

      {/* ── Bottom fade — blends cards into content area ── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 z-[5]"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />
    </section>
  );
}
