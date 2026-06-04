"use client";

// Session history + progress dashboard for Stagecraft.
// Shows Kohler readiness composite, score trends over time,
// all-time grammar pattern frequency, and a reverse-chrono session list.

import { useEffect, useState } from "react";
import Link from "next/link";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
import { ScrollReveal } from "@/components/stagecraft/ScrollReveal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { HistoryPayload, SessionSummary } from "@/app/api/stagecraft/history/route";

// ─── Resolve CSS vars for Recharts (chart props don't accept CSS variables) ───

/** Reads a single --sc-* CSS custom property from the document root. */
function readScVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function useScColors() {
  const read = () => ({
    gold:  readScVar("--sc-gold",  "#C9973A"),
    muted: readScVar("--sc-muted", "#78746F"),
    green: readScVar("--sc-green", "#3D9A6E"),
    dim:   readScVar("--sc-dim",   "#48453F"),
  });
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(read()));
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

// ─── Trend computation helpers ───────────────────────────────────────────────

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Compare the last 3 sessions vs the 3 before that for a score axis.
 * sessions: newest-first. Returns +/- delta or null if not enough data.
 */
function scoreDelta(
  sessions: SessionSummary[],
  key: "avgEnglish" | "avgContent" | "avgDelivery",
): number | null {
  if (sessions.length < 4) return null;
  const recent = sessions.slice(0, 3).map((s) => s[key]);
  const older = sessions.slice(3, 6).map((s) => s[key]);
  if (older.length === 0) return null;
  return +(avg(recent) - avg(older)).toFixed(1);
}

/**
 * Per-pattern trend. sessions: newest-first.
 * Compares frequency/question in the last 3 sessions vs the 3 before.
 */
function patternTrend(
  sessions: SessionSummary[],
  tag: string,
): "improving" | "worsening" | "stable" | null {
  if (sessions.length < 4) return null;
  const rate = (s: SessionSummary) =>
    s.patterns.filter((p) => p === tag).length / Math.max(s.questionCount, 1);
  const recent = sessions.slice(0, 3);
  const older = sessions.slice(3, 6);
  if (older.length === 0) return null;
  const delta = avg(recent.map(rate)) - avg(older.map(rate));
  if (delta < -0.07) return "improving";
  if (delta > 0.07) return "worsening";
  return "stable";
}

/**
 * Per-session frequency for a pattern tag, for the mini sparkline.
 * Returns rates oldest→newest (for left-to-right display).
 */
function patternSparkData(
  sessions: SessionSummary[],
  tag: string,
  n = 6,
): number[] {
  return sessions
    .slice(0, n)
    .reverse() // oldest first = left side of chart
    .map((s) => s.patterns.filter((p) => p === tag).length / Math.max(s.questionCount, 1));
}

// ─────────────────────────────────────────────────────────────────────────────

const ROUND_LABELS: Record<string, string> = {
  hr: "HR",
  "hiring-manager": "Hiring Manager",
  portfolio: "Portfolio / CD",
  leadership: "Leadership / CXO",
  stress: "Curveball",
  mixed: "Mixed",
};

