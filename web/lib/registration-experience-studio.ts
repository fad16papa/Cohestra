import type {
  RegistrationExperienceConfig,
  RegistrationTheme,
  RegistrationThemePreset,
} from "@/lib/activities-api";
import {
  resolveRegistrationExperience,
  type RegistrationExperienceFlow,
  type RegistrationExperienceStyle,
  type RegistrationThemeWithExperience,
} from "@/lib/registration-experience";
import {
  designTokensPreviewKey,
  hasStoredDesignTokens,
  resolveRegistrationDesignTokens,
} from "@/lib/registration-design-tokens";

function asExperienceTheme(theme: RegistrationTheme): RegistrationThemeWithExperience {
  return theme as RegistrationThemeWithExperience;
}
import { isCoreOrAbove, isProPlan } from "@/lib/shell/tenant-shell-api";

export type ExperienceLayoutChoice = "centered" | "split" | "poster";

export type ExperienceLayoutOption = {
  id: ExperienceLayoutChoice;
  label: string;
  description: string;
  requiredPlan: "Basic" | "Core";
};

export type ExperienceFlowOption = {
  id: RegistrationExperienceFlow;
  label: string;
  description: string;
  requiredPlan: "Basic" | "Pro";
};

export type ExperienceStyleOption = {
  id: RegistrationExperienceStyle;
  label: string;
  description: string;
  requiredPlan: "Basic" | "Core";
};

export const EXPERIENCE_LAYOUT_OPTIONS: ExperienceLayoutOption[] = [
  {
    id: "centered",
    label: "Modern Centered",
    description: "Clean, focused registration with your Activity and branding.",
    requiredPlan: "Basic",
  },
  {
    id: "split",
    label: "Split Event",
    description: "Activity context and registration side-by-side on larger screens.",
    requiredPlan: "Core",
  },
  {
    id: "poster",
    label: "Event Poster",
    description: "RSVP-style Activity presentation, then registration.",
    requiredPlan: "Core",
  },
];

export const EXPERIENCE_FLOW_OPTIONS: ExperienceFlowOption[] = [
  {
    id: "single-page",
    label: "Single page",
    description: "All fields on one scrollable form.",
    requiredPlan: "Basic",
  },
  {
    id: "conversational",
    label: "Conversational",
    description: "One question at a time with Continue and Back.",
    requiredPlan: "Pro",
  },
];

export const EXPERIENCE_STYLE_OPTIONS: ExperienceStyleOption[] = [
  {
    id: "modern",
    label: "Modern",
    description: "Default Cohestra spacing and typography.",
    requiredPlan: "Basic",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Quieter chrome; form-first emphasis.",
    requiredPlan: "Basic",
  },
];

export function isLegacyLayoutPreset(preset: RegistrationThemePreset): boolean {
  return preset !== "classic";
}

export function canSelectExperienceLayout(plan: string, layout: ExperienceLayoutChoice): boolean {
  if (layout === "centered") {
    return true;
  }

  return isCoreOrAbove(plan);
}

export function canSelectExperienceFlow(plan: string, flow: RegistrationExperienceFlow): boolean {
  if (flow === "single-page") {
    return true;
  }

  return isProPlan(plan);
}

export function canSelectExperienceStyle(plan: string, style: RegistrationExperienceStyle): boolean {
  if (style === "modern" || style === "minimal") {
    return true;
  }

  return isCoreOrAbove(plan);
}

export function planLockLabel(requiredPlan: "Basic" | "Core" | "Pro"): string {
  if (requiredPlan === "Basic") {
    return "";
  }

  return requiredPlan;
}

export function mergeExperienceDraft(
  theme: RegistrationTheme,
  patch: RegistrationExperienceConfig
): RegistrationTheme {
  return {
    ...theme,
    experience: {
      ...(theme.experience ?? {}),
      ...patch,
    },
  };
}

export function applyPrimaryExperienceLayout(
  theme: RegistrationTheme,
  layout: ExperienceLayoutChoice
): RegistrationTheme {
  const heroDisplay =
    layout === "split" ? "split" : layout === "poster" ? "cover" : "cover";

  return mergeExperienceDraft(
    {
      ...theme,
      preset: "classic",
    },
    {
      layout,
      heroDisplay,
    }
  );
}

export function applyExperienceFlow(
  theme: RegistrationTheme,
  flow: RegistrationExperienceFlow
): RegistrationTheme {
  return mergeExperienceDraft(theme, { flow });
}

export function applyExperienceStyle(
  theme: RegistrationTheme,
  style: RegistrationExperienceStyle
): RegistrationTheme {
  return mergeExperienceDraft(theme, { style });
}

/** Resolved primary layout choice for experience selector UI. */
export function activeExperienceLayoutChoice(
  theme: RegistrationTheme
): ExperienceLayoutChoice {
  const resolved = resolveRegistrationExperience(asExperienceTheme(theme));
  if (resolved.layout === "split") {
    return "split";
  }

  if (resolved.layout === "poster") {
    return "poster";
  }

  return "centered";
}

export function activeExperienceFlow(theme: RegistrationTheme): RegistrationExperienceFlow {
  return resolveRegistrationExperience(asExperienceTheme(theme)).flow;
}

export function activeExperienceStyle(theme: RegistrationTheme): RegistrationExperienceStyle {
  const style = resolveRegistrationExperience(asExperienceTheme(theme)).style;
  if (style === "modern" || style === "minimal") {
    return style;
  }

  return "modern";
}

export function buildExperiencePreviewKey(theme: RegistrationTheme): string {
  const resolved = resolveRegistrationExperience(asExperienceTheme(theme));
  const tokens = resolveRegistrationDesignTokens(theme);
  return [
    theme.preset,
    resolved.layout,
    resolved.style,
    resolved.flow,
    resolved.heroDisplay,
    designTokensPreviewKey(tokens),
  ].join("|");
}

export function registrationThemeForSave(theme: RegistrationTheme): RegistrationTheme {
  const experience = theme.experience;
  const hasExperience =
    experience &&
    (experience.layout != null ||
      experience.style != null ||
      experience.flow != null ||
      experience.heroDisplay != null);

  const designTokens = theme.designTokens;
  const hasDesignTokens = hasStoredDesignTokens(designTokens);

  return {
    preset: theme.preset,
    inheritCommunityBrand: theme.inheritCommunityBrand,
    accentColor: theme.accentColor?.trim() || null,
    heroImageUrl: theme.heroImageUrl?.trim() || null,
    ...(hasExperience ? { experience } : {}),
    ...(hasDesignTokens ? { designTokens } : {}),
  };
}
