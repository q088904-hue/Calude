# Persistence Readiness Review (pre-3.1)

> Required before any 3.1 (persistence migration) implementation. Covers data lifecycle, JSONB growth, backup/recovery/export, serverless operational risks, security — and documents the serverless limitation of Initiative 1's `secrets.json` with production-safe alternatives. No implementation.

Context: 3.1 plans to move Stagecraft from flat-file JSON (`.stagecraft/*.json`) to Supabase (`stagecraft_*` tables, `jsonb`, sentinel `user_id`, service-role server access), serverless-compatible, file backend retained as default/fallback. This review pressure-tests that plan operationally.

---

## 1. Data lifecycle

**Entities** (current + post-3.1):
| Data | Created | Updated | Read | Deleted |
|---|---|---|---|---|
| Profile (1 row) | first save / wizard | partial merge over current (I2-1) | grade route, /state, profile UI, wizard | only via `action:"reset"` (→ default) |
| Sessions (N rows) | session start | `appendItem` per answer, `setReport` at end | history, patterns, grade recurring-patterns, /state | **no delete path today** |
| Config (1 row) | profile/settings | merge | hub, CountdownChip/Strip, /state | field-clear only |
| Secrets | Settings paste (I1) | overwrite/clear | grade/transcribe | clear |

**Lifecycle observations:**
- **Sessions accumulate without bound** — there is no delete/archival path. This is the main growth vector (see §2). Acceptable single-user; needs an archival/retention policy before multi-user.
- **Profile/config are single-row, bounded.** Low risk.
- **Reads are coarse:** `listSessions()` returns *all* sessions (history page); `getRecurringPatterns()` already caps at the last 10. As session count grows, the full-table read becomes the cost driver → recommend a `limit/offset` (or `listRecentSessions(n)`) before history gets large.
- **Recommendation for 3.1:** add a soft-delete/archive column (`archived_at`) to `stagecraft_sessions` now (cheap), even if no UI uses it yet — avoids a later migration when a "delete session" feature or retention policy arrives.

## 2. JSONB growth

- **`stagecraft_sessions.items jsonb`** is the growth hotspot: one entry per Q&A, each holding `question`, `answer`, and `feedback` (the 5-block coaching text, ~1–2 KB). A 6-question session ≈ 8–15 KB; a heavy 22-question quickfire run more. Postgres TOASTs large `jsonb` transparently — per-row size is not a concern at single-user scale (hundreds of sessions = low-single-digit MB total).
- **Real risk is read amplification, not storage:** `listSessions()` deserializing every session's full `items` for a history list that only needs summaries. Mitigations (recommend for 3.1 or fast-follow):
  1. Select summary columns (`id, started_at, composite, report`) for list views; fetch `items` only on the session-detail (`getSession`) path.
  2. Paginate history (`limit`, `order by started_at desc`). The index `(user_id, started_at desc)` already supports this.
- **Profile `data jsonb`** is bounded (a single nested object); negligible growth.
- **Do not normalize `items` into rows for v0** — premature; jsonb + the read mitigations are sufficient. Revisit only if per-answer analytics across users is needed.

## 3. Backup strategy

- **Primary:** Supabase project automated backups (daily on the platform; PITR on paid tiers). Since 3.1 reuses the existing project, Stagecraft inherits whatever backup tier is configured — **confirm the project's backup tier** before cutover.
- **Secondary (free, recommended):** the 3.1 migration **retains `.stagecraft/*.json`** — a point-in-time snapshot at migration. Keep it.
- **Tertiary (recommend adding):** a scheduled or on-demand JSON export (see §5) the user can download and store anywhere. For a single-user career-prep tool, a user-held export is the most reliable backstop.
- **Action item:** verify Supabase backup tier; document the export as the user-facing backup.

## 4. Recovery strategy

Layered, in order of preference:
1. **Instant fallback:** unset `STAGECRAFT_STORE` → file backend resumes from the retained `.stagecraft/*.json`. (Only viable on a persistent host; on serverless the file snapshot is the migration-time copy, not live.)
2. **Supabase PITR / backup restore** — point-in-time to before an incident (DB-level).
3. **Re-run the idempotent migration** from a retained/exported JSON snapshot → rebuilds rows under the sentinel user.
4. **Per-record resilience:** `getProfile` backfills missing fields from `defaultProfile`; a corrupt/empty profile row degrades to the default rather than crashing.
- **Action item:** document an explicit "restore from export" procedure (read export JSON → upsert) alongside the migration script.

## 5. Export strategy (recommended addition to 3.1 scope)

- Add **`GET /api/stagecraft/export`** → returns `{ profile, sessions, config, exportedAt }` as a single JSON download. Server-side (admin client), trivial to build on the existing store functions.
- Value: (a) user-owned data portability, (b) the most reliable manual backup, (c) the input to the "restore from export" recovery path, (d) supports the eventual multi-device/account migration.
- Pair with an **import** (`POST /api/stagecraft/import`) later if needed (out of scope now).
- **Recommendation:** include `export` as a small task within 3.1 (low effort, materially improves backup/recovery posture).

