import type { Activity, RegistrationThemePreset } from "@/lib/activities-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

export const registrationPresetLabels: Record<RegistrationThemePreset, string> = {
  classic: "Classic",
  card: "Card",
  immersive: "Immersive Hero",
  compact: "Compact",
};

export const registrationPresetOptions: RegistrationThemePreset[] = [
  "classic",
  "card",
  "immersive",
  "compact",
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().toLowerCase();
  const match = /^#([0-9a-f]{6})$/.exec(normalized);
  if (!match) {
    return null;
  }

  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number | null {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) {
    return null;
  }

  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for button text (#ffffff on accent background). */
export function accentMeetsWcagAaOnWhiteText(accentColor: string | null | undefined): boolean {
  if (!accentColor?.trim()) {
    return true;
  }

  const ratio = contrastRatio(accentColor.trim(), "#ffffff");
  return ratio === null ? true : ratio >= 4.5;
}

export function campaignAssetPath(assetId: string): string {
  return `/api/v1/public/campaign-assets/${assetId}`;
}

/** Resolved hero for registration surfaces (design override → community → activity). */
export function resolveRegistrationHeroImageUrl(
  activity: Pick<Activity, "heroImageUrl"> & {
    resolvedRegistrationTheme?: Pick<
      Activity["resolvedRegistrationTheme"],
      "heroImageUrl"
    > | null;
  }
): string | null {
  const resolvedHero =
    activity.resolvedRegistrationTheme?.heroImageUrl ?? activity.heroImageUrl;
  return resolveHeroImageUrl(resolvedHero);
}
