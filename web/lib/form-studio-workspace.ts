export const FORM_STUDIO_TWO_PANE_MIN_PX = 1024;
export const FORM_STUDIO_THREE_PANE_MIN_PX = 1280;

export const FORM_STUDIO_STACKED_QUERY = "(width < 1024px)";
export const FORM_STUDIO_TWO_PANE_QUERY = "(width >= 1024px) and (width < 1280px)";
export const FORM_STUDIO_THREE_PANE_QUERY = "(width >= 1280px)";

export const FORM_STUDIO_INSPECTOR_ID = "form-studio-inspector";
export const FORM_STUDIO_INSPECTOR_TOGGLE_ID = "form-studio-inspector-toggle";

export type FormStudioComposition = "stacked" | "two-pane" | "three-pane";

export function getLiveFormStudioComposition(): FormStudioComposition | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.matchMedia(FORM_STUDIO_STACKED_QUERY).matches) {
    return "stacked";
  }

  if (window.matchMedia(FORM_STUDIO_TWO_PANE_QUERY).matches) {
    return "two-pane";
  }

  if (window.matchMedia(FORM_STUDIO_THREE_PANE_QUERY).matches) {
    return "three-pane";
  }

  return null;
}

export function getFormStudioComposition(width: number): FormStudioComposition {
  if (width >= FORM_STUDIO_THREE_PANE_MIN_PX) {
    return "three-pane";
  }

  if (width >= FORM_STUDIO_TWO_PANE_MIN_PX) {
    return "two-pane";
  }

  return "stacked";
}

export function shouldUseInspectorSheet(
  composition: FormStudioComposition
): boolean {
  return composition === "stacked";
}

export function shouldShowDockedInspector(
  composition: FormStudioComposition,
  inspectorOpen: boolean
): boolean {
  if (composition === "three-pane") {
    return true;
  }

  if (composition === "two-pane") {
    return inspectorOpen;
  }

  return false;
}

export function shouldShowInspectorToggle(
  composition: FormStudioComposition
): boolean {
  return composition !== "three-pane";
}

export function isInspectorToggleExpanded(
  composition: FormStudioComposition,
  inspectorOpen: boolean,
  sheetOpen: boolean
): boolean {
  if (composition === "three-pane") {
    return true;
  }

  if (composition === "two-pane") {
    return inspectorOpen;
  }

  return sheetOpen;
}

export function resolveInspectorAfterResize({
  previous,
  next,
  inspectorOpen,
  sheetOpen,
}: {
  previous: FormStudioComposition | null;
  next: FormStudioComposition;
  inspectorOpen: boolean;
  sheetOpen: boolean;
}): { inspectorOpen: boolean; sheetOpen: boolean } {
  if (previous === next || previous == null) {
    return { inspectorOpen, sheetOpen };
  }

  if (next === "stacked") {
    return {
      inspectorOpen: false,
      sheetOpen: previous === "three-pane" || inspectorOpen || sheetOpen,
    };
  }

  return {
    inspectorOpen: previous === "three-pane" || inspectorOpen || sheetOpen,
    sheetOpen: false,
  };
}
