import { describe, expect, it } from "vitest";

import { pickRegistrationPublicShellKind } from "@/lib/registration-public-shell";

const baseTheme = {
  inheritCommunityBrand: true,
  accentColor: null,
  heroImageUrl: null,
};

describe("pickRegistrationPublicShellKind", () => {
  it("selects modern-centered for classic preset with centered resolved experience", () => {
    expect(
      pickRegistrationPublicShellKind("classic", {
        ...baseTheme,
        preset: "classic",
        resolvedExperience: {
          layout: "centered",
          style: "modern",
          flow: "single-page",
          heroDisplay: "cover",
        },
      }, false)
    ).toBe("modern-centered");
  });

  it("selects card when preset is card", () => {
    expect(
      pickRegistrationPublicShellKind("card", { ...baseTheme, preset: "card" }, false)
    ).toBe("card");
  });

  it("selects immersive when resolved layout is immersive", () => {
    expect(
      pickRegistrationPublicShellKind("classic", {
        ...baseTheme,
        preset: "classic",
        resolvedExperience: {
          layout: "immersive",
          style: "modern",
          flow: "single-page",
          heroDisplay: "full-bleed",
        },
      }, false)
    ).toBe("immersive");
  });

  it("selects compact for embed variant", () => {
    expect(
      pickRegistrationPublicShellKind("classic", {
        ...baseTheme,
        preset: "classic",
      }, true)
    ).toBe("compact");
  });

  it("selects compact for compact preset", () => {
    expect(
      pickRegistrationPublicShellKind("compact", {
        ...baseTheme,
        preset: "compact",
      }, false)
    ).toBe("compact");
  });
});