## 6. Serverless operational risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Ephemeral/per-instance FS → file store + `secrets.json` don't persist | High | 3.1 moves data to Supabase; secrets → env vars (see §8). File store becomes dev-only on serverless |
| 2 | Cold starts + many concurrent function instances | Med | `supabase-js` is stateless HTTP (no pooled TCP to exhaust); fine. Avoid per-request client re-creation — `getSupabaseAdmin()` already memoizes per instance |
| 3 | Function timeout on large `listSessions()` | Med | §2 read mitigations (summary columns + pagination) |
| 4 | Concurrent writes from two instances (same single user, two tabs/devices) | Low (v0) | Whole-record upsert = last-write-wins; acceptable for one user. Note for multi-device simultaneous edits |
| 5 | Service-role key present in serverless env | Med | Platform env var, server-only; never bundled to client (`admin.ts` is server-only). Confirm not `NEXT_PUBLIC_*` |
| 6 | Region latency (DB ≠ function region) | Low | Co-locate Supabase region with the serverless region if possible |
| 7 | Migration run from a serverless context (no local FS) | Med | Run the one-off migration from a developer machine / CI with the retained JSON, **not** from a serverless function |
| 8 | `runtime = "nodejs"` required (not edge) for these routes | Low | Already set on the relevant routes; keep nodejs (Supabase admin + Node APIs) |

## 7. Security considerations

- **Service-role key:** bypasses RLS — must stay server-only (it is: `admin.ts`, never client-imported, not `NEXT_PUBLIC`). Audit on every 3.1 PR.
- **RLS:** enabled deny-by-default in the 3.1 schema; only the service-role touches rows in v0. When 3.2 adds Magic Link, add `user_id = auth.uid()` policies and switch reads to the SSR/anon client. **Until then, do not expose any Stagecraft table to the anon client.**
- **PII:** the profile holds real career data, real numbers, STAR stories; sessions hold answers/feedback. This is personal data → backups/exports contain PII; RLS is the access control once multi-user; never log profile/answer content.
- **Injection:** `supabase-js` parameterizes queries; `jsonb` values are data, not SQL — safe. Do not build raw SQL string-concatenation in the store.
- **Secrets in DB:** **do not** store API keys as plaintext columns (see §8). 
- **Shared project blast radius:** `stagecraft_*` prefix + RLS isolate from MeenTrack/billing tables; migration touches only Stagecraft tables.

## 8. Initiative 1 `secrets.json` — serverless limitation & production-safe alternatives

**The limitation (must document):** Initiative 1's `secrets.ts` resolves API keys `env → .stagecraft/secrets.json`, and the Settings "AI connection" UI writes the pasted key to that server file. **On serverless this silently fails to persist** — the filesystem is ephemeral and per-instance, so a key pasted in Settings is lost on the next cold start or lands on only one instance. The **env-var path still works** (platform env), so coaching functions *if* keys are in env; but the in-app key-paste feature is effectively non-functional on serverless and would mislead the user (appears saved, then "disconnected" later).

**Production-safe alternatives:**
1. **Env-var only + gate the UI (RECOMMENDED for v0 serverless).** Set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` in the platform env. In the Settings AI-connection section, when running serverless (no writable FS), **hide or disable the paste field** and show "Configured via server environment" instead of offering a save that won't persist. Zero new infra; honest UX. Low effort.
2. **Encrypted secret in Supabase** (Supabase Vault, or an encrypted column with a server-held key-encryption-key). Decrypt server-side per request. Works serverless + cross-instance; enables true in-app key management. Moderate effort. Only if user-managed keys are a real product requirement.
3. **Platform secret manager** (Vercel Env API / AWS Secrets Manager / Doppler). Programmatic, robust, but heaviest integration.

**Do NOT** store API keys as plaintext DB columns (shared project, backups, RLS surface = unacceptable).

**Recommendation:** adopt **Option 1** as part of/just before serverless cutover — detect non-writable FS (or an explicit `STAGECRAFT_SERVERLESS=1` flag) and switch the AI-connection UI to "env-configured" mode. Treat Option 2 as a later enhancement gated on a real need for in-app key management. This keeps Initiative 1's value (graceful failure + key status) while removing the misleading paste-to-file affordance on serverless.

---

## Readiness verdict
3.1 as planned is **operationally sound for v0 serverless single-user**, with these additions recommended before/within implementation:
1. Add `archived_at` to `stagecraft_sessions` (cheap future-proofing). 
2. Add read mitigations: summary-column list + pagination for `listSessions` (prevents read amplification as sessions grow).
3. Add `GET /api/stagecraft/export` (backup/recovery/portability).
4. Confirm the Supabase project's backup tier.
5. Resolve the `secrets.json` serverless limitation via Option 1 (env-var + gated UI) before serverless cutover.
6. Audit: service-role key server-only; no Stagecraft table exposed to anon until 3.2 RLS policies land.

None of these block 3.1; items 2, 3, and 5 are the highest-value to fold into the 3.1 task list. Await approval (and a decision on whether to include export + the secrets-UI gating in 3.1 scope or as immediate fast-follows).
