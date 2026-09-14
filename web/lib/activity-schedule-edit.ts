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
  const date = new Date(dateTimeLocal);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Choose a valid date and time for the schedule.");
  }

  return {
    schedule: formatScheduleForStorage(dateTimeLocal),
    scheduledStartsAt: date.toISOString(),
  };
}

export function isSameScheduleDateTimeLocal(
  activity: ActivityScheduleSource,
  dateTimeLocal: string
): boolean {
  return activityScheduleToDateTimeLocal(activity) === dateTimeLocal;
}
