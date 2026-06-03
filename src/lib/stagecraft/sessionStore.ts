// Local file-based session persistence for Stagecraft v0.
// Single-user, no DB. Stored under <project>/.stagecraft/sessions.json.
// Server-only. Do not import this from a client component.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { SessionRecord, QAItem } from "./types";
import { summarise, type SessionSummary } from "./sessionSummary";
import { isSupabaseBackend } from "./storeBackend";
import * as supa from "./supabaseStore";

const DATA_DIR = path.join(process.cwd(), ".stagecraft");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(SESSIONS_FILE);
  } catch {
    await fs.writeFile(SESSIONS_FILE, "[]", "utf8");
  }
}

async function readAll(): Promise<SessionRecord[]> {
  await ensureFile();
  const raw = await fs.readFile(SESSIONS_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: SessionRecord[]) {
  await ensureFile();
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(records, null, 2), "utf8");
}

export async function listSessions(): Promise<SessionRecord[]> {
  if (isSupabaseBackend()) return supa.listSessions();
  return readAll();
}

/**
 * Cheap, newest-first per-session summaries — never deserializes `items`.
 * File store computes from the records on read (local, fast); the supabase
 * backend reads precomputed summary columns. Optional limit/offset paging.
 */
export async function listSessionSummaries(opts?: {
  limit?: number;
  offset?: number;
}): Promise<SessionSummary[]> {
  if (isSupabaseBackend()) return supa.listSessionSummaries(opts);
  const all = await readAll();
  const summaries = all
    .map(summarise)
    .filter((s): s is SessionSummary => s !== null)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  if (opts?.limit === undefined) return summaries;
  const offset = opts.offset ?? 0;
  return summaries.slice(offset, offset + opts.limit);
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  if (isSupabaseBackend()) return supa.getSession(id);
  const all = await readAll();
  return all.find((s) => s.id === id) ?? null;
}

export async function upsertSession(record: SessionRecord): Promise<void> {
  if (isSupabaseBackend()) return supa.upsertSession(record);
  const all = await readAll();
  const idx = all.findIndex((s) => s.id === record.id);
  if (idx === -1) all.push(record);
  else all[idx] = record;
  await writeAll(all);
}

export async function appendItem(
  sessionId: string,
  item: QAItem,
): Promise<SessionRecord | null> {
  if (isSupabaseBackend()) return supa.appendItem(sessionId, item);
  const all = await readAll();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  all[idx].items.push(item);
  await writeAll(all);
  return all[idx];
}

export async function setReport(
  sessionId: string,
  report: string,
): Promise<SessionRecord | null> {
  if (isSupabaseBackend()) return supa.setReport(sessionId, report);
  const all = await readAll();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  all[idx].report = report;
  all[idx].endedAt = new Date().toISOString();
  await writeAll(all);
  return all[idx];
}
