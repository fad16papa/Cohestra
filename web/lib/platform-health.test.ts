import { describe, expect, it } from "vitest";

import { getPlatformOpsHealth, getPlatformOpsOverview } from "@/lib/platform-api";
import {
  failingHealthChecks,
  formatDurationMs,
  healthStatusLabel,
  shouldShowDegradedBanner,
  stackHealthSummary,
} from "@/lib/platform-health";

function kpi(value: unknown, overrides: Record<string, unknown> = {}) {
  return {
    value,
    source: "PostgreSQL tenants",
    observedAt: new Date().toISOString(),
    freshness: "actual",
    ...overrides,
  };
}

function overviewPayload(overrides: Record<string, unknown> = {}) {
  return {
    tenantStatusCounts: kpi([{ key: "Active", count: 1 }]),
    billingStatusCounts: kpi([{ key: "Active", count: 1 }]),
    openSupportCount: kpi(0, { source: "PostgreSQL support_issues" }),
    stackHealth: kpi("Healthy", {
      source: "Authenticated HealthCheckService (postgres, redis, default-tenant)",
      freshness: "actual",
    }),
    ...overrides,
  };
}

const healthPayload = {
  overallStatus: "Healthy",
  observedAt: new Date().toISOString(),
  checks: [
    { name: "default-tenant", status: "Healthy", durationMs: 4, description: "Default tenant (Platform 0) is present." },
    { name: "postgres", status: "Healthy", durationMs: 12, description: "ok" },
    { name: "redis", status: "Healthy", durationMs: 8, description: "ok" },
  ],
  notInProbe: [
    { name: "hosted-jobs", status: "not_in_probe", durationMs: null, description: "Not measured by this probe." },
    { name: "outbox", status: "not_in_probe", durationMs: null, description: "Not measured by this probe." },
    { name: "paddle", status: "not_in_probe", durationMs: null, description: "Not measured by this probe." },
    { name: "sendgrid", status: "not_in_probe", durationMs: null, description: "Not measured by this probe." },
  ],
};

describe("platform health", () => {
  it("shows degraded banner only for measured non-healthy overall status", () => {
    expect(shouldShowDegradedBanner("Healthy")).toBe(false);
    expect(shouldShowDegradedBanner("Degraded")).toBe(true);
    expect(shouldShowDegradedBanner("Unhealthy")).toBe(true);
    expect(shouldShowDegradedBanner("not_in_probe")).toBe(false);
    expect(shouldShowDegradedBanner("unavailable")).toBe(false);
  });

  it("labels measured statuses without collapsing Degraded into Unhealthy", () => {
    expect(healthStatusLabel("Degraded")).toBe("Degraded");
    expect(healthStatusLabel("Unhealthy")).toBe("Unhealthy");
    expect(healthStatusLabel("not_in_probe")).toBe("Not in this probe");
    expect(formatDurationMs(12.4)).toBe("12 ms");
    expect(formatDurationMs(null)).toBe("Duration not reported");
  });

  it("lists only real failing checks", () => {
    expect(
      failingHealthChecks([
        { name: "postgres", status: "Healthy", durationMs: 1, description: null },
        { name: "redis", status: "Degraded", durationMs: 2, description: "slow" },
        { name: "default-tenant", status: "Unhealthy", durationMs: 3, description: "missing" },
      ]).map((check) => check.name)
    ).toEqual(["redis", "default-tenant"]);
  });

  it("does not treat a Healthy probe as proof of outbox Paddle or email", () => {
    const copy = stackHealthSummary({ overallStatus: "Healthy" });
    expect(copy).toMatch(/does not prove/i);
    expect(copy).toMatch(/outbox/i);
    expect(copy).toMatch(/Paddle/);
    expect(copy).toMatch(/email/i);
  });

  it("parses authenticated health and rejects secrets or fake not-in-probe", async () => {
    const health = await getPlatformOpsHealth(
      async () => new Response(JSON.stringify(healthPayload), { status: 200 })
    );
    expect(health.overallStatus).toBe("Healthy");
    expect(health.checks.map((check) => check.name)).toEqual([
      "default-tenant",
      "postgres",
      "redis",
    ]);
    expect(health.notInProbe.every((check) => check.status === "not_in_probe")).toBe(true);
    expect(health.notInProbe.every((check) => check.durationMs == null)).toBe(true);

    await expect(
      getPlatformOpsHealth(
        async () =>
          new Response(
            JSON.stringify({
              ...healthPayload,
              checks: [
                {
                  name: "postgres",
                  status: "Unhealthy",
                  durationMs: 1,
                  description: "Host=db.internal;Password=leak",
                },
              ],
            }),
            { status: 200 }
          )
      )
    ).rejects.toThrow(/Invalid health description/);

    await expect(
      getPlatformOpsHealth(
        async () =>
          new Response(
            JSON.stringify({
              ...healthPayload,
              notInProbe: [{ name: "outbox", status: "Healthy", durationMs: 0, description: "ok" }],
            }),
            { status: 200 }
          )
      )
    ).rejects.toThrow(/Invalid health check status/);
  });

  it("parses overview actual and unavailable stack health", async () => {
    const actual = await getPlatformOpsOverview(
      async () => new Response(JSON.stringify(overviewPayload()), { status: 200 })
    );
    expect(actual.stackHealth.freshness).toBe("actual");
    expect(actual.stackHealth.value).toBe("Healthy");

    const unavailable = await getPlatformOpsOverview(
      async () =>
        new Response(
          JSON.stringify(
            overviewPayload({
              stackHealth: kpi(null, {
                source: "Authenticated health request failed",
                freshness: "unavailable",
              }),
            })
          ),
          { status: 200 }
        )
    );
    expect(unavailable.stackHealth.freshness).toBe("unavailable");
    expect(unavailable.stackHealth.value).toBeNull();
    expect(unavailable.tenantStatusCounts.freshness).toBe("actual");

    await expect(
      getPlatformOpsOverview(
        async () =>
          new Response(
            JSON.stringify(
              overviewPayload({
                stackHealth: kpi(null, {
                  source: "Not instrumented",
                  freshness: "missing_instrumentation",
                }),
              })
            ),
            { status: 200 }
          )
      )
    ).rejects.toThrow(/Invalid stack health KPI/);

    await expect(
      getPlatformOpsOverview(
        async () =>
          new Response(
            JSON.stringify(
              overviewPayload({
                stackHealth: kpi("Healthy", {
                  source: "100% operational",
                  freshness: "actual",
                }),
              })
            ),
            { status: 200 }
          )
      )
    ).rejects.toThrow(/Invalid stack health KPI/);
  });
});
