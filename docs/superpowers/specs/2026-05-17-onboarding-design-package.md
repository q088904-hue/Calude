# Stagecraft Onboarding — Design Package (Initiative 2)

> Review artifact. No implementation. Covers the onboarding flow walkthrough, journey diagrams (3 personas), wireframes (3 surfaces), the exact profile-merge bug fix, and a risk assessment. Approve before Initiative 2 implementation.

Grounded in code: profile drives all coaching (`profile.ts` + `profileStore`); the profile POST currently does `{...defaultProfile, ...body}` (destructive); first-run signal = profile-file-absent + 0 sessions; reuses `Field`/`TextInput`/`TextArea`, `getSuggestedAnswer`, the grouped nav, `LoopErrorState`.

---

## 1. Visual walkthrough — proposed onboarding flow

The goal: **first value in <3 minutes, profile filled as a byproduct of practice — never a cold gate.**

```
   NEW USER ARRIVES (/stagecraft)
        │
        ▼
  ┌──────────────────────────┐   first-run state =
  │  FIRST-RUN LANDING        │   (no profile file) AND (0 sessions)
  │  one job: start fast      │
  │  [ Try a 60-sec Quickfire ]│ ◀── primary
  │   Set up your profile      │ ◀── secondary (skippable)
  └──────────┬───────────────┘
             │ taps primary
             ▼
  ┌──────────────────────────┐
  │  QUICKFIRE — 1 question   │   zero setup; uses generic-but-good
  │  type / speak → Grade     │   coaching (or, if AI offline,
  └──────────┬───────────────┘   the deterministic suggested answer)
             │ first graded answer  ◀── ACTIVATION "AHA"
             ▼
  ┌──────────────────────────┐
  │  POST-ANSWER PROMPT       │   non-blocking, dismissable
  │  "Want answers tailored   │
  │   to YOUR numbers? →"     │ ── tap ──▶ PROFILE SETUP WIZARD
  └──────────┬───────────────┘
             │ dismiss → keep practicing (loop unbroken)
             ▼
        CONTINUE LOOP
             │  (during practice, contextual micro-prompts:
             │   "add a real number to make this concrete →")
             ▼
   PROGRESSIVE PROFILING  ── each capture appends to profile (server),
                              improving every future answer.
```

**Principle:** the wizard and prompts are *opt-in accelerators*, never required. A user can practice forever without touching the profile; each profile addition simply raises coaching quality (real-number anchoring, voice match, STAR material).

---

## 2. User journey diagrams

### 2a. First-time user
```
Arrive → First-run landing
  │
  ├─(A) "Try Quickfire" ─▶ 1 graded answer ─▶ post-answer prompt
  │         │                                    ├─ "Add profile" ─▶ Wizard (§2 below)
  │         │                                    └─ dismiss ─▶ keep practicing
  │         └─ value delivered in <3 min, profile still empty (OK)
  │
  └─(B) "Set up profile" ─▶ Wizard ─▶ recommended session
                                       (higher-quality coaching immediately)
States touched: hasProfileFile=false→(maybe)true · sessionCount 0→1
Exit criterion (activated): ≥1 graded answer.
```

### 2b. Returning user
```
Arrive (/stagecraft)
  │  first-run state = false (profile file exists OR sessions>0)
  ▼
NORMAL HUB (current experience, unchanged)
  ├─ Recommended next session (adaptive difficulty from composite)
  ├─ Readiness + last-session scores
  ├─ Interview-date countdown (future R3) 
  └─ grouped nav (Practice / Prep / Progress / Profile)
No onboarding shown. No regression to the existing flow.
```

### 2c. Partially configured profile
```
Arrive → NORMAL HUB (not first-run; they have some data)
  │
  ▼
Profile completeness signal (derived, read-only):
  hasRealNumbers? hasStarStory? hasVoiceSample?
  │
  ├─ if missing high-value inputs → a gentle, dismissable
  │   "Complete your profile (2 of 3 steps left) →" nudge on the hub
  │   AND contextual progressive prompts during practice
  │
  └─ Wizard resumes at the first incomplete step (not from scratch)
Never blocks practice; completeness is encouragement, not a gate.
```

---

## 3. Wireframes (ASCII; current visual system — sc tokens, Geist, grouped nav)

