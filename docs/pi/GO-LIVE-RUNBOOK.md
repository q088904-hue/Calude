# PI Govern + Fix — Go-Live Runbook

Operational guide to deploy and verify the Presentation Intelligence (Govern + Fix)
module for Datamatics internal use. Audience: the engineer/admin performing the release.

Module surface: `/pi/login`, `/pi/govern` · APIs under `/api/pi/*` · proxy gate (`src/proxy.ts`)
· migration `supabase/migrations/004_pi_govern.sql`.

---

## 1. Pre-Deployment Checklist

- [ ] Latest `main` builds clean: `npm run build` (TypeScript + lint green).
- [ ] Engine tests pass: `npx tsx --test scripts/pi/engine.test.ts` → 12/12.
- [ ] Hosting decided. **Persistence requires a long-lived store** — choose one:
      - **Supabase** (recommended): durable audit + KPIs, multi-instance safe.
      - **Persistent-disk host** (single node): JSONL fallback at `.pi-data/` survives restarts.
      - ⚠ **Serverless (Vercel) without Supabase**: metrics are EPHEMERAL — not acceptable for go-live.
- [ ] `PI_SESSION_SECRET` generated (step 4).
- [ ] `@datamatics.com` confirmed as the allowed sign-in domain (or override planned).
- [ ] Beta access code decided (optional second factor).
- [ ] Logo asset present: `public/pi/datamatics-logo.png` (committed).
- [ ] Brand & Creative sign-off that ruleset v1 matches current standards
      (`src/lib/pi/ruleset.ts`: Segoe UI · #C00D0D · greys F2F2F2/D9D9D9 · balance 60-80/10-20/≤20/≤20).

## 2. Deployment Steps

1. Deploy `main` to the internal host (build command `npm run build`, start `npm start`).
2. Set all environment variables (step 3) in the host's secret manager.
3. If using Supabase, run migration `004` (step 6).
4. Restart the service so env vars load.
5. Run the full Verification Checklist (step 8) against the live URL.
6. Only after verification passes: send Wave-1 invites (see Launch Plan).

## 3. Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `PI_SESSION_SECRET` | **Yes** | HMAC key signing the session cookie. Must be long + random. |
| `PI_ALLOWED_DOMAIN` | No (default `datamatics.com`) | Email domain permitted to sign in. |
| `PI_ACCESS_CODE` | No | Optional shared beta code (extra factor). Leave unset to gate on domain only. |
| `NEXT_PUBLIC_SUPABASE_URL` | If using Supabase | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | If using Supabase | Anon key (client). |
| `SUPABASE_SERVICE_ROLE_KEY` | If using Supabase | Service role — server-only; writes `pi_runs`/`pi_feedback`. |
| `PI_METRICS_PATH` | No | Override JSONL path (fallback store only). Default `.pi-data/metrics.jsonl`. |

> Persistence auto-selects Supabase when `NEXT_PUBLIC_SUPABASE_URL` **and** `SUPABASE_SERVICE_ROLE_KEY`
> are both set; otherwise JSONL. No code change to switch.

## 4. PI_SESSION_SECRET Setup

Generate a strong secret and store it in the host secret manager (never commit it):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# or: openssl rand -base64 48
```

Set it as `PI_SESSION_SECRET`. **Rotating it invalidates all active sessions** (users re-sign-in) —
acceptable and a clean kill-switch if ever needed.

## 5. Supabase Setup (recommended persistence)

1. Use the existing Datamatics Supabase project (same one MeenTrack/Stagecraft use) or create one.
2. Copy from Project Settings → API: project URL, anon key, **service role key**.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Run migration `004` (step 6).
- Security: `pi_runs`/`pi_feedback` have RLS enabled with **no anon policies** — only the
  server-side service-role client reads/writes them. Deck content is never stored (only metadata:
  filename, scores, fixes, user email).

## 6. Migration Execution

```bash
# Via Supabase CLI (preferred)
supabase db push        # applies pending migrations incl. 004_pi_govern.sql

# Or paste supabase/migrations/004_pi_govern.sql into the Supabase SQL editor and run.
```
Creates `pi_runs` (one row per fix: user, deck, before/after, fixes, editability) and
`pi_feedback` (satisfaction + minutes saved). Idempotency: do not re-run if tables already exist.

## 7. Access Code Configuration

- **Domain-only (simplest):** leave `PI_ACCESS_CODE` unset. Anyone with an `@datamatics.com`
  email can sign in.
- **Domain + code (recommended for beta):** set `PI_ACCESS_CODE` to a shared phrase and distribute
  it only to invited Wave-1 users. Rotate by changing the env var (forces re-entry on next login).

## 8. Verification Checklist (run against the LIVE url; replace $URL)

```bash
URL=https://<internal-host>

# A. Login page reachable (public)
curl -s -o /dev/null -w "login page: %{http_code}\n" $URL/pi/login            # expect 200

# B. Unauthenticated API is blocked
curl -s -o /dev/null -w "analyze unauth: %{http_code}\n" \
  -X POST $URL/api/pi/analyze                                                  # expect 401

# C. Non-Datamatics email rejected
curl -s -X POST $URL/api/pi/auth/login -H "Content-Type: application/json" \
  -d '{"email":"x@gmail.com","code":"<CODE>"}' -w " %{http_code}\n"           # expect 403

# D. Valid login issues a session
curl -s -c /tmp/pi.txt -X POST $URL/api/pi/auth/login -H "Content-Type: application/json" \
  -d '{"email":"you@datamatics.com","code":"<CODE>"}' -w " %{http_code}\n"    # expect 200

# E. Authenticated analyze on a real .pptx
curl -s -b /tmp/pi.txt -X POST $URL/api/pi/analyze -F "file=@sample.pptx" \
  -o /tmp/r.json -w "analyze: %{http_code}\n"                                  # expect 200
# F. Authenticated fix returns an editable .pptx + score headers
curl -s -b /tmp/pi.txt -X POST $URL/api/pi/fix -F "file=@sample.pptx" -F "mode=enforce" \
  -D - -o /tmp/fixed.pptx | grep -i "x-pi-"                                    # expect before/after scores

# G. Open /tmp/fixed.pptx in real PowerPoint → text editable, on-brand. (MANUAL — the key gate.)

# H. Audit + KPIs populated
curl -s -b /tmp/pi.txt $URL/api/pi/audit   | head -c 300; echo
curl -s -b /tmp/pi.txt $URL/api/pi/metrics | head -c 300; echo

rm -f /tmp/pi.txt /tmp/r.json /tmp/fixed.pptx
```

**Sign-off:** all of A–H pass AND the manual PowerPoint open (G) confirms editability + brand →
the release is GO. Any failure on B, D, or G is a **release blocker**.

---

## 9. Admin Documentation

### User onboarding
1. Confirm the person has an `@datamatics.com` email.
2. Share the URL (`/pi/govern`) + the beta access code (if `PI_ACCESS_CODE` is set).
3. Point them to the User Guide (`docs/pi/USER-GUIDE.md`). No per-user account provisioning —
   the domain (+ code) is the gate; sessions last 8h.

### Access management
- **Grant:** give the access code / confirm domain. **Revoke an individual:** not individually
  scoped in beta (domain+code model) — rotate `PI_ACCESS_CODE` to cut off all non-reinvited users.
- **Lock everything immediately:** rotate `PI_SESSION_SECRET` (invalidates all sessions) and/or
  unset/short-circuit the access code.
- **Change allowed org:** update `PI_ALLOWED_DOMAIN`.

### Audit review
- `GET /api/pi/audit` → most-recent fix runs: `userEmail · filename · before→after · mode · editability`.
- Source of truth: Supabase `pi_runs` table (or `.pi-data/metrics.jsonl` in fallback mode).
- Use for governance questions: who processed which deck, what changed, did editability hold (must be 100%).

### KPI review
- `GET /api/pi/metrics` → decks governed, avg score lift, violations detected/fixed, editability rate,
  satisfaction, total minutes saved, unique users. Also visible on the `/pi/govern` KPI strip.

### Feedback review
- Subjective signal lives in `pi_feedback` (satisfaction 1-5, estimated minutes saved, manual-still-needed).
- Review weekly with the Creative team to tune the ruleset and prioritize fixes.

### Troubleshooting
| Symptom | Cause / fix |
|---|---|
| Everyone redirected to `/pi/login` repeatedly | `PI_SESSION_SECRET` changed between requests, or not set consistently across instances → set one stable value. |
| `401` on every API call | Not signed in / cookie blocked. Confirm cookies allowed; HTTPS in prod (cookie is `secure`). |
| `403` on login | Wrong email domain or wrong access code. |
| `422` on analyze/fix | Corrupt / password-protected / non-PowerPoint file → ask user to re-save as `.pptx`. |
| `413` | File > 40 MB. |
| KPIs reset after deploy | Running serverless/ephemeral without Supabase → apply migration 004 + set Supabase env. |
| Audit empty though decks processed | Supabase env half-set (URL without service key) → falls back to local JSONL; set both. |
| Fix returns `422 "editability validation failed"` | The safety gate rejected a bad fix; original is untouched. Capture the file → this is a **P1** report. |
