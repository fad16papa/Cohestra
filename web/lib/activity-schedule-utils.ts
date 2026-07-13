function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Best-effort parse of activity.schedule display strings
 * (e.g. "Sat, Jun 14, 2026, 10:00 AM"). Returns null when parsing fails.
 */
export function parseActivitySchedule(schedule: string): Date | null {
  const trimmed = schedule.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed);
}

/**
 * True when the scheduled event is today or still in the future (local calendar day).
 * Used to warn before archiving a live registration channel before the event passes.
 */
export function isActivityScheduleUpcomingOrToday(
  schedule: string,
  now: Date = new Date()
): boolean {
  const eventDate = parseActivitySchedule(schedule);
  if (!eventDate) {
    return false;
  }

  const eventDay = startOfLocalDay(eventDate);
  const today = startOfLocalDay(now);
  return eventDay.getTime() >= today.getTime();
}
