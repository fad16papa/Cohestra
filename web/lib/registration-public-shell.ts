import type { RegistrationThemePreset } from "@/lib/activities-api";
import {
  resolveRegistrationExperience,
  type RegistrationThemeWithExperience,
} from "@/lib/registration-experience";

export type RegistrationPublicShellKind =
  | "card"
  | "immersive"
  | "split-event"
  | "event-poster"
  | "compact"
  | "modern-centered";

/** Chooses layout shell for PublicRegistrationOpen (single canonical renderer). */
export function pickRegistrationPublicShellKind(
  preset: RegistrationThemePreset,
  themeForExperience: RegistrationThemeWithExperience,
  isEmbed: boolean
): RegistrationPublicShellKind {
  const experience = resolveRegistrationExperience(themeForExperience);

  if (preset === "card" || experience.layout === "card") {
    return "card";
  }

  if (preset === "immersive" || experience.layout === "immersive") {
    return "immersive";
  }

  if (preset === "compact" || isEmbed) {
    return "compact";
  }

  if (experience.layout === "split") {
    return "split-event";
  }

  if (experience.layout === "poster") {
    return "event-poster";
  }

  return "modern-centered";
}
