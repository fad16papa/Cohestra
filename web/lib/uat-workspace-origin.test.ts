import { describe, expect, it } from "vitest";

import { resolveUatWorkspaceOrigin } from "@/lib/uat-workspace-origin";

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