### 3a. First-run landing state
```
┌───────────────────────────────────────────────────────────────┐
│ ← Home  Stagecraft            Practice▾ Prep▾ Progress▾ Profile ☀│
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│   — WELCOME                                                     │
│   Prepare for the room.                       (Geist display)   │
│                                                                 │
│   Practice a real interview question and get scored in 60       │
│   seconds. No setup required.                                   │
│                                                                 │
│   ┌─────────────────────────────┐   ┌────────────────────────┐ │
│   │  ▶  Try a 60-second Quick    │   │  Set up your profile   │ │
│   │     Fire           (primary) │   │            (secondary) │ │
│   └─────────────────────────────┘   └────────────────────────┘ │
│                                                                 │
│   What you'll get: a model answer in your voice, an honest      │
│   score, and the patterns to fix. ⓘ                            │
└───────────────────────────────────────────────────────────────┘
Notes: replaces the dense hub ONLY when first-run. One primary CTA.
Secondary is skippable. No readiness panel yet (no data).
```

### 3b. Profile setup wizard  (`/stagecraft/profile/setup`)
```
┌───────────────────────────────────────────────────────────────┐
│ ← Stagecraft · PROFILE SETUP                                  ☀ │
├───────────────────────────────────────────────────────────────┤
│   Step ●──●──○   (2 of 3)            "Each step sharpens coaching"│
│                                                                 │
│   ┌─ STEP 1 · Identity ──────────────────────────────────────┐ │
│   │  Name            [___________________________]           │ │
│   │  Current role    [___________________________]           │ │
│   │  Target role     [___________________________]           │ │
│   └──────────────────────────────────────────────────────────┘ │
│   ┌─ STEP 2 · Your real numbers (unlocks number-anchored ans)─┐ │
│   │  1  [_______________________________________________]     │ │
│   │  2  [_______________________________________________]     │ │
│   │  3  [_______________________________________________]     │ │
│   │  "Only numbers you list here are ever used. No invented   │ │
│   │   metrics."                                               │ │
│   └──────────────────────────────────────────────────────────┘ │
│   ┌─ STEP 3 · One STAR story ────────────────────────────────┐ │
│   │  Title     [____________________]                         │ │
│   │  Situation [____________________]  Task [_____________]   │ │
│   │  Action    [____________________]  Result [___________]   │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│   [ Finish later ]                       [ Save & continue → ] │
└───────────────────────────────────────────────────────────────┘
Notes: one step visible at a time (others collapsed); each "continue"
does a PARTIAL save (safe only after the merge-bug fix, §4). "Finish
later" exits to the hub with progress persisted. Reuses Field/TextInput/
TextArea (already label-associated). Finish → recommended session.
```

### 3c. Progressive profiling prompt  (inline, post-answer, in the loop)
```
   … (graded answer + coaching shown) …
┌───────────────────────────────────────────────────────────────┐
│  💡  Make this concrete                                    ✕    │
│  Your answer scored low on specifics. Add one real number and  │
│  future answers will use it automatically.                     │
│  [_________________________________________]   [ Add ]         │
│         e.g. "led 6-person team across 100+ campaigns/yr"       │
│  ·  Don't ask again                                            │
└───────────────────────────────────────────────────────────────┘
Notes: appears ONLY after a graded answer (never pre-question), capped
once/session, dismissable, "don't ask again" respected. "Add" appends to
profile.realNumbers (server, partial save). Next question never blocked.
```

---

## 4. Exact resolution plan — profile merge bug

