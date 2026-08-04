const CHECKLIST_DISMISSED_KEY = "activity-lead:website-builder-checklist-dismissed";
const VISITED_KEY = "activity-lead:website-builder-visited";
const TOUR_COMPLETED_KEY = "activity-lead:website-builder-tour-completed";

export function isSetupChecklistDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "1";
}

export function dismissSetupChecklist(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHECKLIST_DISMISSED_KEY, "1");
}

export function restoreSetupChecklist(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CHECKLIST_DISMISSED_KEY);
}

export function hasVisitedWebsiteBuilder(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(VISITED_KEY) === "1";
}

export function markWebsiteBuilderVisited(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(VISITED_KEY, "1");
}

export function hasCompletedWebsiteBuilderTour(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(TOUR_COMPLETED_KEY) === "1";
}

export function markWebsiteBuilderTourCompleted(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOUR_COMPLETED_KEY, "1");
  markWebsiteBuilderVisited();
}

export function readInitialChecklistVisibility(): { show: boolean } {
  return {
    show: !isSetupChecklistDismissed() && !hasVisitedWebsiteBuilder(),
  };
}

export function shouldShowWebsiteBuilderTour(): boolean {
  return !hasCompletedWebsiteBuilderTour() && !hasVisitedWebsiteBuilder();
}
