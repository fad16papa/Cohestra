import { describe, expect, it, vi, afterEach } from "vitest";

import { buildTenantDashboardUrl } from "@/lib/signup/signup-api";

describe("buildTenantDashboardUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds {slug}.uat.cohestra.app from the UAT marketing apex", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "uat.cohestra.app",
        protocol: "https:",
        port: "",
        origin: "https://uat.cohestra.app",
      },
    });

    expect(buildTenantDashboardUrl("creativorare")).toBe(
      "https://creativorare.uat.cohestra.app/dashboard"
    );
  });

  it("keeps same-origin dashboard on an existing UAT tenant host", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "creativorare.uat.cohestra.app",
        protocol: "https:",
        port: "",
        origin: "https://creativorare.uat.cohestra.app",
      },
    });

    expect(buildTenantDashboardUrl("creativorare")).toBe(
      "https://creativorare.uat.cohestra.app/dashboard"
    );
  });

  it("defaults to production tenant hosts when window is unavailable", () => {
    expect(buildTenantDashboardUrl("creativorare")).toBe(
      "https://creativorare.cohestra.app/dashboard"
    );
  });
});
