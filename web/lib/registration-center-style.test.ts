import { describe, expect, it } from "vitest";

import {
  modernCenteredStyleTokens,
  normalizeModernCenteredStyle,
} from "@/lib/registration-center-style";

describe("registration-center-style", () => {
  it("normalizes studio styles to modern or minimal only", () => {
    expect(normalizeModernCenteredStyle("minimal")).toBe("minimal");
    expect(normalizeModernCenteredStyle("modern")).toBe("modern");
    expect(normalizeModernCenteredStyle("editorial")).toBe("modern");
  });

  it("applies distinct form surfaces for modern vs minimal", () => {
    const modern = modernCenteredStyleTokens("modern");
    const minimal = modernCenteredStyleTokens("minimal");

    expect(modern.formSurface).toMatch(/rounded-2xl/);
    expect(modern.formSurface).toMatch(/border/);
    expect(minimal.formSurface).not.toMatch(/rounded-2xl border/);
    expect(modern.heroImage).not.toEqual(minimal.heroImage);
  });
});
