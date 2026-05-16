// Local file-based memorize queue.
// Stored at <project>/.stagecraft/memorize.json next to sessions.json.
// Server-only.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { MemorizedAnswer } from "./types";

const DATA_DIR = path.join(process.cwd(), ".stagecraft");
const FILE = path.join(DATA_DIR, "memorize.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, "[]", "utf8");
  }
}

async function readAll(): Promise<MemorizedAnswer[]> {
  await ensureFile();
  const raw = await fs.readFile(FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemorizedAnswer[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: MemorizedAnswer[]) {
  await ensureFile();
  await fs.writeFile(FILE, JSON.stringify(records, null, 2), "utf8");
}

export async function listMemorized(): Promise<MemorizedAnswer[]> {
  const all = await readAll();
  // Newest first.
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addMemorized(
  record: Omit<MemorizedAnswer, "id" | "createdAt">,
): Promise<MemorizedAnswer> {
  const all = await readAll();
  const id = `m_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const created: MemorizedAnswer = {
    ...record,
    id,
    createdAt: new Date().toISOString(),
  };
  all.push(created);
  await writeAll(all);
  return created;
}

export async function removeMemorized(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((m) => m.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

export async function bumpReview(id: string): Promise<MemorizedAnswer | null> {
  const all = await readAll();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  all[idx].reviewCount = (all[idx].reviewCount ?? 0) + 1;
  all[idx].lastReviewedAt = new Date().toISOString();
  await writeAll(all);
  return all[idx];
}
