import { describe, expect, it } from "vitest";

import {
  requestOriginFromHeaders,
  resolvePlatformOpsRedirectUrl,
} from "@/lib/platform-ops-host";

describe("resolvePlatformOpsRedirectUrl", () => {
  it("returns null for operator login on a tenant host", () => {
    expect(
      resolvePlatformOpsRedirectUrl("http://default.localhost:8088", "/login")
    ).toBeNull();
  });

  it("returns null for platform paths on marketing apex", () => {
    expect(
      resolvePlatformOpsRedirectUrl("http://localhost:8088", "/platform/login")
    ).toBeNull();
    expect(
      resolvePlatformOpsRedirectUrl("https://cohestra.app", "/platform")
    ).toBeNull();
    expect(
      resolvePlatformOpsRedirectUrl("https://www.cohestra.app", "/platform/support")
    ).toBeNull();
  });

  it("redirects tenant-host platform login to apex and preserves the query", () => {
    expect(
      resolvePlatformOpsRedirectUrl(
        "http://default.localhost:8088",
        "/platform/login",
        "?reason=session-expired"
      )
    ).toBe("http://localhost:8088/platform/login?reason=session-expired");
  });

  it("redirects tenant-host platform console paths to apex", () => {
    expect(
      resolvePlatformOpsRedirectUrl(
        "http://creativorare.localhost:8088",
        "/platform/support/abc"
      )
    ).toBe("http://localhost:8088/platform/support/abc");
  });

  it("redirects production slug hosts to cohestra.app", () => {
    expect(
      resolvePlatformOpsRedirectUrl(
        "https://creativorare.cohestra.app",
        "/platform/login"
      )
    ).toBe("https://cohestra.app/platform/login");
  });

  it("redirects nip.io tenant hosts using parseTenantSlugFromHostname", () => {
    expect(
      resolvePlatformOpsRedirectUrl(
        "https://default.129-212-235-2.nip.io",
        "/platform/login"
      )
    ).toBe("https://129-212-235-2.nip.io/platform/login");
  });
});

describe("requestOriginFromHeaders", () => {
  it("prefers forwarded host and proto", () => {
    expect(
      requestOriginFromHeaders(
        "default.localhost:8088",
        "http",
        "http://localhost:3000"
      )
    ).toBe("http://default.localhost:8088");
  });

  it("falls back when host is missing", () => {
    expect(requestOriginFromHeaders(null, "https", "http://localhost:3000")).toBe(
      "http://localhost:3000"
    );
  });
});
