<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:token-discipline -->
# Token discipline (always on)

Optimize for context efficiency every turn — this is a standing rule, not a mode:

- **Delegate broad reads.** Use a subagent for multi-file surveys/"where is X" and ask for a short report; don't pull whole files into the main context to skim them.
- **Grep before read.** Locate exact line ranges with `grep -n` / scoped patterns, then `Read` only the needed slice. Never re-read a file the harness already tracks (Edit/Write echo state back).
- **Don't re-explore.** The architecture facts below are the answer — trust them instead of re-discovering. Update them if they change.
- **Verify, don't browse.** Gate work on `npx tsc --noEmit`, `npx eslint <touched paths>`, `npm run build` — not broad re-reads. Lint/typecheck only the paths you changed plus their consumers.
- **Clean up.** Remove Playwright artifacts (`.playwright-mcp/`, stray `*.md` snapshots, root screenshots) at the end of a verification pass.
- **Batch independent tool calls** in one message; chain dependent shell steps with `&&`.
<!-- END:token-discipline -->

<!-- BEGIN:meentrack-v2-architecture -->
# MeenTrack V2 — architecture facts (don't re-derive)

App route: `src/app/meentrack/v2/page.tsx` (single client SPA, internal tab state — NOT URL-routed).

- **Design tokens:** all colors are CSS vars in `src/app/globals.css` `@theme` (`--color-mt-*`, `--shadow-mt-*`). Use Tailwind `mt-*` classes or `var(--color-mt-*)`. No raw hex in components except documented black scrims.
- **Shared constants:** `src/components/meentrack/v2/constants.ts` is the single source for harbours (`HARBORS`, `HARBOR_OPTIONS`, `harborLabel/Full`, native `shortTa/shortMl`). Onboarding derives its picker from here — add harbours ONLY here.
- **Persistence:** `src/lib/meentrack/store.ts` (provider-agnostic) + `useMeenTrackSession()`. Runs on localStorage today; `supabaseStore` is a skeleton that delegates to local until `NEXT_PUBLIC_SUPABASE_*` env + the documented `meentrack_profiles`/`meentrack_trips` migration exist. Flipping to Supabase is backend-only — never change the UI contract.
- **i18n:** `src/lib/meentrack/i18n.tsx` — typed context + `useT()`, NOT next-intl (wrong fit for a profile-locale SPA). Catalog: `en` complete; `ta`/`ml` cover nav/titles/greeting only and fall back to `en`. Longer/safety/advisory copy is intentionally untranslated — **do not machine-translate it**; needs native Tamil/Malayalam review before ta/ml are "complete".
- **Demo state:** `DemoControls` (tier/seaLevel/locale/trialDays) is wired in `page.tsx`; `isPro = tier !== "free"` gates Pro features; `NoGoModal` + Start-Trip guard enforce the #1 safety outcome.
- **Local run:** pin the dev/preview server to an isolated port (`next dev --webpack -p 3100`); Next port-walks into other apps otherwise. Dev HMR resets React state — verify multi-step flows against the **production build** (`npm run build && npx next start -p 3100`).
- **Externally blocked (cannot progress without the user):** Supabase credentials (auth + real persistence + server-resolved entitlements), Razorpay live KYC, INCOIS API access (real BiteScore/weather/PFZ data), native i18n reviewer. Everything not gated by these is done.
<!-- END:meentrack-v2-architecture -->
