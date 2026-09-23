import { describe, expect, it } from "vitest";

import {
  CANONICAL_DEMO_SLUGS,
  LIVE_OWNER_KEYS,
  extractCanonicalTheme,
  isCanonicalDemoSlug,
  isOwnedFixtureName,
  ownedActivityName,
  preferOwnedActivityMatch,
  slugifyOwnedName,
  tenantApiHost,
  tenantWebOrigin,
} from "./owned-fixture-data";

describe("owned fixture data", () => {
  it("builds a bounded diagnosable activity name per worker", () => {
    expect(ownedActivityName("38-3-success", 0)).toBe("e2e-38-3-success-w0");
    expect(ownedActivityName("Cols Pub!", 2)).toBe("e2e-cols-pub-w2");
    expect(isOwnedFixtureName("e2e-38-3-success-w0")).toBe(true);
    expect(isOwnedFixtureName("demo-marina-social-meetup")).toBe(false);
    expect(slugifyOwnedName("e2e-38-3-success-w0")).toBe("e2e-38-3-success-w0");
    expect(() => ownedActivityName("38-3-success", -1)).toThrow(/0 to 99/);
    expect(() => ownedActivityName("!!!", 0)).toThrow(/alphanumeric/);
  });

  it("keeps live owner keys unique and bounded after sanitization", () => {
    const names = LIVE_OWNER_KEYS.map((key) => ownedActivityName(key, 0));
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(LIVE_OWNER_KEYS.length);
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(36);
      expect(isCanonicalDemoSlug(name)).toBe(false);
      expect(isOwnedFixtureName(name)).toBe(true);
      expect(slugifyOwnedName(name)).toBe(name);
    }
    const withWorkers = [0, 1, 2, 99].flatMap((worker) =>
      LIVE_OWNER_KEYS.map((key) => ownedActivityName(key, worker))
    );
    expect(new Set(withWorkers).size).toBe(withWorkers.length);
  });

  it("prefers the canonical slug when a concurrent create left a suffix duplicate", () => {
    const preferred = preferOwnedActivityMatch(
      [
        { slug: "e2e-38-3-success-w0-2", name: "e2e-38-3-success-w0" },
        { slug: "e2e-38-3-success-w0", name: "e2e-38-3-success-w0" },
      ],
      "e2e-38-3-success-w0"
    );
    expect(preferred?.slug).toBe("e2e-38-3-success-w0");
    expect(
      preferOwnedActivityMatch(
        [{ slug: "e2e-38-3-success-w0-2", name: "e2e-38-3-success-w0" }],
        "e2e-38-3-success-w0"
      )?.slug
    ).toBe("e2e-38-3-success-w0-2");
    expect(preferOwnedActivityMatch([], "e2e-38-3-success-w0")).toBeUndefined();
  });

  it("extracts field-level theme, flow, and tokens from either casing", () => {
    expect(
      extractCanonicalTheme({
        registrationTheme: {
          preset: "classic",
          inheritCommunityBrand: true,
          accentColor: null,
          heroImageUrl: null,
          experience: { layout: "centered", style: "modern", flow: "single-page", heroDisplay: "cover" },
          designTokens: { typographyScale: "compact" },
        },
      })
    ).toEqual({
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      layout: "centered",
      style: "modern",
      flow: "single-page",
      heroDisplay: "cover",
      designTokens: { typographyScale: "compact" },
    });
  });

  it("never treats canonical demo slugs as owned fixtures", () => {
    for (const slug of CANONICAL_DEMO_SLUGS) {
      expect(isCanonicalDemoSlug(slug)).toBe(true);
      expect(isOwnedFixtureName(slug)).toBe(false);
    }
  });

  it("builds tenant API and web hosts without wildcards", () => {
    expect(tenantApiHost("px2-basic", "http://localhost:8080")).toBe("px2-basic.localhost:8080");
    expect(tenantApiHost("default", "http://127.0.0.1:8080")).toBe("default.localhost:8080");
    const previous = process.env.PUBLIC_BASE_URL;
    process.env.PUBLIC_BASE_URL = "http://localhost:3000";
    try {
      expect(tenantWebOrigin("px2-basic")).toBe("http://px2-basic.localhost:3000");
      expect(tenantWebOrigin("default")).toBe("http://default.localhost:3000");
    } finally {
      if (previous === undefined) {
        delete process.env.PUBLIC_BASE_URL;
      } else {
        process.env.PUBLIC_BASE_URL = previous;
      }
    }
  });
});
