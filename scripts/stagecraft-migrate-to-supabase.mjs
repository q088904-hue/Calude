#!/usr/bin/env node
// Stagecraft persistence migration: .stagecraft/*.json  →  Supabase (005 schema).
//
// Usage (run from a dev machine / CI — NOT serverless; never deletes the JSON):
//   node scripts/stagecraft-migrate-to-supabase.mjs --dry-run   # simulate, write nothing
//   node scripts/stagecraft-migrate-to-supabase.mjs             # idempotent upsert
//   node scripts/stagecraft-migrate-to-supabase.mjs --verify    # parity gate (run before cutover)
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (except --dry-run,
// which reads only the local JSON). Idempotent: re-runnable; upserts on conflict.
//
// --verify checks profile / session / config / export parity between the local
// JSON (source of truth) and the migrated Supabase rows. Cut over (set
// STAGECRAFT_STORE=supabase) ONLY after --verify reports ALL PASS.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const SENTINEL_USER_ID = "00000000-0000-0000-0000-000000000000";
const DATA_DIR = path.join(process.cwd(), ".stagecraft");
const FILES = {
  profile: path.join(DATA_DIR, "profile.json"),
  sessions: path.join(DATA_DIR, "sessions.json"),
  config: path.join(DATA_DIR, "config.json"),
};

const mode = process.argv.includes("--verify")
  ? "verify"
  : process.argv.includes("--dry-run")
    ? "dry-run"
    : "migrate";

// ── helpers ──────────────────────────────────────────────────────────────────

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Deterministic stringify (sorted keys) for deep-equality comparison. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

const deepEqual = (a, b) => canonical(a) === canonical(b);

/** Mirror of src/lib/stagecraft/sessionSummary.ts summarise() — keep in lockstep. */
function summarise(s) {
  if (!s.items || s.items.length === 0) return null;
  const n = s.items.length;
  const sum = s.items.reduce(
    (a, it) => {
      a.c += it.scores.content;
      a.e += it.scores.english;
      a.d += it.scores.delivery;
      return a;
    },
    { c: 0, e: 0, d: 0 },
  );
  const ac = +(sum.c / n).toFixed(1);
  const ae = +(sum.e / n).toFixed(1);
  const ad = +(sum.d / n).toFixed(1);
  const composite = +(ac * 0.4 + ae * 0.3 + ad * 0.3).toFixed(1);
  const patterns = s.items.flatMap((it) => it.patterns ?? []);
  return {
    id: s.id,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    role: s.config.targetRole,
    round: s.config.round,
    difficulty: s.config.difficulty,
    questionCount: n,
    avgContent: ac,
    avgEnglish: ae,
    avgDelivery: ad,
    composite,
    patterns,
  };
}

function toSessionRow(record) {
  const summary = summarise(record);
  return {
    id: record.id,
    user_id: SENTINEL_USER_ID,
    started_at: record.startedAt ?? null,
    ended_at: record.endedAt ?? null,
    composite: summary?.composite ?? null,
    summary: summary ?? null,
    data: record,
  };
}

async function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "✗ Refusing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── modes ────────────────────────────────────────────────────────────────────

async function loadLocal() {
  const profile = await readJson(FILES.profile, null);
  const sessions = await readJson(FILES.sessions, []);
  const config = await readJson(FILES.config, {});
  return { profile, sessions, config };
}

async function runDryRun() {
  const { profile, sessions, config } = await loadLocal();
  console.log("— DRY RUN (no writes) —");
  console.log(`profile.json : ${profile ? "present → 1 upsert" : "absent → skip"}`);
  console.log(`config.json  : ${Object.keys(config).length ? "present → 1 upsert" : "empty → upsert {}"}`);
  console.log(`sessions.json: ${sessions.length} record(s) → ${sessions.length} upsert(s)`);
  const summarised = sessions.filter((s) => summarise(s)).length;
  console.log(`  └ ${summarised} have ≥1 item (summary computed), ${sessions.length - summarised} empty shells`);
  console.log("OK — transform valid. Run without --dry-run to write.");
}

async function runMigrate() {
  const supa = await getClient();
  const { profile, sessions, config } = await loadLocal();

  if (profile) {
    const { error } = await supa
      .from("stagecraft_profiles")
      .upsert({ user_id: SENTINEL_USER_ID, data: profile }, { onConflict: "user_id" });
    if (error) throw new Error(`profile: ${error.message}`);
    console.log("✓ profile upserted");
  } else {
    console.log("• profile.json absent — skipped");
  }

  const { error: cfgErr } = await supa
    .from("stagecraft_config")
    .upsert({ user_id: SENTINEL_USER_ID, data: config }, { onConflict: "user_id" });
  if (cfgErr) throw new Error(`config: ${cfgErr.message}`);
  console.log("✓ config upserted");

  if (sessions.length) {
    const rows = sessions.map(toSessionRow);
    const { error } = await supa
      .from("stagecraft_sessions")
      .upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`sessions: ${error.message}`);
    console.log(`✓ ${rows.length} session(s) upserted`);
  } else {
    console.log("• no sessions to migrate");
  }

  console.log("\nMigration complete. Local JSON retained. Run --verify before cutover.");
}

async function runVerify() {
  const supa = await getClient();
  const { profile, sessions, config } = await loadLocal();
  let allPass = true;
  const report = (label, pass, detail = "") => {
    allPass = allPass && pass;
    console.log(`${pass ? "✓ PASS" : "✗ FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  };

  // Profile parity
  const { data: pRow } = await supa
    .from("stagecraft_profiles")
    .select("data")
    .eq("user_id", SENTINEL_USER_ID)
    .maybeSingle();
  if (profile) {
    report("Profile parity", pRow != null && deepEqual(profile, pRow.data));
  } else {
    report("Profile parity", true, "no local profile (nothing to compare)");
  }

  // Config parity
  const { data: cRow } = await supa
    .from("stagecraft_config")
    .select("data")
    .eq("user_id", SENTINEL_USER_ID)
    .maybeSingle();
  report("Config parity", cRow != null && deepEqual(config, cRow.data));

  // Session parity (count + per-id deep equality of full record)
  const { data: sRows } = await supa
    .from("stagecraft_sessions")
    .select("id, data")
    .eq("user_id", SENTINEL_USER_ID);
  const remote = new Map((sRows ?? []).map((r) => [r.id, r.data]));
  const countMatch = remote.size === sessions.length;
  let perRecord = true;
  for (const s of sessions) {
    if (!remote.has(s.id) || !deepEqual(s, remote.get(s.id))) perRecord = false;
  }
  report("Session parity", countMatch && perRecord, `${sessions.length} local / ${remote.size} remote`);

  // Export parity — reconstruct the export body from each side (ignore exportedAt)
  const localExport = { version: 1, profile, config, sessions };
  const remoteExport = {
    version: 1,
    profile: pRow?.data ?? null,
    config: cRow?.data ?? {},
    sessions: sessions
      .map((s) => remote.get(s.id))
      .filter((d) => d != null),
  };
  report("Export parity", deepEqual(localExport, remoteExport));

  console.log(`\n${allPass ? "ALL PASS — safe to cut over (set STAGECRAFT_STORE=supabase)." : "FAILURES present — DO NOT cut over."}`);
  process.exit(allPass ? 0 : 2);
}

// ── entry ────────────────────────────────────────────────────────────────────

try {
  if (mode === "dry-run") await runDryRun();
  else if (mode === "verify") await runVerify();
  else await runMigrate();
} catch (err) {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
