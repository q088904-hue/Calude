# Datamatics Presentation Intelligence — Documentation Index

Module: **Govern + Fix** (internal). Status: **Internal-Release Ready (Grade A)**.
Surface: `/pi/govern` · `/pi/login` · `/api/pi/*` · proxy gate `src/proxy.ts` · migration `004_pi_govern.sql`.

## Go-Live Package (release mode)
| Doc | Audience | Purpose |
|---|---|---|
| [GO-LIVE-RUNBOOK.md](./GO-LIVE-RUNBOOK.md) | Engineer / Admin | Deploy, env vars, secret, Supabase, migration, verification, admin ops, troubleshooting |
| [LAUNCH-PLAN.md](./LAUNCH-PLAN.md) | Program lead | Wave rollout, comms, training, support, success framework, Generate gate |
| [USER-GUIDE.md](./USER-GUIDE.md) | All users | Quick start, workflow, score/balance/density explained, FAQ |
| [30-DAY-REVIEW.md](./30-DAY-REVIEW.md) | Leadership | Fill-in review template → invest-in-Generate decision |
| [RELEASE-PACKAGE.md](./RELEASE-PACKAGE.md) | All | One-page user + beta + support reference |

## Launch & Adoption Package (Product Owner / PM)
| Doc | Audience | Purpose |
|---|---|---|
| [launch/1-EXEC-ROLLOUT-DECK.md](./launch/1-EXEC-ROLLOUT-DECK.md) | Leadership / CIO / Business Heads | 14-slide executive rollout presentation |
| [launch/2-ANNOUNCEMENTS.md](./launch/2-ANNOUNCEMENTS.md) | All teams | Leadership / Creative / Marketing / Pre-Sales announcements |
| [launch/3-TRAINING.md](./launch/3-TRAINING.md) | Wave participants | 15-min agenda, demo script, onboarding checklist, FAQ |
| [launch/4-ADOPTION-TOOLKIT.md](./launch/4-ADOPTION-TOOLKIT.md) | Program lead | Weekly KPI, feedback, issue-report, success-story templates |
| [launch/5-30-DAY-REVIEW-DECK.md](./launch/5-30-DAY-REVIEW-DECK.md) | Leadership | Day-30 review presentation (decision: fund Generate?) |

## Strategy & Engineering (development history)
| Doc | Purpose |
|---|---|
| [EXECUTIVE-SUMMARY.md](./EXECUTIVE-SUMMARY.md) | Full concept → release-ready journey (leadership) |
| [GENERATE-SPEC.md](./GENERATE-SPEC.md) | Phase 1A Generate spec — **gated** on the 30-Day Review |
| [../../fixtures/pi/PHASE0-FINDINGS.md](../../fixtures/pi/PHASE0-FINDINGS.md) | Ruleset extraction from real Datamatics assets |
| [../../fixtures/pi/READINESS-REVIEW.md](../../fixtures/pi/READINESS-REVIEW.md) | Production readiness review (B → A) |

## Go-live in one line
Set `PI_SESSION_SECRET` → configure Supabase + run migration `004` → set the access code →
run the Runbook verification → hand `/pi/govern` to the Creative team (Wave 1) → review at Day 30.
