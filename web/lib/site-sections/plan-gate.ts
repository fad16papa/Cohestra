import { isProPlan } from "@/lib/shell/tenant-shell-api";
import type { SiteBuiltInPresetId } from "@/lib/site-templates";

import {
  ESSENTIALS_SECTION_TYPES,
  STUDIO_SECTION_TYPES,
  type AddableSectionType,
} from "./registry";

export { ESSENTIALS_SECTION_TYPES, STUDIO_SECTION_TYPES };

export function getAddableSectionTypesForPlan(plan: string): AddableSectionType[] {
  if (isProPlan(plan)) {
    return [...ESSENTIALS_SECTION_TYPES, ...STUDIO_SECTION_TYPES];
  }

  return [...ESSENTIALS_SECTION_TYPES];
}

const STUDIO_PRESET_IDS = new Set<SiteBuiltInPresetId>([
  "showcase",
  "event-hub",
  "pilot-playbook",
]);

export function isStudioPreset(presetId: SiteBuiltInPresetId): boolean {
  return STUDIO_PRESET_IDS.has(presetId);
}

export function isPresetAvailableForPlan(
  presetId: SiteBuiltInPresetId,
  plan: string,
): boolean {
  if (isProPlan(plan)) {
    return true;
  }

  return (
    presetId === "community" ||
    presetId === "minimal" ||
    presetId === "essentials-pilot"
  );
}
