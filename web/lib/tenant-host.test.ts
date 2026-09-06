import { describe, expect, it } from "vitest";

import {
  parseTenantSlugFromHostname,
  parseTenantSlugFromOrigin,
} from "@/lib/tenant-host";

describe("parseTenantSlugFromHostname", () => {
  it("reads {slug}.localhost", () => {
    expect(parseTenantSlugFromHostname("default.localhost")).toBe("default");
    expect(parseTenantSlugFromHostname("localhost")).toBeNull();
  });

  it("reads production tenant hosts and ignores apex", () => {
    expect(parseTenantSlugFromHostname("creativorare.cohestra.app")).toBe(
      "creativorare"
    );
    expect(parseTenantSlugFromHostname("cohestra.app")).toBeNull();
    expect(parseTenantSlugFromHostname("www.cohestra.app")).toBeNull();
  });

  it("treats uat.cohestra.app as marketing apex and reads {slug}.uat.cohestra.app", () => {
    expect(parseTenantSlugFromHostname("uat.cohestra.app")).toBeNull();
    expect(parseTenantSlugFromHostname("www.uat.cohestra.app")).toBeNull();
    expect(parseTenantSlugFromHostname("creativorare.uat.cohestra.app")).toBe(
      "creativorare"
    );
    expect(parseTenantSlugFromHostname("foo.bar.uat.cohestra.app")).toBeNull();
  });

  it("reads nip.io tenant hosts used in cloud UAT", () => {
    expect(parseTenantSlugFromHostname("acme.129-212-235-2.nip.io")).toBe("acme");
    expect(parseTenantSlugFromHostname("129-212-235-2.nip.io")).toBeNull();
  });
});

describe("parseTenantSlugFromOrigin", () => {
  it("parses origin URLs", () => {
    expect(parseTenantSlugFromOrigin("http://default.localhost:8088")).toBe(
      "default"
    );
  });
});
