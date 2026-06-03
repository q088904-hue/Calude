# Initiatives 1 & 2 — Executable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]` checkboxes. **This is a plan; nothing here is implemented yet.**

**Goal:** (I1) make the AI grading loop fail gracefully and let the user supply a key without server-env access; (I2) deliver first-run activation, a stepwise profile wizard, and progressive profiling — without a destructive profile-save bug.

**Architecture:** Server key resolution moves from `process.env` only → `env → .stagecraft/secrets.json` via a new server-only `secrets.ts`. Grade/transcribe return typed errors; a shared `<LoopErrorState>` renders cause + retry + deterministic suggested-answer fallback. Activation adds a first-run `/state` signal, a `/profile/setup` wizard reusing existing `Field` components, and optional post-answer profile-append prompts. A prerequisite bug fix makes the profile route merge over the *current* profile.

**Tech stack:** Next.js 16.2, React 19, TypeScript, Anthropic + OpenAI SDKs (already deps). No new deps. **Verification gates (no unit-test suite in this project):** `npx tsc --noEmit`, `npx eslint <touched>`, `npm run build` (runs `prebuild`→`check-answers`, must stay 61/61), + preview-MCP DOM/behavior probes.

**Project facts (audited):**
- `grade/route.ts:68` `const apiKey = process.env.ANTHROPIC_API_KEY; if(!apiKey) return {status:500}`. `transcribe/route.ts:14` same with `OPENAI_API_KEY`.
- Generic client error string only at `quickfire/page.tsx:524` and `:601`. Other loop pages (drill/star/negotiate/recruiter/debrief) + main `page.tsx` call grade too — audit their error handling in Task I1-4.
- `profile/route.ts` POST does `{...defaultProfile, ...body}` — **merges over DEFAULT, not current** (destructive on partial save).
- `.stagecraft/` is gitignored; deterministic answers via `getSuggestedAnswer()` (`suggestedAnswers.ts`) + `renderSampleAnswer()` (`feedbackRenderers.tsx`).
- Profile form uses `Field`/`TextInput`/`TextArea` (now label-associated). `configStore` holds `interviewDate`.

---

# INITIATIVE 1 — Core Loop Reliability

## Task I1-1: Server-side secrets store

**Files:** Create `src/lib/stagecraft/secrets.ts`

- [ ] **Step 1: Create the store (server-only, mirrors configStore.ts)**

```ts
// Server-only secret resolution for Stagecraft.
// Precedence: process.env → .stagecraft/secrets.json (gitignored, never
// returned to the client). Single-user v0 model.
import { promises as fs } from "node:fs";
import path from "node:path";

const SECRETS_PATH = path.join(process.cwd(), ".stagecraft", "secrets.json");

type SecretName = "ANTHROPIC_API_KEY" | "OPENAI_API_KEY";

async function readFileSecrets(): Promise<Partial<Record<SecretName, string>>> {
  try {
    return JSON.parse(await fs.readFile(SECRETS_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function resolve(name: SecretName): Promise<string | undefined> {
  const env = process.env[name];
  if (env) return env;
  return (await readFileSecrets())[name];
}

export const getAnthropicKey = () => resolve("ANTHROPIC_API_KEY");
export const getOpenAIKey = () => resolve("OPENAI_API_KEY");

export async function setSecret(name: SecretName, value: string): Promise<void> {
  await fs.mkdir(path.dirname(SECRETS_PATH), { recursive: true });
  const current = await readFileSecrets();
  current[name] = value.trim();
  await fs.writeFile(SECRETS_PATH, JSON.stringify(current, null, 2), "utf8", );
  try { await fs.chmod(SECRETS_PATH, 0o600); } catch { /* best effort */ }
}

export async function clearSecret(name: SecretName): Promise<void> {
  const current = await readFileSecrets();
  delete current[name];
  await fs.writeFile(SECRETS_PATH, JSON.stringify(current, null, 2), "utf8");
}

/** Booleans only — never the values. Env presence OR file presence. */
export async function getSecretStatus(): Promise<Record<SecretName, boolean>> {
  const file = await readFileSecrets();
  return {
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY || file.ANTHROPIC_API_KEY),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY || file.OPENAI_API_KEY),
  };
}
```

- [ ] **Step 2:** `grep -q 'secrets.json' .gitignore || echo "/.stagecraft/secrets.json covered by /.stagecraft/"` — confirm `.stagecraft/` is gitignored (it is). No change needed.
- [ ] **Step 3:** `npx tsc --noEmit && npx eslint src/lib/stagecraft/secrets.ts` → clean.
- [ ] **Step 4: Commit** `git add src/lib/stagecraft/secrets.ts && git commit -m "feat(stagecraft): server-side secrets store (env → .stagecraft/secrets.json)"`

## Task I1-2: Secrets API route

