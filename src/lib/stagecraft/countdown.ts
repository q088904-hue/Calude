// Shared interview-date countdown math. Single source of truth for the days
// calculation + label so the hub CountdownStrip and the header CountdownChip
// stay in lockstep. Pure; no rendering, no pacing/sprint logic (those stay in
// the consumer).

export type CountdownUrgency = "today" | "urgent" | "soon" | "far" | "past";

export interface CountdownInfo {
  /** Whole days until the target date (negative if past). */
  days: number;
  /** "Today" | "1 day left" | "N days left" | "" (past). */
  label: string;
  /** today | urgent (≤3) | soon (≤7) | far | past — mirrors the hub colors. */
  urgency: CountdownUrgency;
}

/**
 * Compute days/label/urgency for an ISO date (YYYY-MM-DD), parsed without
 * timezone shift. Matches the existing CountdownStrip math exactly.
 */
export function computeCountdown(
  isoDate: string,
  now: Date = new Date(),
): CountdownInfo {
  const t0 = new Date(now);
  t0.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const days = Math.round(
    (target.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24),
  );

  const urgency: CountdownUrgency =
    days < 0
      ? "past"
      : days === 0
        ? "today"
        : days <= 3
          ? "urgent"
          : days <= 7
            ? "soon"
            : "far";

  const label =
    days < 0
      ? ""
      : days === 0
        ? "Today"
        : days === 1
          ? "1 day left"
          : `${days} days left`;

  return { days, label, urgency };
}
