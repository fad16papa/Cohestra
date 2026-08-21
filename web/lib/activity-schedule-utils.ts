function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Seed/demo format: "Week 3, Saturdays 10:00" */
const WEEK_SATURDAY_PATTERN =
  /^Week\s+(\d{1,3}),\s*Saturdays?\s+(\d{1,2}):(\d{2})$/i;

/** Weekday + time only, e.g. "Saturday 10:00" */
const WEEKDAY_TIME_PATTERN =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\s+(\d{1,2}):(\d{2})$/i;

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function resolveWeekdayIndex(label: string): number | null {
  const key = label.trim().slice(0, 3).toLowerCase();
  return WEEKDAY_INDEX[key] ?? null;
}

/**
 * Map "Week N" seed labels to the Nth upcoming Saturday from a reference date.
 * Week 1 = next/current Saturday, Week 2 = +7 days, etc.
 */
function parseWeekSaturdaySchedule(
  weekNum: number,
  hour: number,
  minute: number,
  reference: Date = new Date()
): Date | null {
  if (weekNum < 1 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const ref = startOfLocalDay(reference);
  const daysUntilSaturday = (6 - ref.getDay() + 7) % 7;
  const firstSaturday = new Date(ref);
  firstSaturday.setDate(ref.getDate() + daysUntilSaturday);
  firstSaturday.setHours(hour, minute, 0, 0);

  const target = new Date(firstSaturday);
  target.setDate(firstSaturday.getDate() + (weekNum - 1) * 7);
  return target;
}

function parseWeekdayTimeSchedule(
  weekdayIndex: number,
  hour: number,
  minute: number,
  reference: Date = new Date()
): Date | null {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const ref = startOfLocalDay(reference);
  let daysUntil = (weekdayIndex - ref.getDay() + 7) % 7;
  if (daysUntil === 0) {
    daysUntil = 7;
  }

  const target = new Date(ref);
  target.setDate(ref.getDate() + daysUntil);
  target.setHours(hour, minute, 0, 0);
  return target;
}

/**
 * Best-effort parse of activity.schedule display strings.
 * Supports UI format ("Sat, Jun 14, 2026, 10:00 AM"), ISO/datetime-local,
 * and seed labels ("Week 2, Saturdays 10:00", "Saturday 10:00").
 */
export function parseActivitySchedule(
  schedule: string,
  options: { referenceDate?: Date } = {}
): Date | null {
  const trimmed = schedule.trim();
  if (!trimmed) {
    return null;
  }

  const reference = options.referenceDate ?? new Date();

  const weekMatch = trimmed.match(WEEK_SATURDAY_PATTERN);
  if (weekMatch) {
    return parseWeekSaturdaySchedule(
      Number.parseInt(weekMatch[1], 10),
      Number.parseInt(weekMatch[2], 10),
      Number.parseInt(weekMatch[3], 10),
      reference
    );
  }

  const weekdayMatch = trimmed.match(WEEKDAY_TIME_PATTERN);
  if (weekdayMatch) {
    const weekdayIndex = resolveWeekdayIndex(weekdayMatch[1]);
    if (weekdayIndex === null) {
      return null;
    }

    return parseWeekdayTimeSchedule(
      weekdayIndex,
      Number.parseInt(weekdayMatch[2], 10),
      Number.parseInt(weekdayMatch[3], 10),
      reference
    );
  }

  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2})?/.test(trimmed)) {
    const isoParsed = new Date(trimmed);
    if (!Number.isNaN(isoParsed.getTime())) {
      return isoParsed;
    }
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

/**
 * Best-effort parse of activity schedule start time.
 * Prefers structured scheduledStartsAt when available.
 */
export function resolveActivityStartDate(
  activity: { schedule: string; scheduledStartsAt?: string | null },
  options: { referenceDate?: Date } = {}
): Date | null {
  if (activity.scheduledStartsAt) {
    const structured = new Date(activity.scheduledStartsAt);
    if (!Number.isNaN(structured.getTime())) {
      return structured;
    }
  }

  return parseActivitySchedule(activity.schedule, options);
}

/**
 * True when the scheduled event is today or still in the future (local calendar day).
 * Used to warn before archiving a live registration channel before the event passes.
 */
export function isActivityScheduleUpcomingOrToday(
  schedule: string,
  now: Date = new Date(),
  scheduledStartsAt?: string | null
): boolean {
  const eventDate = scheduledStartsAt
    ? resolveActivityStartDate({ schedule, scheduledStartsAt }, { referenceDate: now })
    : parseActivitySchedule(schedule, { referenceDate: now });
  if (!eventDate) {
    return false;
  }

  const eventDay = startOfLocalDay(eventDate);
  const today = startOfLocalDay(now);
  return eventDay.getTime() >= today.getTime();
}
