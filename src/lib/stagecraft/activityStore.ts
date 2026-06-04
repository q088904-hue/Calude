// Server-side daily-activity store (Initiative 3.3-A).
// Streak dates + today's session/quickfire counts — previously localStorage-only
// (client). The server copy is the durable, cross-device source; the client keeps
// localStorage as a synchronous read-through cache and reconciles via the
// /api/stagecraft/activity endpoint. Provider-agnostic behind storeBackend.
// Server-only.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { isSupabaseBackend } from "./storeBackend";
import * as supa from "./supabaseStore";

export interface ActivityData {
  /** toDateString() values of practice days (unique, unordered). */
  streakDates?: string[];
  /** toDateString() of the day the today-counts below apply to. */
  todayDate?: string;
  todaySessions?: number;
  todayQuickfires?: number;
}

const ACTIVITY_PATH = path.join(process.cwd(), ".stagecraft", "activity.json");

/** Pure merge of two activity snapshots (union streak days; reconcile today). */
export function mergeActivity(a: ActivityData, b: ActivityData): ActivityData {
  const streakDates = [
    ...new Set([...(a.streakDates ?? []), ...(b.streakDates ?? [])]),
  ];
  // Reconcile today's counts: same day → take the max per counter; different
  // days → the more recent day wins. (Exact same-day cross-device totals are a
  // later concern; the streak — the headline — is exact via the union above.)
  let today: ActivityData = {};
  if (a.todayDate && b.todayDate) {
    if (a.todayDate === b.todayDate) {
      today = {
        todayDate: a.todayDate,
        todaySessions: Math.max(a.todaySessions ?? 0, b.todaySessions ?? 0),
        todayQuickfires: Math.max(a.todayQuickfires ?? 0, b.todayQuickfires ?? 0),
      };
    } else {
      today = new Date(a.todayDate) >= new Date(b.todayDate) ? a : b;
    }
  } else {
    today = a.todayDate ? a : b;
  }
  return {
    streakDates,
    todayDate: today.todayDate,
    todaySessions: today.todaySessions ?? 0,
    todayQuickfires: today.todayQuickfires ?? 0,
  };
}

export async function getActivity(): Promise<ActivityData> {
  if (isSupabaseBackend()) return supa.getActivity();
  try {
    return JSON.parse(await fs.readFile(ACTIVITY_PATH, "utf8")) as ActivityData;
  } catch {
    return {};
  }
}

export async function saveActivity(data: ActivityData): Promise<void> {
  if (isSupabaseBackend()) return supa.saveActivity(data);
  await fs.mkdir(path.dirname(ACTIVITY_PATH), { recursive: true });
  await fs.writeFile(ACTIVITY_PATH, JSON.stringify(data, null, 2), "utf8");
}

/** Read-merge-write: fold an incoming snapshot into the stored one. Idempotent. */
export async function mergeAndSaveActivity(
  incoming: ActivityData,
): Promise<ActivityData> {
  const merged = mergeActivity(await getActivity(), incoming);
  await saveActivity(merged);
  return merged;
}
