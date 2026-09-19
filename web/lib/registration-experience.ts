import type { RegistrationTheme, RegistrationThemePreset } from "@/lib/activities-api";

export type RegistrationExperienceLayout =
  | "centered"
  | "split"
  | "poster"
  | "immersive"
  | "card";

export type RegistrationExperienceStyle =
  | "modern"
  | "minimal"
  | "editorial"
  | "bold"
  | "soft";

export type RegistrationExperienceFlow =
  | "single-page"
  | "sections"
  | "step-by-step"
  | "conversational";

export type RegistrationExperienceHeroDisplay =
  | "cover"
  | "contain"
  | "full-bleed"
  | "split"
  | "background"
  | "hidden";

export type RegistrationExperienceConfig = {
  layout?: RegistrationExperienceLayout | null;
  style?: RegistrationExperienceStyle | null;
  flow?: RegistrationExperienceFlow | null;
  heroDisplay?: RegistrationExperienceHeroDisplay | null;
};

export type ResolvedRegistrationExperience = {
  layout: RegistrationExperienceLayout;
  style: RegistrationExperienceStyle;
  flow: RegistrationExperienceFlow;
  heroDisplay: RegistrationExperienceHeroDisplay;
};

export type RegistrationThemeWithExperience = RegistrationTheme & {
  experience?: RegistrationExperienceConfig | null;
  resolvedExperience?: ResolvedRegistrationExperience | null;
};

function defaultsFromPreset(preset: RegistrationThemePreset): ResolvedRegistrationExperience {
  switch (preset) {
    case "card":
      return {
        layout: "card",
        style: "modern",
        flow: "single-page",
        heroDisplay: "cover",
      };
    case "immersive":
      return {
        layout: "immersive",
        style: "modern",
        flow: "single-page",
        heroDisplay: "full-bleed",
      };
    case "compact":
      return {
        layout: "centered",
        style: "minimal",
        flow: "single-page",
        heroDisplay: "cover",
      };
    default:
      return {
        layout: "centered",
        style: "modern",
        flow: "single-page",
        heroDisplay: "cover",
      };
  }
}

const LAYOUTS = new Set<RegistrationExperienceLayout>([
  "centered",
  "split",
  "poster",
  "immersive",
  "card",
]);

/** Resolve composable experience from theme + legacy preset (mirrors API resolver). */
export function resolveRegistrationExperience(
  theme: RegistrationThemeWithExperience | null | undefined
): ResolvedRegistrationExperience {
  const preset = theme?.preset ?? "classic";
  const defaults = defaultsFromPreset(preset);
  const experience = theme?.experience ?? theme?.resolvedExperience ?? null;

  const pick = <T extends string>(
    value: T | null | undefined,
    allowed: Set<T>,
    fallback: T
  ): T => (value && allowed.has(value) ? value : fallback);

  return {
    layout: pick(
      experience?.layout as RegistrationExperienceLayout | null | undefined,
      LAYOUTS,
      defaults.layout
    ),
    style: pick(
      experience?.style as RegistrationExperienceStyle | null | undefined,
      new Set(["modern", "minimal", "editorial", "bold", "soft"]),
      defaults.style
    ),
    flow: pick(
      experience?.flow as RegistrationExperienceFlow | null | undefined,
      new Set(["single-page", "sections", "step-by-step", "conversational"]),
      defaults.flow
    ),
    heroDisplay: pick(
      experience?.heroDisplay as RegistrationExperienceHeroDisplay | null | undefined,
      new Set(["cover", "contain", "full-bleed", "split", "background", "hidden"]),
      defaults.heroDisplay
    ),
  };
}
