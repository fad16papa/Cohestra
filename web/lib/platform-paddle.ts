export const MISSING_INSTRUMENTATION_COPY = "Missing instrumentation";

export const MISSING_INSTRUMENTATION_CAVEAT =
  "No paddle_webhook_deliveries rows have been recorded yet. This is not Paddle down, not an empty billing history, and not a healthy or failed billing status.";

export const FILTERED_EMPTY_COPY = "No deliveries match these filters.";

export const PADDLE_MUTATION_LABELS = [
  "Replay",
  "Retry webhook",
  "Reprocess",
  "Mark Paid",
  "Mark Active",
  "Edit BillingStatus",
  "Change Plan",
  "Reveal secret",
  "Rotate secret",
  "Force sync",
  "Delete diagnostic",
] as const;

export function environmentLabel(environment: string, allowLive: boolean): string {
  const trimmed = environment.trim().toLowerCase();
  if (trimmed === "production") {
    return allowLive ? "Production setting (AllowLive on)" : "Production setting (AllowLive off)";
  }
  return "Sandbox setting";
}

export function formatPaddleTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return new Date(parsed).toISOString().replace(".000", "");
}

/** datetime-local values are treated as UTC ObservedAt filters. */
export function toObservedAtFilterIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/Z$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}:00.000Z`).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}.000Z`).toISOString();
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}