**Bug (confirmed in `src/app/api/stagecraft/profile/route.ts`):**
```ts
// Merge over the default so partial saves don't lose fields
const merged: Profile = { ...defaultProfile, ...body } as Profile;
await saveProfile(merged);
```
A partial POST (e.g. `{ realNumbers: [...] }`) spreads over **`defaultProfile`** (John's hardcoded values), so **every field not in the request body is reset to the hardcoded default** — silently destroying prior user edits. This makes the wizard's per-step partial saves and progressive append **actively destructive** today. It is a hard prerequisite for §3b and §3c.

**Fix:** merge over the **current** profile, not the default.
```ts
// Merge over the CURRENT profile so partial saves preserve prior edits.
const current = await getProfile();          // file → else hardcoded default
const merged: Profile = { ...current, ...body } as Profile;
await saveProfile(merged);
```
`getProfile()` already returns the saved file when present (and falls back to default on first save), so:
- **First ever save:** `current` = default → merged = default + body (correct seed).
- **Subsequent partial save:** `current` = saved profile → only the posted fields change; everything else preserved (correct).

**Edge cases handled / verified:**
1. **`action: "reset"`** branch — unchanged (still deletes the file → next read = default). No interaction with the merge.
2. **Array fields** (realNumbers, targetRoles, etc.) — `body` provides the *full new array* (the client computes the appended array before POSTing); spread replaces the array wholesale. Append semantics live client-side; the route stays a simple field-merge. (Documented so a future appender doesn't expect server-side array concat.)
3. **New profile fields added later** — `getProfile()` already does `{...defaultProfile, ...parsed}` on read, so new type fields backfill from default; the save-merge then preserves them. No migration needed.
4. **Concurrent saves** — file store is last-write-wins (unchanged risk; acceptable single-user v0; flagged for the Initiative-3 DB move).

**Verification for the fix (its own task, first in Initiative 2):**
- GET profile → snapshot. POST `{ "realNumbers": ["__merge_test__"] }`. GET again → `realNumbers` updated AND `name`/`starStories`/`voiceSamples`/etc. **identical to snapshot**. Then POST `{ "name": "X" }` → realNumbers still `["__merge_test__"]` (proves cumulative partial saves). Restore via `action:"reset"`. tsc + build green, coverage 61/61.

---

## 5. Risk assessment — onboarding changes

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | **Partial-save data loss** (the merge bug) corrupts the profile during wizard/progressive use | **Critical** | Certain if unfixed | §4 fix is the FIRST task and gates all of §3b/§3c; explicit non-destructive verification |
| 2 | First-run detection misfires → onboarding shown to a returning user (or hidden from a new one) | High | Low | Signal = profile-file-absent AND 0 sessions; for the seeded user (John) the file/sessions exist → first-run never triggers (correct). Server-derived, not guessable client state |
| 3 | Progressive prompts feel naggy → erodes the friction-free loop (the product's core promise) | High | Med | Post-answer only (never pre-question); capped 1/session; dismissable; "don't ask again" persisted; no prompt blocks "next question" |
| 4 | Wizard duplicates the full editor → logic drift / double maintenance | Med | Med | Wizard composes the SAME `Field`/`TextInput`/`TextArea` + the SAME `/api/stagecraft/profile` endpoint; no parallel form logic. Extract shared fields to a module if still local |
| 5 | Generic first-session coaching (empty profile) underwhelms → false impression of low quality | Med | Med | First-run copy sets expectation ("tailored answers after you add your profile"); suggested-answer fallback always gives a strong model answer; post-answer prompt converts toward profile setup |
| 6 | New routes/endpoints (`/state`, `/profile/setup`) add surface to verify (light/dark/mobile/a11y) | Low | Certain | Standard verification matrix; reuse labeled `Field` components (a11y inherited) |
| 7 | First-run hero regresses the returning-user hub | Med | Low | First-run block is strictly conditional; non-first-run path renders the current hub unchanged; verify both states |
| 8 | "Finish later" loses wizard progress | Med | Low | Each step partial-saves on continue (after §4 fix); "finish later" simply navigates away with server state intact; resume reads saved profile |
| 9 | Completeness nudge (partial-profile persona) becomes clutter | Low | Med | Dismissable, derived read-only signal, single gentle line; no modal |

**Out of scope (per your directive):** monetization, referrals, growth loops, pricing, multi-user. Cross-device sync / persistence is Initiative 3 (discovery only).

---

## Implementation sequence (when approved) — maps to the executable plan
1. **I2-1 (prerequisite):** profile-merge bug fix (§4) — must land first.
2. **I2-2:** first-run `/state` endpoint.
3. **I2-3:** first-run landing hero + post-answer prompt (§3a, §1).
4. **I2-4:** profile setup wizard (§3b).
5. **I2-5:** progressive profiling prompts (§3c).
6. **I2-6:** verification gate (non-destructive saves, first-run flow, a11y, light/dark, mobile).
