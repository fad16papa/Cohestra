import type {
  Activity,
  RegistrationTheme,
  RegistrationThemePreset,
} from "@/lib/activities-api";

export type ResolvedRegistrationPreviewTheme = {
  preset: RegistrationThemePreset;
  accentColor: string | null;
  heroImageUrl: string | null;
  logoAssetId: string | null;
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
  activity: Pick<Activity, "heroImageUrl" | "accentColor" | "resolvedRegistrationTheme">,
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

  return {
    preset: theme.preset,
    accentColor: accent,
    heroImageUrl: hero,
    logoAssetId: logo,
  };
}

/** Persisted design/theme for Form Studio preview (Design draft not shared). */
export function resolvePersistedRegistrationPreviewTheme(
  activity: Activity
): ResolvedRegistrationPreviewTheme {
  return resolveRegistrationPreviewTheme(activity, themeFromActivity(activity));
}
