import { parseActivitySchedule } from "@/lib/activity-schedule-utils";
import {
  defaultScheduleDateTimeLocal,
  formatScheduleForStorage,
  toDateTimeLocalValue,
} from "@/lib/geolocation";

type ActivityScheduleSource = {
  schedule: string;
  scheduledStartsAt?: string | null;
};

/** Map stored activity schedule to a datetime-local input value. */
export function activityScheduleToDateTimeLocal(
  activity: ActivityScheduleSource
): string {
  if (activity.scheduledStartsAt) {
    const structured = new Date(activity.scheduledStartsAt);
    if (!Number.isNaN(structured.getTime())) {
      return toDateTimeLocalValue(structured);
    }
  }

  const parsed = parseActivitySchedule(activity.schedule);
  if (parsed) {
    return toDateTimeLocalValue(parsed);
  }

  return defaultScheduleDateTimeLocal();
}

export function buildScheduleUpdatePayload(dateTimeLocal: string): {
  schedule: string;
  scheduledStartsAt: string;
} {
  return {
    schedule: formatScheduleForStorage(dateTimeLocal),
    scheduledStartsAt: new Date(dateTimeLocal).toISOString(),
  };
}

export function isSameScheduleDateTimeLocal(
  activity: ActivityScheduleSource,
  dateTimeLocal: string
): boolean {
  return activityScheduleToDateTimeLocal(activity) === dateTimeLocal;
}
