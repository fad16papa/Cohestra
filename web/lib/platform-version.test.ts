import { describe, expect, it } from "vitest";

import { getPlatformOpsVersion, parsePlatformOpsVersion } from "@/lib/platform-api";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const OBSERVED = "2026-10-10T04:00:00Z";

function kpi(value: unknown, overrides: Record<string, unknown> = {}) {
  return {
    value,
    source: "GIT_SHA",
    observedAt: OBSERVED,
    freshness: "actual",
    ...overrides,
  };
}

function versionPayload(overrides: Record<string, unknown> = {}) {
  return {
    gitSha: kpi(SHA),
    environmentName: kpi("Production", { source: "IHostEnvironment.EnvironmentName" }),
    apiVersion: kpi("v1", { source: "API contract v1" }),
    ...overrides,
  };
}

describe("platform ops version contract", () => {
  it("parses an instrumented full SHA as actual and keeps the full value", async () => {
    const version = await getPlatformOpsVersion(
      async () => new Response(JSON.stringify(versionPayload()), { status: 200 })
    );
    expect(version.gitSha.value).toBe(SHA);
    expect(version.gitSha.freshness).toBe("actual");
    expect(version.gitSha.source).toBe("GIT_SHA");
    expect(version.environmentName.value).toBe("Production");
    expect(version.environmentName.source).toBe("IHostEnvironment.EnvironmentName");
    expect(version.apiVersion.value).toBe("v1");
    expect(version.apiVersion.source).toBe("API contract v1");
  });

  it("parses missing instrumentation without inventing a SHA", async () => {
    const version = parsePlatformOpsVersion(
      versionPayload({
        gitSha: kpi(null, { source: "Not instrumented", freshness: "missing_instrumentation" }),
      })
    );
    expect(version.gitSha.value).toBeNull();
    expect(version.gitSha.freshness).toBe("missing_instrumentation");
    expect(version.gitSha.source).toBe("Not instrumented");
  });

  it("treats blank SHA with missing_instrumentation as empty", () => {
    const version = parsePlatformOpsVersion(
      versionPayload({
        gitSha: kpi("", { source: "Not instrumented", freshness: "missing_instrumentation" }),
      })
    );
    expect(version.gitSha.value).toBeNull();
    expect(version.gitSha.freshness).toBe("missing_instrumentation");
  });

  it("parses malformed instrumentation as unavailable without echoing a fake SHA", () => {
    const version = parsePlatformOpsVersion(
      versionPayload({
        gitSha: kpi(null, { source: "GIT_SHA malformed", freshness: "unavailable" }),
      })
    );
    expect(version.gitSha.value).toBeNull();
    expect(version.gitSha.freshness).toBe("unavailable");
    expect(version.gitSha.source).toBe("GIT_SHA malformed");
  });

  it("rejects fabricated freshness, short SHAs, and v1 as a build id", () => {
    expect(() =>
      parsePlatformOpsVersion(
        versionPayload({
          gitSha: kpi(SHA, { freshness: "unknown" }),
        })
      )
    ).toThrow(/freshness/i);

    expect(() =>
      parsePlatformOpsVersion(
        versionPayload({
          gitSha: kpi("abcdef1", { freshness: "actual" }),
        })
      )
    ).toThrow(/Invalid instrumented Git SHA/);

    expect(() =>
      parsePlatformOpsVersion(
        versionPayload({
          gitSha: kpi("v1", { freshness: "actual" }),
        })
      )
    ).toThrow(/Invalid instrumented Git SHA/);

    expect(() =>
      parsePlatformOpsVersion(
        versionPayload({
          gitSha: kpi("latest", { freshness: "missing_instrumentation" }),
        })
      )
    ).toThrow(/Non-instrumented Git SHA must be empty/);

    expect(() =>
      parsePlatformOpsVersion(
        versionPayload({
          apiVersion: kpi("2.0.0", { source: "API contract v1" }),
        })
      )
    ).toThrow(/Invalid apiVersion KPI/);
  });

  it("rejects secret-bearing extra fields only by ignoring them and keeping the locked DTO", () => {
    const version = parsePlatformOpsVersion({
      ...versionPayload(),
      jwtSigningKey: "do-not-leak",
      connectionStrings: { default: "Password=super-secret" },
    });
    expect(version.gitSha.value).toBe(SHA);
    expect(version).not.toHaveProperty("jwtSigningKey");
    expect(version).not.toHaveProperty("connectionStrings");
  });
});
