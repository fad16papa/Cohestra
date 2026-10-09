import { describe, expect, it } from "vitest";

import { getPlatformOpsOverview } from "@/lib/platform-api";
import {
  freshnessLabel,
  isFakeHealthCopy,
  observedLabel,
  sumCounts,
} from "@/lib/platform-overview";

function kpi(
  value: unknown,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
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

async function parseOverview(body: unknown) {
  return getPlatformOpsOverview(async () => new Response(JSON.stringify(body), { status: 200 }));
}

describe("platform overview provenance", () => {
  it("labels canonical freshness vocabulary", () => {
    expect(freshnessLabel("actual")).toBe("Actual");
    expect(freshnessLabel("missing_instrumentation")).toBe("Missing instrumentation");
    expect(freshnessLabel("unavailable")).toBe("Unavailable");
    expect(freshnessLabel("stale")).toBe("Stale");
  });

  it("treats recent observedAt as just now", () => {
    expect(observedLabel(new Date().toISOString())).toBe("Observed just now");
  });

  it("sums named counts including zero", () => {
    expect(sumCounts([])).toBe(0);
    expect(sumCounts([{ key: "Active", count: 2 }, { key: "Suspended", count: 0 }])).toBe(2);
  });

  it("rejects fake health copy in source text", () => {
    expect(isFakeHealthCopy("Instrumentation not available yet.")).toBe(false);
    expect(isFakeHealthCopy("Healthy")).toBe(true);
    expect(isFakeHealthCopy("100% operational")).toBe(true);
  });

  it("parses empty named counts as actual zero with actual health", async () => {
    const overview = await parseOverview(
      overviewPayload({ tenantStatusCounts: kpi([]), billingStatusCounts: kpi([]) })
    );
    expect(overview.tenantStatusCounts.value).toEqual([]);
    expect(overview.openSupportCount.value).toBe(0);
    expect(overview.stackHealth.freshness).toBe("actual");
    expect(overview.stackHealth.value).toBe("Healthy");
  });

  it("rejects malformed named counts instead of faking zero", async () => {
    await expect(
      parseOverview(overviewPayload({ tenantStatusCounts: kpi(null) }))
    ).rejects.toThrow(/Invalid named counts/);
    await expect(
      parseOverview(
        overviewPayload({ tenantStatusCounts: kpi([{ key: "Active" }]) })
      )
    ).rejects.toThrow(/Invalid named count/);
  });

  it("rejects missing-instrumentation and fake-green stack health", async () => {
    await expect(
      parseOverview(
        overviewPayload({
          stackHealth: kpi(null, {
            source: "Not instrumented",
            freshness: "missing_instrumentation",
          }),
        })
      )
    ).rejects.toThrow(/Invalid stack health KPI/);
    await expect(
      parseOverview(
        overviewPayload({
          stackHealth: kpi("Healthy", { source: "All systems OK", freshness: "actual" }),
        })
      )
    ).rejects.toThrow(/Invalid stack health KPI/);
  });
});
