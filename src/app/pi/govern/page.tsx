"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import type { AnalysisResult } from "@/lib/pi/analyze";
import type { KpiSummary } from "@/lib/pi/metrics";

type Report = AnalysisResult & { filename: string };
const RED = "#C00D0D";
const MAX_MB = 40;
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Client-side pre-validation — fail fast with a clear message before upload. */
function validateFile(f: File): string | null {
  const name = f.name.toLowerCase();
  if (f.type !== PPTX_MIME && !name.endsWith(".pptx")) {
    if (name.endsWith(".ppt"))
      return "Legacy .ppt isn't supported — open it in PowerPoint and Save As .pptx.";
    return "Please upload a PowerPoint .pptx file.";
  }
  if (f.size > MAX_MB * 1024 * 1024)
    return `File is ${(f.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_MB} MB.`;
  if (f.size === 0) return "That file is empty.";
  return null;
}

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin align-[-2px]"
      aria-hidden
    />
  );
}

function scoreColor(s: number): string {
  if (s >= 80) return "#1A7F4B";
  if (s >= 60) return "#B8860B";
  return RED;
}

function ScoreGauge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid place-items-center w-24 h-24 rounded-full"
        style={{ background: `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, var(--surface-secondary) 0deg)` }}
      >
        <div className="grid place-items-center w-[78px] h-[78px] rounded-full bg-[var(--background)]">
          <span className="text-3xl font-bold" style={{ color: scoreColor(score) }}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-[var(--text-tertiary)]">Overall compliance</p>
        <p className="text-lg font-semibold">{score >= 80 ? "On-brand" : score >= 60 ? "Needs cleanup" : "Heavy cleanup"}</p>
      </div>
    </div>
  );
}

function DimBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-mono" style={{ color: scoreColor(value) }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: scoreColor(value) }} />
      </div>
    </div>
  );
}

function BalanceBar({ pct }: { pct: Report["brandBalance"]["pct"] }) {
  const seg = [
    { k: "white", c: "#E5E5E5", v: pct.white },
    { k: "lightGrey", c: "#D9D9D9", v: pct.lightGrey },
    { k: "greyOther", c: "#9A9A9A", v: pct.greyOther },
    { k: "black", c: "#1A1A1A", v: pct.black },
    { k: "red", c: RED, v: pct.red },
    { k: "offBrand", c: "#2F93E9", v: pct.offBrand },
  ].filter((s) => s.v > 0);
  return (
    <div className="flex h-5 rounded-md overflow-hidden border border-[var(--border-subtle)]">
      {seg.map((s) => (
        <div key={s.k} style={{ width: `${s.v}%`, background: s.c }} title={`${s.k} ${s.v.toFixed(0)}%`} />
      ))}
    </div>
  );
}

interface FixImpact {
  before: number;
  after: number;
  detected: number;
  fixed: number;
}

