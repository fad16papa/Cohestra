const CHECKLIST_DISMISSED_KEY = "activity-lead:website-builder-checklist-dismissed";
const VISITED_KEY = "activity-lead:website-builder-visited";

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

export function readInitialChecklistVisibility(): { show: boolean } {
  return {
    show: !isSetupChecklistDismissed() && !hasVisitedWebsiteBuilder(),
  };
}
