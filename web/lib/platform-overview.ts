import type { PlatformKpiFreshness, PlatformNamedCount } from "@/lib/platform-api";

export function freshnessLabel(freshness: PlatformKpiFreshness): string {
  switch (freshness) {
    case "actual":
      return "Actual";
    case "missing_instrumentation":
      return "Missing instrumentation";
    case "unavailable":
      return "Unavailable";
    case "stale":
      return "Stale";
    default:
      return "Unknown";
  }
}

export function observedLabel(observedAt: string): string {
  const parsed = Date.parse(observedAt);
  if (!Number.isFinite(parsed)) {
    return "Observed time unknown";
  }
  const ageMs = Date.now() - parsed;
  if (ageMs >= 0 && ageMs < 60_000) {
    return "Observed just now";
  }
  return `Observed ${new Date(parsed).toISOString().replace(".000", "")}`;
}

export function sumCounts(counts: PlatformNamedCount[]): number {
  return counts.reduce((total, row) => total + row.count, 0);
}

export function isFakeHealthCopy(text: string): boolean {
  return /\b(healthy|operational|100%|green|\bok\b)\b/i.test(text);
}
