import { describe, expect, it } from "vitest";

import type { Activity } from "@/lib/activities-api";
import {
  resolvePersistedRegistrationPreviewTheme,
  resolveRegistrationPreviewTheme,
  themeFromActivity,
} from "@/lib/registration-preview-theme";

const activity = {
  heroImageUrl: "https://example.com/activity-hero.jpg",
  accentColor: "#111111",
  resolvedRegistrationTheme: {
    preset: "classic" as const,
    inheritCommunityBrand: true,
    accentColor: "#222222",
    heroImageUrl: "https://example.com/community-hero.jpg",
    logoAssetId: "logo-123",
  },
  registrationTheme: null,
} as Activity;

describe("registration preview theme", () => {
  it("inherits community hero and accent when inherit is on", () => {
    const theme = themeFromActivity(activity);
    const resolved = resolveRegistrationPreviewTheme(activity, theme);

    expect(resolved.heroImageUrl).toBe("https://example.com/community-hero.jpg");
    expect(resolved.accentColor).toBe("#222222");
    expect(resolved.logoAssetId).toBe("logo-123");
    expect(resolved.preset).toBe("classic");
  });

  it("uses activity overrides when inherit is off", () => {
    const resolved = resolveRegistrationPreviewTheme(activity, {
      preset: "card",
      inheritCommunityBrand: false,
      accentColor: "#abcdef",
      heroImageUrl: "https://example.com/override-hero.jpg",
    });

    expect(resolved.heroImageUrl).toBe("https://example.com/override-hero.jpg");
    expect(resolved.accentColor).toBe("#abcdef");
    expect(resolved.logoAssetId).toBeNull();
    expect(resolved.preset).toBe("card");
  });

  it("returns null hero when no hero is configured anywhere", () => {
    const bareActivity = {
      ...activity,
      heroImageUrl: null,
      resolvedRegistrationTheme: {
        ...activity.resolvedRegistrationTheme,
        heroImageUrl: null,
      },
    } as Activity;

    const resolved = resolvePersistedRegistrationPreviewTheme(bareActivity);
    expect(resolved.heroImageUrl).toBeNull();
  });

  it("uses persisted activity theme for form preview", () => {
    const withOverride = {
      ...activity,
      registrationTheme: {
        preset: "immersive" as const,
        inheritCommunityBrand: true,
        accentColor: null,
        heroImageUrl: null,
      },
    } as Activity;

    const resolved = resolvePersistedRegistrationPreviewTheme(withOverride);
    expect(resolved.preset).toBe("immersive");
    expect(resolved.heroImageUrl).toBe("https://example.com/community-hero.jpg");
  });
});
