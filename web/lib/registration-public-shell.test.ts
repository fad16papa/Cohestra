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

  it("selects split-event when resolved layout is split", () => {
    expect(
      pickRegistrationPublicShellKind("classic", {
        ...baseTheme,
        preset: "classic",
        resolvedExperience: {
          layout: "split",
          style: "modern",
          flow: "single-page",
          heroDisplay: "split",
        },
      }, false)
    ).toBe("split-event");
  });

  it("selects event-poster when resolved layout is poster", () => {
    expect(
      pickRegistrationPublicShellKind("classic", {
        ...baseTheme,
        preset: "classic",
        resolvedExperience: {
          layout: "poster",
          style: "editorial",
          flow: "single-page",
          heroDisplay: "cover",
        },
      }, false)
    ).toBe("event-poster");
  });

  it("embed stays compact even when layout is poster", () => {
    expect(
      pickRegistrationPublicShellKind("classic", {
        ...baseTheme,
        preset: "classic",
        resolvedExperience: {
          layout: "poster",
          style: "modern",
          flow: "single-page",
          heroDisplay: "cover",
        },
      }, true)
    ).toBe("compact");
  });

  it("embed stays compact even when layout is split", () => {
    expect(
      pickRegistrationPublicShellKind("classic", {
        ...baseTheme,
        preset: "classic",
        resolvedExperience: {
          layout: "split",
          style: "modern",
          flow: "single-page",
          heroDisplay: "split",
        },
      }, true)
    ).toBe("compact");
  });
});
