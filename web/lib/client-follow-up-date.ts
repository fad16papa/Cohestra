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
  const shifted = new Date(year, month - 1, day + days);
  const nextYear = shifted.getFullYear();
  const nextMonth = String(shifted.getMonth() + 1).padStart(2, "0");
  const nextDay = String(shifted.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