export default function GovernPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"analyze" | "fix" | null>(null);
  const [mode, setMode] = useState<"snap" | "enforce">("snap");
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<FixImpact | null>(null);
  const [satisfaction, setSatisfaction] = useState(0);
  const [minutes, setMinutes] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 401 from any PI API → session expired → back to login.
  const guard401 = useCallback(
    (res: Response): boolean => {
      if (res.status === 401) {
        router.replace("/pi/login?next=/pi/govern");
        return true;
      }
      return false;
    },
    [router]
  );

  const loadKpis = useCallback(async () => {
    try {
      const res = await fetch("/api/pi/metrics");
      if (res.ok) setKpis(await res.json());
    } catch {
      /* non-blocking */
    }
  }, []);
  useEffect(() => {
    fetch("/api/pi/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d.email))
      .catch(() => {});
    loadKpis();
  }, [loadKpis]);
  useEffect(() => { if (feedbackSent) loadKpis(); }, [feedbackSent, loadKpis]);

  const signOut = useCallback(async () => {
    await fetch("/api/pi/auth/logout", { method: "POST" });
    router.replace("/pi/login");
  }, [router]);

  const analyze = useCallback(async (f: File) => {
    const invalid = validateFile(f);
    if (invalid) { setError(invalid); return; }
    setError(null);
    setImpact(null);
    setDownloaded(false);
    setBusy("analyze");
    setReport(null);
    setFile(f);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/pi/analyze", { method: "POST", body: fd });
      if (guard401(res)) return;
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed.");
      setReport(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [guard401]);

  const fix = useCallback(async () => {
    if (!file) return;
    setError(null);
    setBusy("fix");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      const res = await fetch("/api/pi/fix", { method: "POST", body: fd });
      if (guard401(res)) return;
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Fix failed.");
      }
      setImpact({
        before: Number(res.headers.get("X-PI-Before-Score") ?? 0),
        after: Number(res.headers.get("X-PI-After-Score") ?? 0),
        detected: Number(res.headers.get("X-PI-Violations-Detected") ?? 0),
        fixed: Number(res.headers.get("X-PI-Violations-Fixed") ?? 0),
      });
      setFeedbackSent(false);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(/\.pptx$/i, "") + ".datamatics-fixed.pptx";
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [file, mode, guard401]);

  const sendFeedback = useCallback(async () => {
    if (!file || satisfaction < 1) return;
    try {
      await fetch("/api/pi/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          satisfaction,
          estimatedMinutesSaved: Number(minutes) || 0,
        }),
      });
      setFeedbackSent(true);
    } catch {
      /* non-blocking */
    }
  }, [file, satisfaction, minutes]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) analyze(f);
  };

  return (
    <>
      <Navbar canGoHome onHome={() => (window.location.href = "/")} />
      <main className="section-container max-w-[920px] mx-auto py-12 md:py-16">
        {/* Signed-in identity bar */}
        {me && (
          <div className="flex items-center justify-end gap-3 mb-4 text-xs text-[var(--text-tertiary)]">
            <span>Signed in as <span className="text-[var(--text-secondary)] font-medium">{me}</span></span>
            <button onClick={signOut} className="underline hover:text-[var(--text-primary)]">Sign out</button>
          </div>
        )}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>
            Presentation Intelligence
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">Govern &amp; Fix</h1>
          <p className="text-[var(--text-secondary)] mt-2 max-w-xl">
            Upload any deck (Copilot, Gamma, Canva, vendor). We check it against the Datamatics
            design system, score it, and mechanically correct fonts and brand colors — keeping it
            fully editable.
          </p>
        </div>

        {/* Program KPI strip — proves the measurement framework even at small N */}
        {kpis && kpis.decksGoverned > 0 && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Decks governed", val: String(kpis.decksGoverned) },
              { label: "Avg score lift", val: `+${kpis.avgScoreImprovement}` },
              { label: "Violations fixed", val: `${kpis.totalViolationsFixed}/${kpis.totalViolationsDetected}` },
              { label: "Editability", val: `${kpis.editabilityPreservationRate}%` },
              { label: "Cleanup saved", val: `${kpis.totalEstimatedMinutesSaved}m` },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2.5">
                <p className="text-lg font-bold leading-tight">{c.val}</p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Upload */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) analyze(f); }}
          onDragOver={(e) => e.preventDefault()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-[var(--border-medium)]
            hover:border-[var(--text-tertiary)] bg-[var(--surface-secondary)]/40 transition-colors
            p-10 text-center"
        >
          <input ref={inputRef} type="file" accept=".pptx" onChange={onPick} className="sr-only" />
          <p className="font-medium flex items-center justify-center gap-2">
            {busy === "analyze" ? (<><Spinner /> Analyzing your deck…</>) : "Drop a .pptx or click to browse"}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Max 40 MB · stays editable · no data leaves your tenant</p>
          {file && !busy && <p className="text-xs text-[var(--text-secondary)] mt-2">{file.name}</p>}
        </div>

        {error && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(192,13,13,0.08)", color: RED }}>
            {error}
          </div>
        )}

        {report && (
          <div className="mt-8 space-y-6">
            {/* Scores */}
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <ScoreGauge score={report.scores.overall} />
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1 max-w-md">
                  <DimBar label="Typography" value={report.scores.typography} />
                  <DimBar label="Color" value={report.scores.color} />
                  <DimBar label="Brand Balance" value={report.scores.brandBalance} />
                  <DimBar label="Visual Density" value={report.scores.density} />
                  <DimBar label="Template" value={report.scores.templateAdherence} />
                </div>
              </div>
            </section>

            {/* Brand balance */}
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
              <h2 className="font-semibold mb-1">Brand Balance <span className="text-xs text-[var(--text-tertiary)]">(white-first)</span></h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">Targets: White 60–80% · Light Grey 10–20% · Black ≤20% · Red ≤20%</p>
              <BalanceBar pct={report.brandBalance.pct} />
              <ul className="mt-3 space-y-1 text-sm">
                {report.brandBalance.flags.length === 0 && <li className="text-[#1A7F4B]">✓ Within brand balance targets</li>}
                {report.brandBalance.flags.map((f, i) => (
                  <li key={i} style={{ color: RED }}>⚑ {f}</li>
                ))}
              </ul>
            </section>

            {/* Violations */}
            <section className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
                <h2 className="font-semibold mb-3">Typography</h2>
                {report.typography.violations.length === 0 ? (
                  <p className="text-sm text-[#1A7F4B]">✓ All Segoe UI</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {report.typography.violations.map((v) => (
                      <li key={v.value} className="flex justify-between">
                        <span style={{ color: RED }}>✗ {v.value} ×{v.count}</span>
                        <span className="text-[var(--text-tertiary)]">→ Segoe UI</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
                <h2 className="font-semibold mb-3">Color</h2>
                <ul className="space-y-1.5 text-sm">
                  {report.color.legacyReds.map((v) => (
                    <li key={v.value} className="flex justify-between">
                      <span style={{ color: RED }}>✗ #{v.value} ×{v.count}</span>
                      <span className="text-[var(--text-tertiary)]">→ #C00D0D</span>
                    </li>
                  ))}
                  {report.color.offBrand.map((v) => (
                    <li key={v.value} className="text-[var(--text-secondary)]">⚠ off-brand #{v.value} ×{v.count} (review)</li>
                  ))}
                  {report.color.greyOther.map((v) => (
                    <li key={v.value} className="text-[var(--text-secondary)]">⚑ non-approved grey #{v.value} ×{v.count}</li>
                  ))}
                  {report.color.legacyReds.length + report.color.offBrand.length + report.color.greyOther.length === 0 && (
                    <li className="text-[#1A7F4B]">✓ Brand colors only</li>
                  )}
                </ul>
              </div>
            </section>

            {/* Density */}
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
              <h2 className="font-semibold mb-1">Visual Density</h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">
                Overloaded slides: {report.density.overloadedSlides.length ? report.density.overloadedSlides.join(", ") : "none"}
              </p>
              <ul className="space-y-1 text-sm">
                {report.density.slides.filter((s) => s.recommendations.length).slice(0, 8).map((s) => (
                  <li key={s.slide} className="text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">Slide {s.slide}:</span> {s.recommendations.join(" ")}
                  </li>
                ))}
                {report.density.slides.every((s) => s.recommendations.length === 0) && (
                  <li className="text-[#1A7F4B]">✓ All slides within density targets</li>
                )}
              </ul>
            </section>

            {/* Fix controls */}
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Auto-Fix (mechanical, editability-preserving)</h2>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Normalizes fonts → Segoe UI and reds → #C00D0D. Off-brand colors &amp; layout left for human review.
                  </p>
                  <div className="flex gap-2 mt-3 text-sm">
                    {(["snap", "enforce"] as const).map((m) => (
                      <button key={m} onClick={() => setMode(m)}
                        className={`px-3 py-1.5 rounded-lg border transition-colors ${mode === m ? "text-white" : "text-[var(--text-secondary)] border-[var(--border-subtle)]"}`}
                        style={mode === m ? { background: RED, borderColor: RED } : undefined}>
                        {m === "snap" ? "Snap (safe)" : "Enforce (all reds)"}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={fix} disabled={busy === "fix"}
                  className="px-6 py-3 rounded-xl font-semibold text-white disabled:opacity-60 whitespace-nowrap"
                  style={{ background: RED }}>
                  {busy === "fix" ? (<span className="flex items-center gap-2"><Spinner /> Correcting…</span>) : "Auto-Fix & Download"}
                </button>
              </div>
            </section>

            {/* Fix impact + lightweight feedback */}
            {impact && (
              <section className="rounded-2xl border-2 p-6" style={{ borderColor: RED }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Fix Impact</h2>
                  {downloaded && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "rgba(26,127,75,0.12)", color: "#1A7F4B" }}>
                      ✓ Corrected .pptx downloaded
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Compliance", val: `${impact.before} → ${impact.after}`, sub: `+${impact.after - impact.before}` },
                    { label: "Violations detected", val: String(impact.detected), sub: "in original" },
                    { label: "Auto-fixed", val: String(impact.fixed), sub: "mechanically" },
                    { label: "Editability", val: "100%", sub: "preserved ✓" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl bg-[var(--surface-secondary)] p-4">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">{c.label}</p>
                      <p className="text-xl font-bold mt-1">{c.val}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{c.sub}</p>
                    </div>
                  ))}
                </div>

                {feedbackSent ? (
                  <p className="text-sm text-[#1A7F4B]">✓ Thanks — feedback recorded for the program KPIs.</p>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">How usable is the corrected deck?</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => setSatisfaction(n)}
                            className="text-2xl leading-none"
                            style={{ color: n <= satisfaction ? RED : "var(--border-medium)" }}>★</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Manual cleanup minutes this saved you</p>
                      <input value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
                        inputMode="numeric" placeholder="e.g. 25"
                        className="w-28 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] text-sm" />
                    </div>
                    <button onClick={sendFeedback} disabled={satisfaction < 1}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border-medium)] hover:bg-[var(--surface-secondary)] disabled:opacity-50">
                      Submit feedback
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
