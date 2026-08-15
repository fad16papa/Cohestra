import { describe, expect, it } from "vitest";

import { buildActivitySharePreview } from "@/lib/share-kit-utils";

describe("buildActivitySharePreview", () => {
  it("uses resolved registration theme hero before activity branding hero", () => {
    const preview = buildActivitySharePreview(
      {
        name: "FNM",
        schedule: "Sat, 22 Aug 2026",
        location: "Singapore",
        communityLabel: "Friday Night Magicthegathering",
        heroImageUrl: "/api/v1/public/campaign-assets/activity-hero",
        resolvedRegistrationTheme: {
          preset: "card",
          inheritCommunityBrand: true,
          accentColor: "#2d6a4f",
          heroImageUrl: "/api/v1/public/campaign-assets/design-override-hero",
          logoAssetId: null,
        },
      },
      "http://creativorare.localhost:8088/register/fnm"
    );

    expect(preview.imageUrl).toContain("design-override-hero");
    expect(preview.imageUrl).not.toContain("activity-hero");
  });

  it("falls back to activity hero when resolved theme has no override", () => {
    const preview = buildActivitySharePreview(
      {
        name: "FNM",
        schedule: "Sat, 22 Aug 2026",
        location: "Singapore",
        communityLabel: "Friday Night Magicthegathering",
        heroImageUrl: "/api/v1/public/campaign-assets/activity-hero",
        resolvedRegistrationTheme: {
          preset: "classic",
          inheritCommunityBrand: true,
          accentColor: null,
          heroImageUrl: "/api/v1/public/campaign-assets/activity-hero",
          logoAssetId: null,
        },
      },
      "http://creativorare.localhost:8088/register/fnm"
    );

    expect(preview.imageUrl).toContain("activity-hero");
  });
});
