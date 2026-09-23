import { describe, expect, it } from "vitest";

import {
  CANONICAL_DEMO_SLUGS,
  isCanonicalDemoSlug,
  isOwnedFixtureName,
  ownedActivityName,
  tenantApiHost,
  tenantWebOrigin,
} from "./owned-fixture-data";

describe("owned fixture data", () => {
  it("builds a bounded diagnosable activity name per worker", () => {
    expect(ownedActivityName("38-3-success", 0)).toBe("e2e-38-3-success-w0");
    expect(ownedActivityName("Cols Pub!", 2)).toBe("e2e-cols-pub-w2");
    expect(isOwnedFixtureName("e2e-38-3-success-w0")).toBe(true);
    expect(isOwnedFixtureName("demo-marina-social-meetup")).toBe(false);
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
