"use client";

// Profile editor — lets the user update every field that drives coaching
// quality without touching source files.
// Reads from /api/stagecraft/profile (GET) and saves back via POST.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Profile, StarStory } from "@/lib/stagecraft/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function lines(arr: string[]): string {
  return arr.join("\n");
}
function fromLines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Interview target config (separate from profile) ──────────────────────
  const [configState, setConfigState] = useState<{
    interviewDate: string;
    interviewCompany: string;
  }>({ interviewDate: "", interviewCompany: "" });
  const [configSaved, setConfigSaved] = useState(false);
  const configSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configInitialized = useRef(false);

  useEffect(() => {
    fetch("/api/stagecraft/profile", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<Profile>;
      })
      .then(setProfile)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/stagecraft/config", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ interviewDate?: string; interviewCompany?: string }>)
      .then((c) => {
        setConfigState({
          interviewDate: c.interviewDate ?? "",
          interviewCompany: c.interviewCompany ?? "",
        });
        configInitialized.current = true;
      })
      .catch(() => {
        configInitialized.current = true;
      });
  }, []);

  const save = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/stagecraft/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }, [profile]);

  const reset = useCallback(async () => {
    if (!confirm("Restore the default profile? Your changes will be discarded.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/stagecraft/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const fresh = (await res.json()) as Profile;
      setProfile(fresh);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }, []);

  const patch = useCallback(
    <K extends keyof Profile>(key: K, value: Profile[K]) => {
      setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

  const patchStory = useCallback(
    (i: number, field: keyof StarStory, value: string | string[]) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const stories = [...prev.starStories];
        stories[i] = { ...stories[i], [field]: value };
        return { ...prev, starStories: stories };
      });
    },
    [],
  );

  // Auto-save interview config with 600 ms debounce
  useEffect(() => {
    if (!configInitialized.current) return;
    if (configDebounceRef.current) clearTimeout(configDebounceRef.current);
    configDebounceRef.current = setTimeout(() => {
      fetch("/api/stagecraft/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewDate: configState.interviewDate,
          interviewCompany: configState.interviewCompany,
        }),
      })
        .then(() => {
          setConfigSaved(true);
          if (configSavedTimerRef.current) clearTimeout(configSavedTimerRef.current);
          configSavedTimerRef.current = setTimeout(() => setConfigSaved(false), 2000);
        })
        .catch(() => {});
    }, 600);
  }, [configState]);

  const patchConfig = useCallback(
    (key: "interviewDate" | "interviewCompany", value: string) => {
      setConfigState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      {/* Header */}
      <header className="border-b border-sc-border px-6 py-4 flex items-center justify-between sticky top-0 bg-sc-bg z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors"
          >
            ← Home
          </Link>
          <span className="text-sc-border text-xs">·</span>
          <Link
            href="/stagecraft"
            className="font-mono text-xs text-sc-muted hover:text-sc-gold transition-colors"
          >
            Stagecraft
          </Link>
          <span className="text-sc-border text-xs">·</span>
          <span className="font-display text-base font-semibold text-sc-ink">
            Profile
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={saving || loading}
            className="rounded-sm border border-sc-border bg-sc-surface px-3 py-1.5 text-xs font-mono text-sc-dim hover:border-sc-red/40 hover:text-sc-red transition-colors disabled:opacity-30"
          >
            Restore defaults
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !profile}
            className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition-all disabled:opacity-30 ${
              saved
                ? "bg-sc-green-bg border border-sc-green/40 text-sc-green"
                : "bg-sc-gold text-sc-void hover:brightness-110"
            }`}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save profile"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-10">
        {/* Hero */}
        <div>
          <p className="font-mono text-xs tracking-widest text-sc-gold uppercase mb-3">
            Personalization
          </p>
          <h1 className="font-display text-3xl font-semibold text-sc-ink leading-tight">
            Your profile
          </h1>
          <p className="mt-2 text-sm text-sc-muted leading-relaxed">
            Every sample answer, every coaching note, every score is calibrated
            against what you edit here. Keep it accurate.
          </p>
        </div>

        {error && (
          <div className="rounded-sm border border-sc-red/40 bg-sc-red/10 px-4 py-3 text-sm text-sc-red font-mono">
            {error}
          </div>
        )}

        {loading ? (
          <p className="font-mono text-xs tracking-widest text-sc-dim uppercase animate-pulse">
            Loading…
          </p>
        ) : !profile ? null : (
          <>
            {/* ── Interview target ── */}
            <Section title="Interview target" label="Upcoming interview" accent>
              <p className="text-xs text-sc-muted mb-3 leading-relaxed">
                Set your target interview so Stagecraft shows a live countdown
                on the practice screen. Autosaves as you type.
              </p>
              <Field label="Company & role">
                <TextInput
                  value={configState.interviewCompany}
                  onChange={(v) => patchConfig("interviewCompany", v)}
                  placeholder="e.g. Kohler India — Creative Director"
                />
              </Field>
              <Field label="Interview date">
                <input
                  type="date"
                  className="w-full rounded-sm border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-ink focus:border-sc-gold-dim focus:outline-none transition-colors"
                  value={configState.interviewDate}
                  onChange={(e) => patchConfig("interviewDate", e.target.value)}
                />
              </Field>
              {configSaved && (
                <p className="font-mono text-xs text-sc-green">✓ Saved</p>
              )}
            </Section>

            {/* ── Identity ── */}
            <Section title="Identity" label="Who you are">
              <Field label="Name">
                <TextInput
                  value={profile.name}
                  onChange={(v) => patch("name", v)}
                />
              </Field>
              <Field label="Location">
                <TextInput
                  value={profile.location}
                  onChange={(v) => patch("location", v)}
                />
              </Field>
              <Field label="Current role">
                <TextInput
                  value={profile.currentRole}
                  onChange={(v) => patch("currentRole", v)}
                />
              </Field>
              <Field label="Tenure">
                <TextInput
                  value={profile.tenure}
                  onChange={(v) => patch("tenure", v)}
                  placeholder="e.g. 18+ years at Datamatics, 20+ years total"
                />
              </Field>
              <Field label="Target roles" hint="One per line">
                <TextArea
                  value={lines(profile.targetRoles)}
                  onChange={(v) => patch("targetRoles", fromLines(v))}
                  rows={3}
                />
              </Field>
              <Field label="Target markets" hint="One per line">
                <TextArea
                  value={lines(profile.targetMarkets)}
                  onChange={(v) => patch("targetMarkets", fromLines(v))}
                  rows={2}
                />
              </Field>
              <Field label="Craft skills" hint="One per line">
                <TextArea
                  value={lines(profile.craft)}
                  onChange={(v) => patch("craft", fromLines(v))}
                  rows={3}
                />
              </Field>
              <Field label="Education" hint="One per line">
                <TextArea
                  value={lines(profile.education)}
                  onChange={(v) => patch("education", fromLines(v))}
                  rows={2}
                />
              </Field>
            </Section>

            {/* ── Real numbers ── */}
            <Section
              title="Real numbers"
              label="The only metrics the coach may use"
              accent
            >
              <p className="text-xs text-sc-muted mb-3 leading-relaxed">
                The coach will{" "}
                <strong className="text-sc-ink">never invent a metric</strong>{" "}
                — it can only use numbers from this list. One per line. Be
                specific: include the number, what it measures, and how.
              </p>
              <TextArea
                value={lines(profile.realNumbers)}
                onChange={(v) => patch("realNumbers", fromLines(v))}
                rows={8}
                mono
              />
            </Section>

            {/* ── STAR stories ── */}
            <Section title="STAR stories" label="Behavioral answer material">
              <p className="text-xs text-sc-muted mb-4 leading-relaxed">
                These are the raw ingredients the coach draws on for behavioral
                questions. Keep each field to 1–2 sentences — the coach
                elaborates; you just need the anchors.
              </p>
              <div className="space-y-4">
                {profile.starStories.map((story, i) => (
                  <StoryCard
                    key={i}
                    index={i}
                    story={story}
                    onChange={(field, value) => patchStory(i, field, value)}
                  />
                ))}
              </div>
            </Section>

            {/* ── Voice samples ── */}
            <Section
              title="Voice samples"
              label="Style anchors for sample answers"
            >
              <p className="text-xs text-sc-muted mb-3 leading-relaxed">
                3–5 of your strongest answers, verbatim. The coach matches its
                sample answers to your vocabulary, rhythm, and sentence length.
                Use real things you have actually said or written.
              </p>
              <div className="space-y-3">
                {profile.voiceSamples.map((sample, i) => (
                  <div key={i}>
                    <label className="font-mono text-xs text-sc-dim uppercase tracking-widest mb-1 block">
                      Sample {i + 1}
                    </label>
                    <TextArea
                      value={sample}
                      onChange={(v) => {
                        const next = [...profile.voiceSamples];
                        next[i] = v;
                        patch("voiceSamples", next);
                      }}
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Weak patterns ── */}
            <Section title="Known patterns" label="Grammar leaks to flag">
              <p className="text-xs text-sc-muted mb-3 leading-relaxed">
                The coach watches for these and calls them out by name in the
                Grammar Fix block. One per line, lowercase, in square brackets
                style: <span className="font-mono text-sc-gold">dropped article</span>
              </p>
              <TextArea
                value={lines(profile.weakPatterns)}
                onChange={(v) => patch("weakPatterns", fromLines(v))}
                rows={6}
                mono
              />
            </Section>

            {/* Save footer */}
            <div className="pb-6 flex items-center justify-between">
              <p className="text-xs text-sc-dim">
                Changes take effect on the next session.
              </p>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className={`rounded-sm px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-30 ${
                  saved
                    ? "bg-sc-green-bg border border-sc-green/40 text-sc-green"
                    : "bg-sc-gold text-sc-void hover:brightness-110"
                }`}
              >
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save profile →"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── STAR story card ──────────────────────────────────────────────────────────

function StoryCard({
  index,
  story,
  onChange,
}: {
  index: number;
  story: StarStory;
  onChange: (field: keyof StarStory, value: string | string[]) => void;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="rounded-sm border border-sc-border bg-sc-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-sc-raised transition-colors"
      >
        <span className="font-mono text-xs text-sc-gold shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-sm font-medium text-sc-ink flex-1 truncate">
          {story.title || "Untitled story"}
        </span>
        <span className="font-mono text-xs text-sc-dim">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="border-t border-sc-line px-4 py-4 space-y-3">
          <Field label="Title">
            <TextInput
              value={story.title}
              onChange={(v) => onChange("title", v)}
              placeholder="e.g. AI + Innovation"
            />
          </Field>
          <Field label="Situation" hint="1–2 sentences — the context">
            <TextArea
              value={story.situation}
              onChange={(v) => onChange("situation", v)}
              rows={2}
            />
          </Field>
          <Field label="Task" hint="What you were responsible for">
            <TextArea
              value={story.task}
              onChange={(v) => onChange("task", v)}
              rows={2}
            />
          </Field>
          <Field label="Action" hint="What you specifically did">
            <TextArea
              value={story.action}
              onChange={(v) => onChange("action", v)}
              rows={2}
            />
          </Field>
          <Field label="Result" hint="Specific outcome — use a real number">
            <TextArea
              value={story.result}
              onChange={(v) => onChange("result", v)}
              rows={2}
            />
          </Field>
          <Field label="Tags" hint="Space or comma separated">
            <TextInput
              value={story.tags.join(", ")}
              onChange={(v) =>
                onChange(
                  "tags",
                  v.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean),
                )
              }
              placeholder="leadership, process, innovation"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// ─── Layout atoms ─────────────────────────────────────────────────────────────

function Section({
  title,
  label,
  accent,
  children,
}: {
  title: string;
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-sm border overflow-hidden ${
        accent ? "border-sc-gold-dim" : "border-sc-border"
      }`}
    >
      <div
        className={`px-4 py-3 border-b flex items-center gap-2 ${
          accent
            ? "border-sc-gold-dim bg-sc-gold-bg"
            : "border-sc-line bg-sc-surface"
        }`}
      >
        <span className={`w-1 h-3 rounded-full shrink-0 ${accent ? "bg-sc-gold" : "bg-sc-muted"}`} />
        <div>
          <span className="font-mono text-xs tracking-widest text-sc-dim uppercase">
            {title}
          </span>
          <span className="font-mono text-xs text-sc-dim ml-2">— {label}</span>
        </div>
      </div>
      <div className="px-4 py-4 bg-sc-surface space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="font-mono text-xs tracking-widest text-sc-muted uppercase">
          {label}
        </label>
        {hint && (
          <span className="font-mono text-xs text-sc-dim">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className="w-full rounded-sm border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
  mono,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <textarea
      className={`w-full rounded-sm border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors resize-none leading-relaxed ${
        mono ? "font-mono" : "font-sans"
      }`}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
