import type { Activity, ActivityStatus } from "@/lib/activities-api";
import { parseActivitySchedule } from "@/lib/activity-schedule-utils";

export type CalendarActivity = Activity & {
  parsedSchedule: Date | null;
};

export function enrichActivitiesForCalendar(
  activities: Activity[]
): CalendarActivity[] {
  return activities.map((activity) => ({
    ...activity,
    parsedSchedule: parseActivitySchedule(activity.schedule),
  }));
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

export function getMonthGridDays(year: number, month: number): Date[] {
  const first = startOfMonth(year, month);
  const startOffset = first.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function groupScheduledActivitiesByDay(
  activities: CalendarActivity[]
): Map<string, CalendarActivity[]> {
  const grouped = new Map<string, CalendarActivity[]>();

  for (const activity of activities) {
    if (!activity.parsedSchedule) {
      continue;
    }

    const key = toDateKey(activity.parsedSchedule);
    const bucket = grouped.get(key) ?? [];
    bucket.push(activity);
    grouped.set(key, bucket);
  }

  for (const [, bucket] of grouped) {
    bucket.sort(
      (a, b) =>
        (a.parsedSchedule?.getTime() ?? 0) - (b.parsedSchedule?.getTime() ?? 0)
    );
  }

  return grouped;
}

export function getUnscheduledActivities(
  activities: CalendarActivity[]
): CalendarActivity[] {
  return activities
    .filter((activity) => !activity.parsedSchedule)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatCalendarMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

export function formatActivityTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDayHeading(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

export const STATUS_DOT_STYLES: Record<ActivityStatus, string> = {
  draft: "bg-muted-foreground/70",
  published: "bg-status-active",
  archived: "bg-status-inactive",
};

export const STATUS_RING_STYLES: Record<ActivityStatus, string> = {
  draft: "ring-muted-foreground/30",
  published: "ring-status-active/40",
  archived: "ring-status-inactive/40",
};

export function countActivitiesByStatusOnDay(
  activities: CalendarActivity[]
): Record<ActivityStatus, number> {
  return activities.reduce(
    (counts, activity) => {
      counts[activity.status] += 1;
      return counts;
    },
    { draft: 0, published: 0, archived: 0 }
  );
}
