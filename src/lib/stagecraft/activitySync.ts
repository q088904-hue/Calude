"use client";

// Client-side activity reconciliation (Initiative 3.3-A/C).
// localStorage stays the synchronous source for the tracker's useSyncExternalStore
// snapshot; this module pushes/pulls it to the server copy via
// /api/stagecraft/activity (which merges) so streaks + today's counts converge
// across devices. On supabase backend this is the durable cross-device path; on
// file backend it round-trips through .stagecraft/activity.json (harmless).

interface ClientActivity {
  streakDates: string[];
  todayDate?: string;
  todaySessions: number;
  todayQuickfires: number;
}

const STREAK = "sc_streak_dates";
const S_DATE = "sc_session_last_date";
const S_CNT = "sc_session_today_count";
const Q_DATE = "sc_qf_date";
const Q_CNT = "sc_qf_count";

export const ACTIVITY_EVENT = "sc:daily-update";

export function readLocalActivity(): ClientActivity {
  if (typeof window === "undefined")
    return { streakDates: [], todaySessions: 0, todayQuickfires: 0 };
  const today = new Date().toDateString();
  let streakDates: string[] = [];
  try {
    streakDates = JSON.parse(localStorage.getItem(STREAK) ?? "[]") as string[];
  } catch {
    streakDates = [];
  }
  return {
    streakDates,
    todayDate: today,
    todaySessions:
      localStorage.getItem(S_DATE) === today
        ? parseInt(localStorage.getItem(S_CNT) ?? "0", 10)
        : 0,
    todayQuickfires:
      localStorage.getItem(Q_DATE) === today
        ? parseInt(localStorage.getItem(Q_CNT) ?? "0", 10)
        : 0,
  };
}

function writeLocalActivity(a: ClientActivity): void {
  if (typeof window === "undefined") return;
  const today = new Date().toDateString();
  if (Array.isArray(a.streakDates)) {
    localStorage.setItem(STREAK, JSON.stringify(a.streakDates.slice(-60)));
  }
  if (a.todayDate === today) {
    localStorage.setItem(S_DATE, today);
    localStorage.setItem(S_CNT, String(a.todaySessions ?? 0));
    localStorage.setItem(Q_DATE, today);
    localStorage.setItem(Q_CNT, String(a.todayQuickfires ?? 0));
  }
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
}

/**
 * Push local activity → server (which merges + persists), then apply the merged
 * result back to localStorage and notify the tracker. Best-effort; on any failure
 * still notifies so the local-only value renders. Fire-and-forget at call sites.
 */
export async function syncActivity(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/stagecraft/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readLocalActivity()),
    });
    if (!res.ok) {
      window.dispatchEvent(new Event(ACTIVITY_EVENT));
      return;
    }
    writeLocalActivity((await res.json()) as ClientActivity);
  } catch {
    window.dispatchEvent(new Event(ACTIVITY_EVENT));
  }
}
