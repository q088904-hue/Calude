"use client";

// Profile editor — lets the user update every field that drives coaching
// quality without touching source files.
// Reads from /api/stagecraft/profile (GET) and saves back via POST.

import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from "react";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";
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
      <StagecraftHeader label="Profile">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={saving || loading}
            className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-3 py-1.5 text-xs font-mono text-sc-dim hover:border-sc-red/40 hover:text-sc-red transition-colors disabled:opacity-30"
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
      </StagecraftHeader>

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
            {/* ── AI connection ── */}
            <AiConnectionSection />

            {/* ── Data export (OBS-7) ── */}
            <Section title="Your data" label="Export & backup">
              <p className="text-xs text-sc-muted mb-3 leading-relaxed">
                Download everything Stagecraft has stored for you — profile,
                interview config, and full session history — as a single JSON
                file you can keep as a backup.
              </p>
              <a
                href="/api/stagecraft/export"
                className="inline-flex items-center gap-2 rounded-sc border border-sc-border bg-sc-surface px-3 py-2 text-xs font-mono text-sc-muted hover:text-sc-ink hover:border-sc-gold-dim transition-colors min-h-[36px]"
              >
                ↓ Export my data (JSON)
              </a>
            </Section>

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
                ariaLabel="Real numbers — one metric per line"
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
                    <label
                      htmlFor={`sc-voice-${i}`}
                      className="font-mono text-xs text-sc-dim uppercase tracking-widest mb-1 block"
                    >
                      Sample {i + 1}
                    </label>
                    <TextArea
                      id={`sc-voice-${i}`}
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
                ariaLabel="Known weak patterns — one per line"
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
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm overflow-hidden">
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
          <h2 className="font-mono text-xs tracking-widest text-sc-dim uppercase inline">
            {title}
          </h2>
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
  // Derive a stable, unique id and wire it to the single form control child so
  // the visible <label> is programmatically associated (WCAG 1.3.1 / 3.3.2).
  const fieldId = useId();
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ id?: string }>, { id: fieldId })
    : children;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label
          htmlFor={fieldId}
          className="font-mono text-xs tracking-widest text-sc-muted uppercase"
        >
          {label}
        </label>
        {hint && (
          <span className="font-mono text-xs text-sc-dim">{hint}</span>
        )}
      </div>
      {control}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  return (
    <input
      id={id}
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
  id,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <textarea
      id={id}
      aria-label={ariaLabel}
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

// ── AI connection ─────────────────────────────────────────────────────────────
// Lets the user supply API keys without server-env access. Keys are POSTed to
// /api/stagecraft/secrets which writes them server-side (.stagecraft/secrets.json);
// the value is never returned to the client — only connected/not-set status.

type SecretKeyName = "ANTHROPIC_API_KEY" | "OPENAI_API_KEY";
type SecretStatus = Record<SecretKeyName, boolean> & { writable: boolean };

function AiConnectionRow({
  name,
  label,
  hint,
  connected,
  writable,
  onSaved,
}: {
  name: SecretKeyName;
  label: string;
  hint: string;
  connected: boolean;
  writable: boolean;
  onSaved: (status: SecretStatus) => void;
}) {
  const inputId = `sc-secret-${name}`;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    if (!value.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/stagecraft/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, value }),
      });
      if (res.ok) {
        onSaved((await res.json()) as SecretStatus);
        setValue("");
      }
    } finally {
      setBusy(false);
    }
  }, [name, value, onSaved]);

  const clear = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/stagecraft/secrets?name=${name}`, {
        method: "DELETE",
      });
      if (res.ok) onSaved((await res.json()) as SecretStatus);
    } finally {
      setBusy(false);
    }
  }, [name, onSaved]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="font-mono text-xs tracking-widest text-sc-muted uppercase"
        >
          {label}
        </label>
        <span
          className={`font-mono text-xs ${connected ? "text-sc-green" : "text-sc-dim"}`}
        >
          {connected ? "● connected" : "○ not set"}
        </span>
      </div>
      {writable ? (
        <div className="flex items-center gap-2">
          <input
            id={inputId}
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={connected ? "Replace key…" : "Paste API key…"}
            className="flex-1 rounded-sm border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy || !value.trim()}
            className="rounded-sc border border-sc-gold-dim bg-sc-gold-bg px-3 py-2 text-xs font-mono text-sc-gold hover:bg-sc-gold/20 transition-colors disabled:opacity-40 min-h-[36px]"
          >
            Save
          </button>
          {connected && (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="rounded-sc border border-sc-border bg-sc-surface px-3 py-2 text-xs font-mono text-sc-dim hover:text-sc-red transition-colors disabled:opacity-40 min-h-[36px]"
            >
              Clear
            </button>
          )}
        </div>
      ) : (
        <p className="font-mono text-xs text-sc-muted leading-relaxed">
          Configured via server environment.
        </p>
      )}
      <p className="font-mono text-xs text-sc-dim leading-relaxed">{hint}</p>
    </div>
  );
}

function AiConnectionSection() {
  const [status, setStatus] = useState<SecretStatus | null>(null);
  useEffect(() => {
    fetch("/api/stagecraft/secrets", { cache: "no-store" })
      .then((r) => r.json() as Promise<SecretStatus>)
      .then(setStatus)
      .catch(() =>
        setStatus({
          ANTHROPIC_API_KEY: false,
          OPENAI_API_KEY: false,
          writable: true,
        }),
      );
  }, []);

  // Default to writable (local dev) until the status loads.
  const writable = status?.writable ?? true;

  return (
    <div id="ai-connection" className="scroll-mt-20">
      <Section
        title="AI connection"
        label={writable ? "Keys stay on your server" : "Managed by server env"}
      >
        <p className="text-xs text-sc-muted mb-1 leading-relaxed">
          {writable
            ? "Stagecraft needs an Anthropic key for coaching and (optionally) an OpenAI key for voice transcription. Keys are stored on your server and never shown again — only connection status."
            : "This deployment reads API keys from the server environment. Set ANTHROPIC_API_KEY and (optionally) OPENAI_API_KEY in your hosting config. Connection status is shown below."}
        </p>
        <AiConnectionRow
          name="ANTHROPIC_API_KEY"
          label="Anthropic (coaching)"
          hint="Get one at console.anthropic.com → API Keys."
          connected={status?.ANTHROPIC_API_KEY ?? false}
          writable={writable}
          onSaved={setStatus}
        />
        <AiConnectionRow
          name="OPENAI_API_KEY"
          label="OpenAI (voice, optional)"
          hint="Get one at platform.openai.com → API Keys."
          connected={status?.OPENAI_API_KEY ?? false}
          writable={writable}
          onSaved={setStatus}
        />
      </Section>
    </div>
  );
}
