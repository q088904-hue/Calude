"use client";

// Stepwise profile setup wizard — a low-friction alternative to the full
// editor. Three steps (Identity → 3 real numbers → 1 STAR story); each step
// partial-saves to /api/stagecraft/profile (non-destructive after the I2-1
// merge fix). Prefills from the current profile so saves round-trip safely
// and the user can resume. "Finish later" exits at any point.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StagecraftHeader } from "@/components/stagecraft/StagecraftHeader";

interface ProfileShape {
  name?: string;
  currentRole?: string;
  targetRoles?: string[];
  realNumbers?: string[];
  starStories?: {
    title?: string;
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
  }[];
}

const TOTAL_STEPS = 3;

async function patchProfile(patch: Partial<ProfileShape>): Promise<void> {
  await fetch("/api/stagecraft/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

function WizardInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="font-mono text-xs tracking-widest text-sc-muted uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-ink placeholder:text-sc-dim focus:border-sc-gold-dim focus:outline-none transition-colors"
      />
    </div>
  );
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1 — identity
  const [name, setName] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  // Step 2 — real numbers
  const [num1, setNum1] = useState("");
  const [num2, setNum2] = useState("");
  const [num3, setNum3] = useState("");
  // Step 3 — one STAR story
  const [title, setTitle] = useState("");
  const [situation, setSituation] = useState("");
  const [task, setTask] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");

  // Prefill from the current profile (so saves are non-destructive + resumable)
  useEffect(() => {
    fetch("/api/stagecraft/profile", { cache: "no-store" })
      .then((r) => r.json() as Promise<ProfileShape>)
      .then((p) => {
        setName(p.name ?? "");
        setCurrentRole(p.currentRole ?? "");
        setTargetRole(p.targetRoles?.[0] ?? "");
        setNum1(p.realNumbers?.[0] ?? "");
        setNum2(p.realNumbers?.[1] ?? "");
        setNum3(p.realNumbers?.[2] ?? "");
        const s = p.starStories?.[0];
        if (s) {
          setTitle(s.title ?? "");
          setSituation(s.situation ?? "");
          setTask(s.task ?? "");
          setAction(s.action ?? "");
          setResult(s.result ?? "");
        }
      })
      .catch(() => {});
  }, []);

  const finishLater = () => router.push("/stagecraft");

  const saveAndContinue = async () => {
    setBusy(true);
    try {
      if (step === 1) {
        await patchProfile({
          name,
          currentRole,
          targetRoles: targetRole.trim() ? [targetRole.trim()] : [],
        });
        setStep(2);
      } else if (step === 2) {
        await patchProfile({
          realNumbers: [num1, num2, num3].map((n) => n.trim()).filter(Boolean),
        });
        setStep(3);
      } else {
        await patchProfile({
          starStories: [{ title, situation, task, action, result }],
        });
        router.push("/stagecraft");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stagecraft-root min-h-screen bg-sc-bg text-sc-ink">
      <StagecraftHeader label="Profile setup" />

      <main className="mx-auto max-w-xl px-6 py-10 space-y-8">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`w-2 h-2 rounded-full ${
                  n <= step ? "bg-sc-gold" : "bg-sc-line"
                }`}
              />
            ))}
          </div>
          <p className="font-mono text-xs text-sc-muted">
            Step {step} of {TOTAL_STEPS} — each step sharpens your coaching
          </p>
        </div>

        {step === 1 && (
          <section className="space-y-4 sc-entry sc-e1">
            <h1 className="font-fraunces text-2xl font-semibold text-sc-ink">
              Who you are
            </h1>
            <WizardInput id="setup-name" label="Name" value={name} onChange={setName} />
            <WizardInput
              id="setup-current-role"
              label="Current role"
              value={currentRole}
              onChange={setCurrentRole}
              placeholder="e.g. Creative Head, Datamatics"
            />
            <WizardInput
              id="setup-target-role"
              label="Target role"
              value={targetRole}
              onChange={setTargetRole}
              placeholder="e.g. Creative Director, Kohler"
            />
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4 sc-entry sc-e1">
            <h1 className="font-fraunces text-2xl font-semibold text-sc-ink">
              Your real numbers
            </h1>
            <p className="text-sm text-sc-muted leading-relaxed">
              The coach only ever uses numbers you list here — it never invents a
              metric. Give three concrete ones.
            </p>
            <WizardInput
              id="setup-num-1"
              label="Number 1"
              value={num1}
              onChange={setNum1}
              placeholder="e.g. 100+ global campaigns a year"
            />
            <WizardInput
              id="setup-num-2"
              label="Number 2"
              value={num2}
              onChange={setNum2}
              placeholder="e.g. team of 6 designers"
            />
            <WizardInput
              id="setup-num-3"
              label="Number 3"
              value={num3}
              onChange={setNum3}
              placeholder="e.g. cut production from 2 days to 2 minutes"
            />
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4 sc-entry sc-e1">
            <h1 className="font-fraunces text-2xl font-semibold text-sc-ink">
              One STAR story
            </h1>
            <p className="text-sm text-sc-muted leading-relaxed">
              Raw material for behavioral answers. One or two lines each — the
              coach elaborates.
            </p>
            <WizardInput id="setup-star-title" label="Title" value={title} onChange={setTitle} placeholder="e.g. AI + Innovation" />
            <WizardInput id="setup-star-situation" label="Situation" value={situation} onChange={setSituation} />
            <WizardInput id="setup-star-task" label="Task" value={task} onChange={setTask} />
            <WizardInput id="setup-star-action" label="Action" value={action} onChange={setAction} />
            <WizardInput id="setup-star-result" label="Result (use a real number)" value={result} onChange={setResult} />
          </section>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={finishLater}
            className="font-mono text-xs text-sc-dim hover:text-sc-muted transition-colors min-h-[36px]"
          >
            Finish later
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={busy}
                className="rounded-sc border border-sc-border bg-sc-surface px-4 py-2 text-xs font-mono text-sc-muted hover:text-sc-gold transition-colors disabled:opacity-40 min-h-[36px]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={saveAndContinue}
              disabled={busy}
              className="rounded-sc bg-sc-gold px-5 py-2 text-sm font-semibold text-sc-void hover:brightness-110 transition-all disabled:opacity-40 min-h-[36px]"
            >
              {step < TOTAL_STEPS ? "Save & continue →" : "Finish →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
