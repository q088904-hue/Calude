// Local file-based session persistence for Stagecraft v0.
// Single-user, no DB. Stored under <project>/.stagecraft/sessions.json.
// Server-only. Do not import this from a client component.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { SessionRecord, QAItem } from "./types";

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
  return readAll();
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const all = await readAll();
  return all.find((s) => s.id === id) ?? null;
}

export async function upsertSession(record: SessionRecord): Promise<void> {
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
  const all = await readAll();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  all[idx].report = report;
  all[idx].endedAt = new Date().toISOString();
  await writeAll(all);
  return all[idx];
}
