import { afterEach, describe, expect, it } from "vitest";

import { buildTenantLoginHandoffUrl } from "@/lib/auth-handoff";
import {
  buildLocalDockerTenantDashboardUrl,
  buildTenantDashboardUrl,
  isHttpsDevTunnelHost,
  localDockerHttpPortFromApiUrl,
  type PublicHostLocation,
} from "@/lib/tenant-dashboard-url";

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

function host(
  hostname: string,
  opts?: { protocol?: string; port?: string }
): PublicHostLocation {
  const protocol = opts?.protocol ?? "https:";
  const port = opts?.port ?? "";
  const portSuffix = port ? `:${port}` : "";
  return {
    hostname,
    protocol,
    port,
    origin: `${protocol}//${hostname}${portSuffix}`,
  };
}

afterEach(() => {
  process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

describe("isHttpsDevTunnelHost", () => {
  it("recognizes ngrok, cloudflared, and loca.lt", () => {
    expect(
      isHttpsDevTunnelHost("coping-munchkin-unloving.ngrok-free.dev")
    ).toBe(true);
    expect(isHttpsDevTunnelHost("demo.ngrok-free.app")).toBe(true);
    expect(isHttpsDevTunnelHost("abc.ngrok.io")).toBe(true);
    expect(isHttpsDevTunnelHost("random-words.trycloudflare.com")).toBe(true);
    expect(isHttpsDevTunnelHost("abc.loca.lt")).toBe(true);
  });

  it("does not treat production or local docker as a tunnel", () => {
    expect(isHttpsDevTunnelHost("creativorare.cohestra.app")).toBe(false);
    expect(isHttpsDevTunnelHost("cohestra.app")).toBe(false);
    expect(isHttpsDevTunnelHost("localhost")).toBe(false);
    expect(isHttpsDevTunnelHost("creativorare.localhost")).toBe(false);
    expect(isHttpsDevTunnelHost("acme.129-212-235-2.nip.io")).toBe(false);
  });
});

describe("localDockerHttpPortFromApiUrl", () => {
  it("reads the port from a localhost PUBLIC_BASE_URL", () => {
    expect(localDockerHttpPortFromApiUrl("http://localhost:8088")).toBe("8088");
    expect(localDockerHttpPortFromApiUrl("http://127.0.0.1:8088/")).toBe("8088");
  });

  it("defaults to 8088 when the localhost URL has no port", () => {
    expect(localDockerHttpPortFromApiUrl("http://localhost")).toBe("8088");
    expect(localDockerHttpPortFromApiUrl(undefined)).toBe("8088");
  });
});

describe("buildTenantDashboardUrl", () => {
  it("rewrites ngrok login/signup onto {slug}.localhost, not {slug}.cohestra.app", () => {
    expect(
      buildTenantDashboardUrl(
        "creativorare",
        host("coping-munchkin-unloving.ngrok-free.dev"),
        "http://localhost:8088"
      )
    ).toBe("http://creativorare.localhost:8088/dashboard");
  });

  it("reads NEXT_PUBLIC_API_URL when the caller does not pass an API origin", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8088";
    expect(
      buildTenantDashboardUrl(
        "creativorare",
        host("coping-munchkin-unloving.ngrok-free.dev")
      )
    ).toBe("http://creativorare.localhost:8088/dashboard");
  });

  it("rewrites cloudflared and loca.lt the same way", () => {
    expect(
      buildTenantDashboardUrl(
        "creativorare",
        host("random-words.trycloudflare.com"),
        "http://localhost:8088"
      )
    ).toBe("http://creativorare.localhost:8088/dashboard");
    expect(
      buildTenantDashboardUrl(
        "creativorare",
        host("abc.loca.lt"),
        "http://localhost:8088"
      )
    ).toBe("http://creativorare.localhost:8088/dashboard");
  });

  it("does not use the tunnel's https origin as a tenant host", () => {
    const url = buildTenantDashboardUrl(
      "creativorare",
      host("coping-munchkin-unloving.ngrok-free.dev"),
      "http://localhost:8088"
    );
    expect(url).not.toContain("ngrok");
    expect(url).not.toContain("cohestra.app");
    expect(url.startsWith("http://")).toBe(true);
  });

  it("keeps local docker tenant hosts on the current protocol and port", () => {
    expect(
      buildTenantDashboardUrl(
        "creativorare",
        host("localhost", { protocol: "http:", port: "8088" })
      )
    ).toBe("http://creativorare.localhost:8088/dashboard");
    expect(
      buildTenantDashboardUrl(
        "creativorare",
        host("creativorare.localhost", { protocol: "http:", port: "8088" })
      )
    ).toBe("http://creativorare.localhost:8088/dashboard");
  });

  it("keeps production tenant hosts on cohestra.app", () => {
    expect(
      buildTenantDashboardUrl("creativorare", host("cohestra.app"))
    ).toBe("https://creativorare.cohestra.app/dashboard");
    expect(
      buildTenantDashboardUrl("ikigai", host("ikigai.cohestra.app"))
    ).toBe("https://ikigai.cohestra.app/dashboard");
  });

  it("keeps nip.io cloud UAT on nip.io, not localhost", () => {
    expect(
      buildTenantDashboardUrl(
        "acme",
        host("129-212-235-2.nip.io", { protocol: "https:" })
      )
    ).toBe("https://acme.129-212-235-2.nip.io/dashboard");
    expect(
      buildTenantDashboardUrl(
        "acme",
        host("acme.129-212-235-2.nip.io", { protocol: "https:" })
      )
    ).toBe("https://acme.129-212-235-2.nip.io/dashboard");
  });

  it("falls back to production when there is no browser host (SSR)", () => {
    expect(buildTenantDashboardUrl("creativorare", undefined)).toBe(
      "https://creativorare.cohestra.app/dashboard"
    );
  });
});

describe("buildLocalDockerTenantDashboardUrl", () => {
  it("always uses http on {slug}.localhost", () => {
    expect(buildLocalDockerTenantDashboardUrl("CreativoRare", "http://localhost:8088")).toBe(
      "http://creativorare.localhost:8088/dashboard"
    );
  });
});

describe("buildTenantLoginHandoffUrl", () => {
  it("puts the handoff code on the local-docker tenant dashboard after ngrok login", () => {
    expect(
      buildTenantLoginHandoffUrl(
        "creativorare",
        "c37552197f750052a6a79706a42f7948",
        host("coping-munchkin-unloving.ngrok-free.dev"),
        "http://localhost:8088"
      )
    ).toBe(
      "http://creativorare.localhost:8088/dashboard?handoff=c37552197f750052a6a79706a42f7948"
    );
  });
});
