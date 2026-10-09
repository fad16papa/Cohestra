import type { PlatformHealthCheck } from "@/lib/platform-api";

export function shouldShowDegradedBanner(overallStatus: string): boolean {
  return overallStatus === "Degraded" || overallStatus === "Unhealthy";
}

export function failingHealthChecks(checks: PlatformHealthCheck[]): PlatformHealthCheck[] {
  return checks.filter(
    (check) => check.status === "Degraded" || check.status === "Unhealthy"
  );
}

export function formatDurationMs(durationMs: number | null): string {
  if (durationMs == null || !Number.isFinite(durationMs)) {
    return "Duration not reported";
  }
  return `${Math.round(durationMs)} ms`;
}

export function healthStatusLabel(status: string): string {
  switch (status) {
    case "Healthy":
      return "Healthy";
    case "Degraded":
      return "Degraded";
    case "Unhealthy":
      return "Unhealthy";
    case "not_in_probe":
      return "Not in this probe";
    default:
      return status;
  }
}

export function stackHealthSummary(health: { overallStatus: string }): string {
  if (health.overallStatus === "Healthy") {
    return "PostgreSQL, Redis, and default-tenant checks ran and reported Healthy. This does not prove outbox, Paddle, or email are healthy.";
  }
  return "One or more postgres, redis, or default-tenant checks are not Healthy. Outbox, Paddle, and email are still not measured by this probe.";
}
