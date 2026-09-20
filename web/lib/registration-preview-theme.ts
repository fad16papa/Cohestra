import type {
  Activity,
  RegistrationTheme,
  RegistrationThemePreset,
  ResolvedRegistrationDesignTokens,
  ResolvedRegistrationExperience,
} from "@/lib/activities-api";
import { resolveRegistrationDesignTokens } from "@/lib/registration-design-tokens";
import { resolveRegistrationExperience } from "@/lib/registration-experience";

export type ResolvedRegistrationPreviewTheme = {
  preset: RegistrationThemePreset;
  accentColor: string | null;
  heroImageUrl: string | null;
  logoAssetId: string | null;
  resolvedExperience: ResolvedRegistrationExperience;
  resolvedDesignTokens: ResolvedRegistrationDesignTokens;
};

export function themeFromActivity(activity: Activity): RegistrationTheme {
  return (
    activity.registrationTheme ?? {
      preset: activity.resolvedRegistrationTheme.preset,
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
    }
  );
}

export function resolveRegistrationPreviewTheme(
  activity: Pick<
    Activity,
    "heroImageUrl" | "accentColor" | "resolvedRegistrationTheme"
  >,
  theme: RegistrationTheme
): ResolvedRegistrationPreviewTheme {
  const inherit = theme.inheritCommunityBrand;
  const communityResolved = activity.resolvedRegistrationTheme;

  let accent = theme.accentColor?.trim() || null;
  let hero = theme.heroImageUrl?.trim() || null;
  let logo = communityResolved.logoAssetId;

  if (inherit) {
    accent =
      accent ??
      communityResolved.accentColor ??
      activity.accentColor;
    hero =
      hero ??
      communityResolved.heroImageUrl ??
      activity.heroImageUrl;
    logo = communityResolved.logoAssetId;
  } else {
    accent = accent ?? activity.accentColor;
    hero = hero ?? activity.heroImageUrl;
    logo = null;
  }

  // Preview follows draft/saved theme preset + optional experience overrides only.
  // Do not pass persisted resolvedExperience — it stays stale when the draft preset changes.
  const resolvedExperience = resolveRegistrationExperience({
    preset: theme.preset,
    inheritCommunityBrand: theme.inheritCommunityBrand,
    accentColor: theme.accentColor,
    heroImageUrl: theme.heroImageUrl,
    experience: theme.experience,
  } as Parameters<typeof resolveRegistrationExperience>[0]) as ResolvedRegistrationExperience;

  const resolvedDesignTokens = resolveRegistrationDesignTokens({
    preset: theme.preset,
    inheritCommunityBrand: theme.inheritCommunityBrand,
    accentColor: theme.accentColor,
    heroImageUrl: theme.heroImageUrl,
    experience: theme.experience,
    designTokens: theme.designTokens,
  });

  return {
    preset: theme.preset,
    accentColor: accent,
    heroImageUrl: hero,
    logoAssetId: logo,
    resolvedExperience,
    resolvedDesignTokens,
  };
}

/** Persisted design/theme for Form Studio preview (Design draft not shared). */
export function resolvePersistedRegistrationPreviewTheme(
  activity: Activity
): ResolvedRegistrationPreviewTheme {
  return resolveRegistrationPreviewTheme(activity, themeFromActivity(activity));
}
