import { isFollowUpDue } from "@/lib/clients-api";

export type OutreachLogStatus = "contacted" | "awaiting_reply";

/** Format an ISO timestamp as YYYY-MM-DD in the tenant registration timezone. */
export function toDateInputValue(
  isoValue: string | null,
  timeZoneId?: string | null
): string {
  if (!isoValue) {
    return "";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZoneId ?? "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Add calendar days to today in tenant-local date, returning YYYY-MM-DD. */
export function addDaysToDateInputValue(
  days: number,
  timeZoneId?: string | null,
  from: Date = new Date()
): string {
  const anchor = toDateInputValue(from.toISOString(), timeZoneId);
  if (!anchor) {
    return "";
  }

  const [year, month, day] = anchor.split("-").map(Number);
  const shifted = addCalendarDays(year, month, day, days);
  const nextMonth = String(shifted.month).padStart(2, "0");
  const nextDay = String(shifted.day).padStart(2, "0");
  return `${shifted.year}-${nextMonth}-${nextDay}`;
}

/** Whether to offer the follow-up date nudge after saving an outreach log. */
export function shouldNudgeFollowUpDateAfterOutreach(
  nextFollowUpAt: string | null,
  status: OutreachLogStatus,
  timeZoneId?: string | null
): boolean {
  if (!nextFollowUpAt) {
    return true;
  }

  if (status === "awaiting_reply") {
    return isFollowUpDue(nextFollowUpAt, timeZoneId);
  }

  return false;
}
