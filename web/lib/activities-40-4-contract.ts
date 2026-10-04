import type { ActivityStatus } from "@/lib/activities-api";

export const ACTIVITIES_PATH = "/activities";
export const ACTIVITIES_PAGE_H1 = "Activities";
export const ACTIVITY_DETAIL_FALLBACK_H1 = "Activity";

export const ACTIVITIES_FORBIDDEN_NAV = ["Opportunity", "/opportunities"] as const;

export type ActivitiesListState =
  | "loading"
  | "error"
  | "permission"
  | "empty"
  | "no-match"
  | "populated";

export type ActivityDetailState =
  | "loading"
  | "error"
  | "permission"
  | "not-found"
  | "populated";

export type ActivityRequestKind = "denied" | "not-found" | "error";

export class ActivityRequestError extends Error {
  readonly status: number;
  readonly kind: ActivityRequestKind;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ActivityRequestError";
    this.status = status;
    this.kind =
      status === 401 || status === 403
        ? "denied"
        : status === 404
          ? "not-found"
          : "error";
  }
}

export function classifyActivityRequestFailure(
  error: unknown
): ActivityRequestKind {
  if (error instanceof ActivityRequestError) {
    return error.kind;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (/\b(401|403)\b/.test(message) || /not authorized|forbidden|don’t have access|don't have access/i.test(message)) {
    return "denied";
  }
  if (/\b404\b/.test(message) || /not found/i.test(message)) {
    return "not-found";
  }
  return "error";
}

export function classifyActivitiesListState(input: {
  initialized: boolean;
  error: string | null;
  errorKind?: ActivityRequestKind | null;
  itemCount: number;
  hasActiveFilters: boolean;
}): ActivitiesListState {
  if (!input.initialized) {
    return "loading";
  }
  if (input.error) {
    return input.errorKind === "denied" ? "permission" : "error";
  }
  if (input.itemCount > 0) {
    return "populated";
  }
  return input.hasActiveFilters ? "no-match" : "empty";
}

export function classifyActivityDetailState(input: {
  activityName: string | null;
  error: string | null;
  errorKind?: ActivityRequestKind | null;
}): ActivityDetailState {
  if (input.error) {
    if (input.errorKind === "denied") {
      return "permission";
    }
    if (input.errorKind === "not-found") {
      return "not-found";
    }
    return "error";
  }
  return input.activityName ? "populated" : "loading";
}

export function activityDetailHeading(
  state: ActivityDetailState,
  activityName: string | null
): string {
  return state === "populated" && activityName
    ? activityName
    : ACTIVITY_DETAIL_FALLBACK_H1;
}

export function activitiesListErrorCopy(kind: ActivityRequestKind): {
  title: string;
  message: string;
} {
  if (kind === "denied") {
    return {
      title: "You don’t have access to Activities.",
      message: "This workspace did not authorize the Activities list.",
    };
  }
  return {
    title: "Could not load activities.",
    message: "The list is unchanged. Try again, or come back in a moment.",
  };
}

export function activityDetailErrorCopy(kind: ActivityRequestKind): {
  title: string;
  message: string;
} {
  if (kind === "denied") {
    return {
      title: "You don’t have access to this activity.",
      message: "This workspace did not authorize that activity.",
    };
  }
  if (kind === "not-found") {
    return {
      title: "Activity not found.",
      message: "It may have been removed, or the link is for a different workspace.",
    };
  }
  return {
    title: "Could not load activity.",
    message: "Try again, or return to Activities.",
  };
}

export function isActionableActivityStatus(status: ActivityStatus | string): boolean {
  return status === "draft" || status === "published";
}

export function defaultListPlacesArchivedLast(
  statuses: Array<ActivityStatus | string>
): boolean {
  const firstArchived = statuses.findIndex((status) => status === "archived");
  if (firstArchived === -1) {
    return true;
  }
  return statuses.slice(0, firstArchived).every((status) =>
    isActionableActivityStatus(status)
  ) && statuses.slice(firstArchived).every((status) => status === "archived");
}

export function activitiesHasOpportunitySurface(input: {
  navLabels: string[];
  filterLabels: string[];
  pathname: string;
}): boolean {
  const haystack = [...input.navLabels, ...input.filterLabels, input.pathname]
    .join(" ")
    .toLowerCase();
  return haystack.includes("opportunity") || input.pathname.includes("/opportunities");
}