**Files:** Create `src/app/api/stagecraft/secrets/route.ts`

- [ ] **Step 1: Create route (GET status booleans; POST set; DELETE clear)**

```ts
import { NextRequest } from "next/server";
import { getSecretStatus, setSecret, clearSecret } from "@/lib/stagecraft/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"] as const;
type Name = (typeof VALID)[number];
const isName = (s: unknown): s is Name => VALID.includes(s as Name);

export async function GET() {
  return Response.json(await getSecretStatus());
}

export async function POST(request: NextRequest) {
  let body: { name?: unknown; value?: unknown };
  try { body = await request.json(); } catch (e) {
    return Response.json({ error: "Invalid JSON", detail: String(e) }, { status: 400 });
  }
  if (!isName(body.name) || typeof body.value !== "string" || !body.value.trim()) {
    return Response.json({ error: "name must be a valid key id and value a non-empty string" }, { status: 400 });
  }
  await setSecret(body.name, body.value);
  return Response.json(await getSecretStatus());
}

export async function DELETE(request: NextRequest) {
  const name = new URL(request.url).searchParams.get("name");
  if (!isName(name)) return Response.json({ error: "invalid name" }, { status: 400 });
  await clearSecret(name);
  return Response.json(await getSecretStatus());
}
```

- [ ] **Step 2:** `npx tsc --noEmit && npx eslint src/app/api/stagecraft/secrets/route.ts` → clean.
- [ ] **Step 3: Commit** `git commit -am "feat(stagecraft): /api/stagecraft/secrets (status/set/clear; values never returned)"`

## Task I1-3: Typed errors + key resolution in grade & transcribe routes

**Files:** Modify `src/app/api/stagecraft/grade/route.ts`, `src/app/api/stagecraft/transcribe/route.ts`

- [ ] **Step 1: grade/route.ts — replace env-only key + bare 500**

Replace (line ~68):
```ts
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }
```
With:
```ts
  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    return Response.json(
      { code: "NO_API_KEY", error: "AI coaching isn't connected. Add an Anthropic API key in Settings." },
      { status: 409 },
    );
  }
```
Add import: `import { getAnthropicKey } from "@/lib/stagecraft/secrets";`

- [ ] **Step 2: grade/route.ts — map SDK call errors to typed codes**

