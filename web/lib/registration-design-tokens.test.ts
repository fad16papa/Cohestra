import { describe, expect, it } from "vitest";

import {
  isDesignTokenOptionLocked,
  resolveRegistrationDesignTokens,
} from "@/lib/registration-design-tokens";

describe("resolveRegistrationDesignTokens", () => {
  it("defaults minimal style to flat surface emphasis", () => {
    const tokens = resolveRegistrationDesignTokens({
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { style: "minimal", layout: "centered", flow: "single-page", heroDisplay: "cover" },
    });

    expect(tokens.surfaceEmphasis).toBe("flat");
  });

  it("applies stored token enums", () => {
    const tokens = resolveRegistrationDesignTokens({
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      designTokens: {
        typographyScale: "spacious",
        fieldSize: "comfortable",
        fieldRadius: "lg",
        buttonWidth: "auto",
        surfaceEmphasis: "elevated",
      },
    });

    expect(tokens.typographyScale).toBe("spacious");
    expect(tokens.fieldSize).toBe("comfortable");
    expect(tokens.fieldRadius).toBe("lg");
    expect(tokens.buttonWidth).toBe("auto");
    expect(tokens.surfaceEmphasis).toBe("elevated");
  });
});

describe("isDesignTokenOptionLocked", () => {
  it("locks Core+ typography on Basic", () => {
    expect(isDesignTokenOptionLocked("Basic", "typographyScale", "spacious")).toBe(true);
    expect(isDesignTokenOptionLocked("Core", "typographyScale", "spacious")).toBe(false);
  });
});
