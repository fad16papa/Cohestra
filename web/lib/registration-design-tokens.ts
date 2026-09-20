import type {
  RegistrationDesignTokens,
  RegistrationTheme,
  ResolvedRegistrationDesignTokens,
} from "@/lib/activities-api";
import {
  resolveRegistrationExperience,
  type RegistrationThemeWithExperience,
} from "@/lib/registration-experience";
import { cn } from "@/lib/utils";

export type TypographyScale = "compact" | "default" | "spacious";
export type FieldSize = "default" | "comfortable";
export type FieldRadius = "sm" | "md" | "lg";
export type ButtonWidth = "auto" | "full";
export type SurfaceEmphasis = "flat" | "soft" | "elevated";

const TYPOGRAPHY_SCALES = new Set<TypographyScale>(["compact", "default", "spacious"]);
const FIELD_SIZES = new Set<FieldSize>(["default", "comfortable"]);
const FIELD_RADII = new Set<FieldRadius>(["sm", "md", "lg"]);
const BUTTON_WIDTHS = new Set<ButtonWidth>(["auto", "full"]);
const SURFACE_EMPHASIS = new Set<SurfaceEmphasis>(["flat", "soft", "elevated"]);

function pick<T extends string>(
  value: string | null | undefined,
  allowed: Set<T>,
  fallback: T
): T {
  return value && allowed.has(value as T) ? (value as T) : fallback;
}

/** Resolve design tokens from stored theme + experience style (mirrors API). */
export function resolveRegistrationDesignTokens(
  theme: RegistrationTheme | null | undefined
): ResolvedRegistrationDesignTokens {
  const experience = resolveRegistrationExperience(
    (theme ?? {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
    }) as RegistrationThemeWithExperience
  );
  const stored = theme?.designTokens;
  const surfaceDefault: SurfaceEmphasis =
    experience.style === "minimal" ? "flat" : "soft";

  return {
    typographyScale: pick(stored?.typographyScale, TYPOGRAPHY_SCALES, "default"),
    fieldSize: pick(stored?.fieldSize, FIELD_SIZES, "default"),
    fieldRadius: pick(stored?.fieldRadius, FIELD_RADII, "md"),
    buttonWidth: pick(stored?.buttonWidth, BUTTON_WIDTHS, "full"),
    surfaceEmphasis: pick(stored?.surfaceEmphasis, SURFACE_EMPHASIS, surfaceDefault),
  };
}

export function designTokensPreviewKey(tokens: ResolvedRegistrationDesignTokens): string {
  return [
    tokens.typographyScale,
    tokens.fieldSize,
    tokens.fieldRadius,
    tokens.buttonWidth,
    tokens.surfaceEmphasis,
  ].join(":");
}

export function registrationFormTypographyClass(
  tokens: ResolvedRegistrationDesignTokens
): string {
  switch (tokens.typographyScale) {
    case "compact":
      return "text-sm [&_label]:text-xs [&_h2]:text-base [&_h3]:text-sm";
    case "spacious":
      return "text-base [&_label]:text-sm [&_h2]:text-xl [&_h3]:text-lg";
    default:
      return "text-sm sm:text-base [&_label]:text-sm";
  }
}

export function registrationFormFieldClass(
  tokens: ResolvedRegistrationDesignTokens
): string {
  const radius =
    tokens.fieldRadius === "sm"
      ? "rounded-md"
      : tokens.fieldRadius === "lg"
        ? "rounded-xl"
        : "rounded-lg";

  const height =
    tokens.fieldSize === "comfortable"
      ? "min-h-[3.25rem] text-base"
      : "min-h-11 text-sm sm:text-base";

  return cn(
    "border-border-warm/90 bg-background shadow-none",
    radius,
    height
  );
}

export function registrationFormSubmitButtonClass(
  tokens: ResolvedRegistrationDesignTokens
): string {
  return cn(
    "min-h-12 text-base font-semibold",
    tokens.buttonWidth === "full" ? "w-full" : "w-auto min-w-[12rem]",
    tokens.surfaceEmphasis === "elevated" && "shadow-sm",
    tokens.surfaceEmphasis === "flat" && "shadow-none"
  );
}

export function registrationFormBlockSpacingClass(
  tokens: ResolvedRegistrationDesignTokens
): string {
  switch (tokens.typographyScale) {
    case "compact":
      return "space-y-3.5";
    case "spacious":
      return "space-y-6";
    default:
      return "space-y-4 sm:space-y-5";
  }
}

export function mergeDesignTokenFieldClass(
  tokens: ResolvedRegistrationDesignTokens,
  modernCenteredExtra?: string | null
): string {
  return cn(registrationFormFieldClass(tokens), modernCenteredExtra);
}

export function hasStoredDesignTokens(tokens: RegistrationDesignTokens | null | undefined): boolean {
  if (!tokens) {
    return false;
  }

  return (
    tokens.typographyScale != null ||
    tokens.fieldSize != null ||
    tokens.fieldRadius != null ||
    tokens.buttonWidth != null ||
    tokens.surfaceEmphasis != null
  );
}

export const CORE_PLUS_DESIGN_TOKEN_OPTIONS = {
  typographyScale: ["spacious"] as TypographyScale[],
  fieldSize: ["comfortable"] as FieldSize[],
  fieldRadius: ["lg"] as FieldRadius[],
  surfaceEmphasis: ["elevated"] as SurfaceEmphasis[],
} as const;

export function isDesignTokenOptionLocked(
  plan: string,
  group: keyof typeof CORE_PLUS_DESIGN_TOKEN_OPTIONS,
  value: string
): boolean {
  if (plan !== "Basic") {
    return false;
  }

  return (CORE_PLUS_DESIGN_TOKEN_OPTIONS[group] as readonly string[]).includes(value);
}