Find the Anthropic streaming call (the `try`/`catch` around `client.messages...`). In the catch, return a typed transient error instead of an untyped failure:
```ts
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const code = status === 429 ? "RATE_LIMIT" : status === 408 ? "TIMEOUT" : "PROVIDER_ERROR";
    return Response.json({ code, error: "Grading is temporarily unavailable. Retry in a moment." }, { status: 502 });
  }
```
(If the stream has already started, leave existing stream handling — only wrap the pre-stream setup. Read the route's current structure and place the catch where no bytes have been sent yet.)

- [ ] **Step 3: transcribe/route.ts — same key + typed error**

Replace `const apiKey = process.env.OPENAI_API_KEY; if(!apiKey){...500}` with `getOpenAIKey()` + `{ code:"NO_API_KEY", ... }` 409. Import `getOpenAIKey`.

- [ ] **Step 4:** `npx tsc --noEmit && npm run build` → green, coverage 61/61.
- [ ] **Step 5: Commit** `git commit -am "feat(stagecraft): I1 — typed grade/transcribe errors + file-key fallback"`

## Task I1-4: `<LoopErrorState>` component + client integration

**Files:** Create `src/components/stagecraft/LoopErrorState.tsx`; modify `quickfire/page.tsx` (lines 524, 601) and audit other loop callers.

- [ ] **Step 1: Create LoopErrorState**

```tsx
"use client";
import Link from "next/link";

export type LoopError = { code: "NO_API_KEY" | "RATE_LIMIT" | "TIMEOUT" | "PROVIDER_ERROR" | "UNKNOWN"; message?: string };

export function LoopErrorState({ error, onRetry }: { error: LoopError; onRetry?: () => void }) {
  const isConfig = error.code === "NO_API_KEY";
  return (
    <div className="rounded-sc border border-sc-border bg-sc-surface shadow-sc-sm px-4 py-3 space-y-2">
      <p className="text-sm text-sc-ink">
        {isConfig ? "AI coaching isn’t connected yet." : "Grading hit a snag."}
      </p>
      <p className="font-mono text-xs text-sc-muted">
        {error.message ?? (isConfig ? "Add an API key to enable coaching." : "This is usually temporary.")}
      </p>
      <div className="flex items-center gap-2 pt-1">
        {isConfig ? (
          <Link href="/stagecraft/profile#ai-connection" className="rounded-sc border border-sc-gold-dim bg-sc-gold-bg px-3 py-2 text-xs font-mono text-sc-gold min-h-[36px] inline-flex items-center">
            Connect AI →
          </Link>
        ) : (
          onRetry && (
            <button type="button" onClick={onRetry} className="rounded-sc border border-sc-gold-dim bg-sc-gold-bg px-3 py-2 text-xs font-mono text-sc-gold min-h-[36px] inline-flex items-center">
              Retry
            </button>
          )
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: quickfire — parse typed error + render fallback**

At the two `setFeedback("[Grade error — please try again.]")` sites: when `!res.ok`, parse `const e = await res.json().catch(()=>({}))`, set a `loopError` state to `{ code: e.code ?? "UNKNOWN", message: e.error }`, and render `<LoopErrorState error={loopError} onRetry={submit} />`. When `error.code === "NO_API_KEY"` and the current question has a suggested answer, also auto-open the existing `<SuggestedAnswer>` reveal (set its open state) so the user still gets a model answer.

- [ ] **Step 3: Audit other grade callers**

`grep -rn "api/stagecraft/grade" src/app/stagecraft` → for each (drill, star, negotiate, recruiter, debrief, main `page.tsx`), confirm error handling; convert any bare error string to `<LoopErrorState>`. Keep changes minimal and per-file verified.

- [ ] **Step 4:** `npx tsc --noEmit && npx eslint <touched> && npm run build` → green.
- [ ] **Step 5: Commit** `git commit -am "feat(stagecraft): I1 — LoopErrorState with connect/retry + suggested-answer fallback"`

## Task I1-5: "AI connection" section in Settings

**Files:** Modify `src/app/stagecraft/profile/page.tsx`

- [ ] **Step 1:** Add a `<Section title="AI connection" label="Keys stay on your server">` with `id="ai-connection"` anchor. Two rows (Anthropic, OpenAI): show `● connected / ○ not set` from `GET /api/stagecraft/secrets`; a password input + Save (POST) + Clear (DELETE). Never display the value. Use existing `Field`/`TextInput` (type via a new `password` prop or a raw `<input type="password">`).
- [ ] **Step 2:** Verify status round-trips (set → status flips connected; clear → not set) via preview probe. `tsc + build` green.
- [ ] **Step 3: Commit** `git commit -am "feat(stagecraft): I1 — AI connection settings (server-side key, status only)"`

## Task I1-6: Initiative 1 verification gate

- [ ] tsc + eslint(touched) + build (coverage 61/61).
- [ ] Preview reliability matrix: no key → grade 409 `NO_API_KEY` → Connect card + auto suggested-answer on a fixed-bank Q; set key in Settings → status connected → Retry grades successfully; transient → Retry card (no key prompt).
- [ ] Confirm `GET /secrets` and all responses return **booleans only**, never the key (inspect network).
- [ ] light/dark + mobile render of LoopErrorState + AI-connection section.
- [ ] `git commit --allow-empty -m "chore(stagecraft): Initiative 1 verified"`

---

# INITIATIVE 2 — Activation & Onboarding

## Task I2-1 (PREREQUISITE BUG FIX): profile route must merge over CURRENT profile

**Files:** Modify `src/app/api/stagecraft/profile/route.ts`

- [ ] **Step 1:** Replace the destructive merge:
```ts
  // Merge over the default so partial saves don't lose fields
  const merged: Profile = { ...defaultProfile, ...body } as Profile;
```
With merge over the **current** profile (so partial saves preserve prior user edits):
```ts
  // Merge over the CURRENT profile so partial saves don't reset other fields.
  const current = await getProfile(); // file → else default
  const merged: Profile = { ...current, ...body } as Profile;
```
(`getProfile` is already imported.)

- [ ] **Step 2: Verify non-destructive save (preview):** GET profile; POST `{ "realNumbers": ["test"] }`; GET again → all other fields (name, starStories, etc.) unchanged, only realNumbers updated. `tsc + build` green.
- [ ] **Step 3: Commit** `git commit -am "fix(stagecraft): profile POST merges over current profile, not default (prevents partial-save data loss)"`

## Task I2-2: First-run state endpoint

**Files:** Create `src/app/api/stagecraft/state/route.ts`; add `profileFileExists()` to `profileStore.ts`

- [ ] **Step 1:** In `profileStore.ts` add:
```ts
export async function profileFileExists(): Promise<boolean> {
  try { await fs.access(PROFILE_FILE); return true; } catch { return false; }
}
```
- [ ] **Step 2:** Create `state/route.ts`:
```ts
import { profileFileExists } from "@/lib/stagecraft/profileStore";
import { listSessions } from "@/lib/stagecraft/sessionStore";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const [hasProfileFile, sessions] = await Promise.all([profileFileExists(), listSessions()]);
  return Response.json({ hasProfileFile, sessionCount: sessions.length, isFirstRun: !hasProfileFile && sessions.length === 0 });
}
```
- [ ] **Step 3:** tsc + eslint + build green. **Commit** `git commit -am "feat(stagecraft): I2 — first-run state endpoint"`

## Task I2-3: Landing first-run hero + post-first-answer prompt (U2 + C1)

**Files:** Modify `src/app/stagecraft/page.tsx`, `src/app/stagecraft/quickfire/page.tsx`

- [ ] **Step 1:** On the landing, fetch `GET /api/stagecraft/state` on mount; when `isFirstRun`, render a first-run hero with one primary CTA → `/stagecraft/quickfire` ("Try a 60-second Quick Fire") + secondary "Set up your profile" → `/stagecraft/profile/setup`. Reuse existing CTA classes. Non-first-run renders the current hub unchanged.
- [ ] **Step 2:** In quickfire, after the first successful grade in a session (track `gradedCount`), show a dismissable inline prompt: "Want answers tailored to your numbers? Add your profile →" linking to `/stagecraft/profile/setup`. Never pre-question; never blocks.
- [ ] **Step 3:** tsc + eslint + build; preview: simulate first-run (temp empty `.stagecraft`), confirm hero → quickfire → post-answer prompt. **Commit** `git commit -am "feat(stagecraft): I2 — first-run hero + post-first-answer profile prompt"`

## Task I2-4: Profile setup wizard (U3)

**Files:** Create `src/app/stagecraft/profile/setup/page.tsx`

- [ ] **Step 1:** Build a 3-step client page reusing `Field`/`TextInput`/`TextArea` (extract them to a shared module if still local to profile/page.tsx — `grep` first; if local, lift to `src/components/stagecraft/profileFields.tsx` and import in both). Steps: (1) Identity {name, currentRole, targetRoles[0]}; (2) 3 real numbers; (3) 1 STAR story. Each step POSTs a **partial** profile to `/api/stagecraft/profile` (now safe after I2-1). "Finish later" at each step. Progress indicator. On finish → redirect to `/stagecraft` (recommended session surfaces there).
- [ ] **Step 2:** tsc + eslint + build; preview: complete steps, confirm each partial save persists and does not clobber other fields (relies on I2-1). a11y: all inputs labeled. **Commit** `git commit -am "feat(stagecraft): I2 — stepwise profile setup wizard"`

## Task I2-5: Progressive profiling — inline append (C2)

**Files:** Create `src/components/stagecraft/InlineProfileAppend.tsx`; integrate in quickfire

- [ ] **Step 1:** Component: given `field` (e.g. `"realNumbers"`) renders a one-field inline capture; on submit, GET current profile, append the line, POST partial `{ [field]: [...current[field], value] }` (safe after I2-1). Optional + dismissable.
- [ ] **Step 2:** Trigger heuristically in quickfire after a graded answer scoring low on content with no digit present (the plan's fallback heuristic — grader META signal optional). Strictly post-answer, dismissable, capped once per session, "don't ask again" respected.
- [ ] **Step 3:** tsc + eslint + build; preview: vague answer → optional number prompt → append updates profile → dismiss works → next question never blocked. **Commit** `git commit -am "feat(stagecraft): I2 — progressive profile append prompts"`

## Task I2-6: Initiative 2 verification gate

- [ ] tsc + eslint(touched) + build (coverage 61/61).
- [ ] Non-destructive save confirmed (I2-1). First-run flow end-to-end. Wizard partial saves preserve fields. Progressive prompt optional/non-blocking. a11y labels on all new inputs; light/dark; mobile 375.
- [ ] `git commit --allow-empty -m "chore(stagecraft): Initiative 2 verified"`

---

## Self-review

**Spec coverage:** U1 → I1-3,I1-4; P2 → I1-1,I1-2,I1-5; U2/C1 → I2-3; U3 → I2-4; C2 → I2-5; destructive-save prerequisite → I2-1. All mapped.

**Placeholder scan:** No TBD; code blocks complete; the two judgment points (where to place the pre-stream catch in grade route; whether `Field` is local and needs lifting) are explicit `grep`/`read`-first instructions, not placeholders.

**Type consistency:** `LoopError.code` union matches the route codes (`NO_API_KEY`/`RATE_LIMIT`/`TIMEOUT`/`PROVIDER_ERROR`). `SecretName` union consistent across `secrets.ts` + route. `getAnthropicKey`/`getOpenAIKey` names consistent route↔store. Profile partial-save safety (I2-1) is a hard prerequisite for I2-4 and I2-5 and is sequenced first.

**Sequencing:** Initiative 1 is independent and ships first (unblocks the suggested-answer fallback used nowhere else). Within Initiative 2, **I2-1 must precede I2-4 and I2-5** (or partial saves corrupt the profile). Initiative 3 (persistence) remains discovery-only, not in this plan.
