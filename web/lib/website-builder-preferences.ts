const CHECKLIST_DISMISSED_KEY = "activity-lead:website-builder-checklist-dismissed";
const VISITED_KEY = "activity-lead:website-builder-visited";
const TOUR_COMPLETED_KEY = "activity-lead:website-builder-tour-completed";

export function scopedWebsiteBuilderPreferenceKey(
  base: string,
  tenantSlug: string | null | undefined
): string | null {
  const slug = tenantSlug?.trim().toLowerCase();
  if (!slug) {
    return null;
  }

  return `${base}:${encodeURIComponent(slug)}`;
}

function scopedKey(base: string, tenantSlug: string | null | undefined): string | null {
  return scopedWebsiteBuilderPreferenceKey(base, tenantSlug);
}

function readFlag(base: string, tenantSlug: string | null | undefined): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const key = scopedKey(base, tenantSlug);
  if (!key) {
    return false;
  }

  return window.localStorage.getItem(key) === "1";
}

function writeFlag(base: string, tenantSlug: string | null | undefined): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = scopedKey(base, tenantSlug);
  if (!key) {
    return;
  }

  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Private mode or quota must not block skip/dismiss.
  }
}

function clearFlag(base: string, tenantSlug: string | null | undefined): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = scopedKey(base, tenantSlug);
  if (!key) {
    return;
  }

  window.localStorage.removeItem(key);
}

export function isSetupChecklistDismissed(tenantSlug: string | null | undefined): boolean {
  return readFlag(CHECKLIST_DISMISSED_KEY, tenantSlug);
}

export function dismissSetupChecklist(tenantSlug: string | null | undefined): void {
  writeFlag(CHECKLIST_DISMISSED_KEY, tenantSlug);
}

export function restoreSetupChecklist(tenantSlug: string | null | undefined): void {
  clearFlag(CHECKLIST_DISMISSED_KEY, tenantSlug);
}

export function hasVisitedWebsiteBuilder(tenantSlug: string | null | undefined): boolean {
  return readFlag(VISITED_KEY, tenantSlug);
}

export function markWebsiteBuilderVisited(tenantSlug: string | null | undefined): void {
  writeFlag(VISITED_KEY, tenantSlug);
}

export function hasCompletedWebsiteBuilderTour(
  tenantSlug: string | null | undefined
): boolean {
  return readFlag(TOUR_COMPLETED_KEY, tenantSlug);
}

export function markWebsiteBuilderTourCompleted(
  tenantSlug: string | null | undefined
): void {
  writeFlag(TOUR_COMPLETED_KEY, tenantSlug);
  markWebsiteBuilderVisited(tenantSlug);
}

export function readInitialChecklistVisibility(
  tenantSlug: string | null | undefined
): { show: boolean } {
  if (!tenantSlug?.trim()) {
    return { show: false };
  }

  return {
    show: !isSetupChecklistDismissed(tenantSlug) && !hasVisitedWebsiteBuilder(tenantSlug),
  };
}

export function shouldShowWebsiteBuilderTour(
  tenantSlug: string | null | undefined
): boolean {
  if (!tenantSlug?.trim()) {
    return false;
  }

  return !hasCompletedWebsiteBuilderTour(tenantSlug) && !hasVisitedWebsiteBuilder(tenantSlug);
}
