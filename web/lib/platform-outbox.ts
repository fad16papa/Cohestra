import type { PlatformNamedCount } from "@/lib/platform-api";

export const NO_FAILED_OUTBOX_COPY = "No failed outbox jobs are recorded.";

export const NO_FAILED_OUTBOX_CAVEAT =
  "This does not mean email is healthy, that SendGrid delivered mail, or that hosted workers are running.";

export const OUTBOX_MUTATION_LABELS = [
  "Requeue",
  "Replay",
  "Retry",
  "Run now",
  "Reset attempts",
  "Mark completed",
  "Delete",
  "Cancel",
] as const;

export function failedCount(counts: PlatformNamedCount[]): number | null {
  const row = counts.find((item) => item.key === "Failed");
  return row ? row.count : null;
}

export function formatOutboxTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return new Date(parsed).toISOString().replace(".000", "");
}
