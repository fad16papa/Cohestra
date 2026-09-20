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
    expect(resolved.resolvedExperience.layout).toBe("centered");
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

  it("resolves conversational flow from draft experience overrides", () => {
    const resolved = resolveRegistrationPreviewTheme(activity, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: {
        layout: "centered",
        style: "modern",
        flow: "conversational",
        heroDisplay: "cover",
      },
    });

    expect(resolved.resolvedExperience.flow).toBe("conversational");
  });

  it("resolves poster layout from draft experience overrides", () => {
    const resolved = resolveRegistrationPreviewTheme(activity, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: {
        layout: "poster",
        style: "editorial",
        flow: "single-page",
        heroDisplay: "cover",
      },
    });

    expect(resolved.resolvedExperience.layout).toBe("poster");
  });

  it("resolves split layout from draft experience overrides", () => {
    const resolved = resolveRegistrationPreviewTheme(activity, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { layout: "split", style: "modern", flow: "single-page", heroDisplay: "split" },
    });

    expect(resolved.resolvedExperience.layout).toBe("split");
  });

  it("follows draft preset for experience layout, not stale persisted resolvedExperience", () => {
    const cardPersisted = {
      ...activity,
      resolvedRegistrationTheme: {
        ...activity.resolvedRegistrationTheme,
        preset: "card" as const,
        resolvedExperience: {
          layout: "card",
          style: "modern",
          flow: "single-page",
          heroDisplay: "cover",
        },
      },
    } as Activity;

    const resolved = resolveRegistrationPreviewTheme(cardPersisted, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
    });

    expect(resolved.preset).toBe("classic");
    expect(resolved.resolvedExperience.layout).toBe("centered");
  });

  it("resolves draft designTokens for unsaved Preview without persisted resolvedDesignTokens", () => {
    const resolved = resolveRegistrationPreviewTheme(activity, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { layout: "centered", style: "minimal", flow: "single-page", heroDisplay: "cover" },
      designTokens: {
        typographyScale: "compact",
        fieldSize: "default",
        fieldRadius: "sm",
        buttonWidth: "auto",
        surfaceEmphasis: "flat",
      },
    });

    expect(resolved.resolvedExperience.style).toBe("minimal");
    expect(resolved.resolvedDesignTokens.typographyScale).toBe("compact");
    expect(resolved.resolvedDesignTokens.buttonWidth).toBe("auto");
    expect(resolved.resolvedDesignTokens.surfaceEmphasis).toBe("flat");
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
