/** Format a UTC ISO instant as datetime-local in the tenant registration timezone. */
export function toCloseAtDateTimeLocal(
  isoUtc: string | null | undefined,
  timeZoneId?: string | null
): string {
  if (!isoUtc?.trim()) {
    return "";
  }

  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZoneId ?? "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";

    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  }
}

function getTimeZoneOffsetMs(at: Date, timeZoneId: string): number | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZoneId,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = formatter.formatToParts(at);
    const filled: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        filled[part.type] = part.value;
      }
    }

    const asUtc = Date.UTC(
      Number(filled.year),
      Number(filled.month) - 1,
      Number(filled.day),
      Number(filled.hour),
      Number(filled.minute),
      Number(filled.second)
    );

    return asUtc - at.getTime();
  } catch {
    return null;
  }
}

/** Parse datetime-local as tenant-local time and return a UTC ISO instant. */
export function closeAtDateTimeLocalToUtcIso(
  dateTimeLocal: string,
  timeZoneId?: string | null
): string | null {
  const trimmed = dateTimeLocal.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const zone = timeZoneId ?? "UTC";

  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 3; attempt++) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), zone);
    if (offset === null) {
      return null;
    }

    utcMs = Date.UTC(year, month - 1, day, hour, minute) - offset;
  }

  return new Date(utcMs).toISOString();
}

/** Human-readable preview for operator helper copy (no timezone jargon). */
export function formatCloseAtPreview(
  isoUtc: string | null | undefined,
  timeZoneId?: string | null
): string | null {
  if (!isoUtc?.trim()) {
    return null;
  }

  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timeZoneId ?? "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
