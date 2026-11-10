import { describe, expect, it } from "vitest";

import {
  configuredSlugIsMarketingApex,
  resolveUatWorkspaceOrigin,
} from "@/lib/uat-workspace-origin";

describe("resolveUatWorkspaceOrigin", () => {
  it("prefixes a tenant slug onto the UAT apex", () => {
    expect(
      resolveUatWorkspaceOrigin("https://uat.cohestra.app", "creativorare"),
    ).toBe("https://creativorare.uat.cohestra.app");
    expect(
      resolveUatWorkspaceOrigin("https://uat.cohestra.app", "default"),
    ).toBe("https://default.uat.cohestra.app");
  });

  it("does not double-prefix a host that is already that tenant", () => {
    expect(
      resolveUatWorkspaceOrigin(
        "https://creativorare.uat.cohestra.app",
        "creativorare",
      ),
    ).toBe("https://creativorare.uat.cohestra.app");
  });

  it("keeps the marketing apex when the slug is the apex label", () => {
    expect(resolveUatWorkspaceOrigin("https://uat.cohestra.app", "uat")).toBe(
      "https://uat.cohestra.app",
    );
    expect(
      resolveUatWorkspaceOrigin("https://uat.cohestra.app/", " UAT "),
    ).toBe("https://uat.cohestra.app");
  });

  it("rejects an empty slug", () => {
    expect(() => resolveUatWorkspaceOrigin("https://uat.cohestra.app", "  ")).toThrow(
      /slug/i,
    );
  });
});

describe("configuredSlugIsMarketingApex", () => {
  it("recognizes the UAT apex label on the marketing hosts", () => {
    expect(configuredSlugIsMarketingApex("https://uat.cohestra.app", "uat")).toBe(true);
    expect(configuredSlugIsMarketingApex("https://uat.cohestra.app", " UAT ")).toBe(true);
    expect(configuredSlugIsMarketingApex("https://www.uat.cohestra.app", "uat")).toBe(true);
  });

  it("accepts a real tenant slug against the apex", () => {
    expect(configuredSlugIsMarketingApex("https://uat.cohestra.app", "creativorare")).toBe(
      false,
    );
    expect(configuredSlugIsMarketingApex("https://uat.cohestra.app", "default")).toBe(false);
  });

  it("does not treat an already-prefixed tenant host as the apex", () => {
    expect(
      configuredSlugIsMarketingApex("https://creativorare.uat.cohestra.app", "creativorare"),
    ).toBe(false);
  });
});