export default function HistoryPage() {
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stagecraft/history", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<HistoryPayload>;
      })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <StagecraftHeader label="History">
        <Link
          href="/stagecraft/patterns"
          className="rounded border border-sc-border bg-sc-surface px-3 py-1.5 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
        >
          Patterns
        </Link>
        <Link
          href="/stagecraft/memorize"
          className="flex items-center gap-1.5 rounded border border-sc-border bg-sc-surface px-3 py-1.5 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
        >
          <span className="text-sc-gold">♥</span>
          <span>Memorize queue</span>
        </Link>
      </StagecraftHeader>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-10">
        {/* Hero */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-3">
            Your progress
          </p>
          <h1 className="font-fraunces text-3xl font-semibold text-sc-ink leading-tight">
            Session history
          </h1>
        </div>

        {error ? (
          <div className="rounded-sm border border-sc-red/40 bg-sc-red/10 px-4 py-3 text-sm text-sc-red font-mono">
            {error}
          </div>
        ) : loading ? (
          <p className="font-mono text-xs tracking-widest text-sc-dim uppercase animate-pulse">
            Loading…
          </p>
        ) : !data || data.sessions.length === 0 ? (
          <div className="rounded-sm border border-dashed border-sc-border p-8 text-center space-y-3">
            <p className="font-mono text-xs text-sc-dim">No sessions yet</p>
            <p className="text-sm text-sc-muted">
              Complete a practice session and it will appear here.
            </p>
            <Link
              href="/stagecraft"
              className="inline-block rounded-sm bg-sc-gold px-4 py-2 text-sm font-semibold text-sc-void hover:brightness-110 transition-all"
            >
              Start a session →
            </Link>
          </div>
        ) : (
          <>
            {/* ── Summary strip ── */}
            <div className="grid grid-cols-3 gap-3">
              <KohlerCard value={data.kohlerReadiness} />
              <SummaryCard
                label="Sessions"
                value={String(data.sessions.length)}
              />
              <SummaryCard
                label="Questions"
                value={String(data.totalQuestions)}
              />
            </div>

            {/* ── Per-round breakdown ── */}
            {data.sessions.length >= 2 && (
              <RoundBreakdown sessions={data.sessions} />
            )}

            {/* ── Score trend chart ── */}
            {data.sessions.length >= 2 && (
              <TrendChart sessions={data.sessions} />
            )}

            {/* ── Progress insights ── */}
            <InsightStrip sessions={data.sessions} />

            {/* ── All-time pattern tags ── */}
            {data.allPatterns.length > 0 && (
              <PatternBoard patterns={data.allPatterns} sessions={data.sessions} />
            )}

            {/* ── Session list ── */}
            <SessionList sessions={data.sessions} />
          </>
        )}
      </main>
    </div>
  );
}

// ─── Kohler readiness card ───────────────────────────────────────────────────

function KohlerCard({ value }: { value: number | null }) {
  const ready = value !== null && value >= 8;
  const borderColor = ready
    ? "border-sc-green/40"
    : value !== null && value >= 6
      ? "border-sc-gold-dim"
      : "border-sc-border";
  const bg = ready
    ? "bg-sc-green-bg"
    : value !== null && value >= 6
      ? "bg-sc-gold-bg"
      : "bg-sc-surface";
  const textColor = ready
    ? "text-sc-green"
    : value !== null && value >= 6
      ? "text-sc-gold"
      : "text-sc-dim";

  return (
    <div className={`rounded-sm border px-4 py-3 ${borderColor} ${bg}`}>
      <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1">
        Readiness
      </p>
      <p className={`font-display text-3xl font-semibold ${textColor}`}>
        {value ?? "—"}
      </p>
      <p className="font-mono text-xs text-sc-dim mt-1">
        {ready ? "interview-ready" : value !== null ? "target: 8.0" : "do a session first"}
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3">
      <p className="font-mono text-xs tracking-widest text-sc-dim uppercase mb-1">
        {label}
      </p>
      <p className="font-display text-3xl font-semibold text-sc-ink">{value}</p>
    </div>
  );
}

// ─── Trend chart ─────────────────────────────────────────────────────────────

function TrendChart({ sessions }: { sessions: SessionSummary[] }) {
  const colors = useScColors();

  // Oldest first for the chart
  const chartData = [...sessions]
    .reverse()
    .slice(-12) // last 12 sessions
    .map((s, i) => ({
      n: i + 1,
      label: new Date(s.startedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      english: s.avgEnglish,
      content: s.avgContent,
      delivery: s.avgDelivery,
    }));

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm">
      <div className="px-4 py-3 border-b border-sc-line">
        <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
          Score trends — last {chartData.length} sessions
        </span>
      </div>
      <div className="px-2 py-4">
        <div className="flex items-center gap-4 px-2 pb-3">
          <Legend color={colors.gold}  label="English" />
          <Legend color={colors.muted} label="Content" />
          <Legend color={colors.green} label="Delivery" />
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fill: colors.dim, fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 5, 8, 10]}
              tick={{ fill: colors.dim, fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={8}
              stroke={colors.gold}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />
            <Line
              type="monotone"
              dataKey="english"
              stroke={colors.gold}
              strokeWidth={2}
              dot={{ fill: colors.gold, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="content"
              stroke={colors.muted}
              strokeWidth={1.5}
              strokeOpacity={0.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="delivery"
              stroke={colors.green}
              strokeWidth={1.5}
              strokeOpacity={0.6}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="px-2 font-mono text-xs text-sc-dim mt-1">
          — dashed line = 8.0 target
        </p>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs text-sc-muted">
      <span
        className="inline-block w-2.5 h-0.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-3 py-2 font-mono text-xs space-y-0.5">
      <p className="text-sc-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Per-round breakdown ─────────────────────────────────────────────────────

function RoundBreakdown({ sessions }: { sessions: SessionSummary[] }) {
  // Aggregate by round
  const roundMap = new Map<string, { sum: number; count: number; qs: number }>();
  for (const s of sessions) {
    const key = s.round;
    const r = roundMap.get(key) ?? { sum: 0, count: 0, qs: 0 };
    r.sum += s.composite;
    r.count += 1;
    r.qs += s.questionCount;
    roundMap.set(key, r);
  }

  const rounds = Array.from(roundMap.entries())
    .map(([round, { sum, count, qs }]) => ({
      round,
      label: ROUND_LABELS[round] ?? round,
      avg: +(sum / count).toFixed(1),
      sessions: count,
      questions: qs,
    }))
    .sort((a, b) => a.avg - b.avg); // weakest first

  if (rounds.length < 2) return null; // Only interesting when ≥2 distinct rounds

  const maxAvg = Math.max(...rounds.map((r) => r.avg));
  const weakest = rounds[0];

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-sc-line">
        <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
          Performance by round
        </span>
      </div>
      <div className="px-4 py-4 space-y-3">
        {rounds.map((r) => {
          const pct = maxAvg > 0 ? Math.round((r.avg / maxAvg) * 100) : 0;
          const isWeakest = r.round === weakest.round && r.avg < 7;
          const color =
            r.avg >= 8
              ? "bg-sc-green text-sc-green border-sc-green/30"
              : r.avg >= 6
                ? "bg-sc-gold text-sc-gold border-sc-gold-dim"
                : "bg-sc-red text-sc-red border-sc-red/30";
          const barColor =
            r.avg >= 8
              ? "bg-sc-green/30"
              : r.avg >= 6
                ? "bg-sc-gold/30"
                : "bg-sc-red/25";

          return (
            <div key={r.round} className="space-y-1">
              <div className="flex items-center gap-3">
                {/* Round label */}
                <span className="font-mono text-xs text-sc-muted w-28 shrink-0 truncate">
                  {r.label}
                </span>
                {/* Bar */}
                <div className="flex-1 h-2 bg-sc-border/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* Score */}
                <span
                  className={`font-mono text-xs font-semibold w-8 text-right shrink-0 ${
                    r.avg >= 8
                      ? "text-sc-green"
                      : r.avg >= 6
                        ? "text-sc-gold"
                        : "text-sc-red"
                  }`}
                >
                  {r.avg}
                </span>
                {/* Session count */}
                <span className="font-mono text-xs text-sc-dim w-12 shrink-0">
                  {r.sessions}s/{r.questions}q
                </span>
                {/* Weakest label + drill link */}
                {isWeakest && (
                  <Link
                    href={`/stagecraft?round=${encodeURIComponent(r.round)}`}
                    className="font-mono text-xs text-sc-red hover:text-sc-red/80 border border-sc-red/30 rounded-sm px-1.5 py-0.5 transition-colors shrink-0"
                    title="Start a targeted session for this round"
                  >
                    weakest — practice →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Progress insights strip ─────────────────────────────────────────────────

function InsightStrip({ sessions }: { sessions: SessionSummary[] }) {
  if (sessions.length < 2) return null;

  type Chip = { kind: "good" | "warn" | "info"; label: string };
  const chips: Chip[] = [];

  // With 4+ sessions: compute English trend
  const eDelta = sessions.length >= 4 ? scoreDelta(sessions, "avgEnglish") : null;
  if (eDelta !== null) {
    if (eDelta >= 0.3) {
      chips.push({ kind: "good", label: `English +${eDelta} pts — improving` });
    } else if (eDelta <= -0.3) {
      chips.push({ kind: "warn", label: `English −${Math.abs(eDelta)} pts — needs focus` });
    } else {
      chips.push({ kind: "info", label: `English stable over last 6 sessions` });
    }
  }

  // From 2+ sessions: compare last vs previous composite
  if (sessions.length >= 2) {
    const last = sessions[0].composite;
    const prev = sessions[1].composite;
    const delta = +(last - prev).toFixed(1);
    if (delta >= 0.5) {
      chips.push({ kind: "good", label: `Last session up ${delta} pts vs previous` });
    } else if (delta <= -0.5) {
      chips.push({ kind: "warn", label: `Last session down ${Math.abs(delta)} pts — review patterns` });
    }
  }

  // Pattern trends (4+ sessions)
  if (sessions.length >= 4) {
    const recentTags = [...new Set(sessions.slice(0, 6).flatMap((s) => s.patterns))];
    const improving = recentTags.filter(
      (t) => patternTrend(sessions, t) === "improving",
    );
    const worsening = recentTags.filter(
      (t) => patternTrend(sessions, t) === "worsening",
    );
    if (improving.length > 0) {
      chips.push({ kind: "good", label: `${improving[0]} — occurring less` });
    }
    if (worsening.length > 0) {
      chips.push({ kind: "warn", label: `${worsening[0]} — still increasing` });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-xs ${
            c.kind === "good"
              ? "border-sc-green/30 bg-sc-green-bg text-sc-green"
              : c.kind === "warn"
                ? "border-sc-red/30 bg-sc-red/5 text-sc-red"
                : "border-sc-border bg-sc-surface text-sc-muted"
          }`}
        >
          <span className="opacity-70">
            {c.kind === "good" ? "↑" : c.kind === "warn" ? "⚠" : "—"}
          </span>
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ─── Pattern board ───────────────────────────────────────────────────────────

function PatternBoard({
  patterns,
  sessions,
}: {
  patterns: { tag: string; count: number }[];
  sessions: SessionSummary[];
}) {
  const top = patterns.slice(0, 14);
  const max = top[0]?.count ?? 1;
  const hasTrends = sessions.length >= 4;

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm">
      <div className="px-4 py-3 border-b border-sc-line flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
          Grammar patterns — all time
        </span>
        {hasTrends && (
          <span className="font-mono text-xs text-sc-dim">
            dots = last {Math.min(sessions.length, 6)} sessions · ↓↑ trend
          </span>
        )}
      </div>
      <div className="px-4 py-4 space-y-2.5">
        {top.map(({ tag, count }) => {
          const pct = Math.round((count / max) * 100);
          const trend = hasTrends ? patternTrend(sessions, tag) : null;
          const spark = patternSparkData(sessions, tag, 6);

          const heat =
            pct >= 80
              ? "bg-sc-red/30 text-sc-red border-sc-red/30"
              : pct >= 50
                ? "bg-sc-gold-bg text-sc-gold border-sc-gold-dim"
                : "bg-sc-raised text-sc-muted border-sc-border";

          const trendColor =
            trend === "improving"
              ? "text-sc-green"
              : trend === "worsening"
                ? "text-sc-red"
                : "text-sc-border";
          const trendArrow =
            trend === "improving" ? "↓" : trend === "worsening" ? "↑" : "→";

          return (
            <div key={tag} className="flex items-center gap-2.5">
              {/* Tag label */}
              <span
                className={`rounded-sm border px-2 py-0.5 font-mono text-xs ${heat} shrink-0 min-w-[6.5rem]`}
              >
                {tag}
              </span>

              {/* Mini sparkline — one dot per recent session */}
              {hasTrends && (
                <span className="flex items-center gap-0.5 shrink-0">
                  {spark.map((rate, si) => {
                    const opacity = rate === 0 ? 0.12 : Math.min(0.25 + rate * 3, 1);
                    return (
                      <span
                        key={si}
                        className="inline-block w-1.5 h-1.5 rounded-full bg-sc-gold"
                        style={{ opacity }}
                        title={`Session −${spark.length - si}: ${(rate * 10).toFixed(1)}/Q`}
                      />
                    );
                  })}
                </span>
              )}

              {/* Frequency bar */}
              <div className="flex-1 h-px bg-sc-border relative">
                <div
                  className="absolute top-0 left-0 h-px bg-sc-gold/40"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Trend arrow */}
              {trend && (
                <span className={`font-mono text-xs ${trendColor} shrink-0 w-3 text-center`}>
                  {trendArrow}
                </span>
              )}

              {/* Count */}
              <span className="font-mono text-xs text-sc-dim shrink-0">×{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Session list ─────────────────────────────────────────────────────────────

function SessionList({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs tracking-widest text-sc-dim uppercase">
        Past sessions
      </h2>
      {sessions.map((s, i) => (
        <ScrollReveal key={s.id} delay={Math.min(i * 60, 600)}>
          <SessionRow session={s} index={i} />
        </ScrollReveal>
      ))}
    </div>
  );
}

function SessionRow({
  session: s,
  index,
}: {
  session: SessionSummary;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `sc-session-panel-${s.id}`;

  const dateStr = new Date(s.startedAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const readinessColor =
    s.composite >= 8
      ? "text-sc-green"
      : s.composite >= 6
        ? "text-sc-gold"
        : "text-sc-red";

  // Unique pattern tags for this session
  const uniquePatterns = [...new Set(s.patterns)].slice(0, 5);

  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-sc-raised transition-colors"
      >
        <span className="font-mono text-xs text-sc-dim w-5 shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sc-ink truncate">{s.role}</p>
          <p className="font-mono text-xs text-sc-dim mt-0.5">
            {dateStr} · {ROUND_LABELS[s.round] ?? s.round} ·{" "}
            {s.questionCount}Q
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`font-display text-lg font-semibold ${readinessColor}`}
          >
            {s.composite}
          </span>
          <div className="flex gap-1.5">
            <ScorePill label="C" value={s.avgContent} />
            <ScorePill label="E" value={s.avgEnglish} />
            <ScorePill label="D" value={s.avgDelivery} />
          </div>
          <span className="font-mono text-xs text-sc-dim">
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {open && (
        <div id={panelId} className="border-t border-sc-line px-4 py-3 space-y-3">
          {/* Pattern tags */}
          {uniquePatterns.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {uniquePatterns.map((p) => (
                <span
                  key={p}
                  className="rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-2 py-0.5 font-mono text-xs text-sc-muted"
                >
                  {p}
                </span>
              ))}
              {s.patterns.length > uniquePatterns.length * 1 && (
                <span className="font-mono text-xs text-sc-dim self-center">
                  +{s.patterns.length - uniquePatterns.length} more
                </span>
              )}
            </div>
          ) : (
            <p className="font-mono text-xs text-sc-dim">No patterns flagged</p>
          )}

          {/* Session detail link */}
          <div className="flex gap-2">
            <Link
              href={`/stagecraft/history/${s.id}`}
              className="inline-block rounded-sm border border-sc-gold-dim bg-sc-gold-bg px-3 py-1.5 font-mono text-xs text-sc-gold hover:bg-sc-gold/20 transition-colors"
            >
              Review session →
            </Link>
            <Link
              href="/stagecraft"
              className="inline-block rounded-sc border border-sc-border bg-sc-raised shadow-sc-sm px-3 py-1.5 font-mono text-xs text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors"
            >
              New session →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const color =
    value >= 8
      ? "text-sc-green"
      : value >= 5
        ? "text-sc-gold"
        : "text-sc-red";
  return (
    <span className={`font-mono text-xs ${color}`}>
      {label}
      {value}
    </span>
  );
}
