import { describe, expect, it } from "vitest";

import {
  ACTIVITIES_FORBIDDEN_NAV,
  ActivityRequestError,
  activitiesHasOpportunitySurface,
  activitiesListErrorCopy,
  activityDetailErrorCopy,
  activityDetailHeading,
  classifyActivitiesListState,
  classifyActivityDetailState,
  classifyActivityRequestFailure,
  defaultListPlacesArchivedLast,
  nextActivitiesListPage,
} from "@/lib/activities-40-4-contract";
import { adminNavItems } from "@/lib/admin-nav";

describe("Story 40.4 Activities contract", () => {
  it("never places Archived ahead of available Draft or Published rows", () => {
    expect(
      defaultListPlacesArchivedLast(["draft", "published", "archived"])
    ).toBe(true);
    expect(
      defaultListPlacesArchivedLast(["published", "draft", "archived", "archived"])
    ).toBe(true);
    expect(defaultListPlacesArchivedLast(["archived", "draft"])).toBe(false);
    expect(defaultListPlacesArchivedLast(["published", "archived", "draft"])).toBe(
      false
    );
  });

  it("keeps empty, no-match, error, denied, and populated distinct", () => {
    expect(
      classifyActivitiesListState({
        initialized: false,
        error: null,
        itemCount: 0,
        hasActiveFilters: false,
      })
    ).toBe("loading");
    expect(
      classifyActivitiesListState({
        initialized: true,
        error: null,
        itemCount: 0,
        hasActiveFilters: false,
      })
    ).toBe("empty");
    expect(
      classifyActivitiesListState({
        initialized: true,
        error: null,
        itemCount: 0,
        hasActiveFilters: true,
      })
    ).toBe("no-match");
    expect(
      classifyActivitiesListState({
        initialized: true,
        error: "fail",
        errorKind: "error",
        itemCount: 0,
        hasActiveFilters: false,
      })
    ).toBe("error");
    expect(
      classifyActivitiesListState({
        initialized: true,
        error: "denied",
        errorKind: "denied",
        itemCount: 0,
        hasActiveFilters: false,
      })
    ).toBe("permission");
    expect(
      classifyActivitiesListState({
        initialized: true,
        error: null,
        itemCount: 2,
        hasActiveFilters: false,
      })
    ).toBe("populated");
  });

  it("resets list paging when the query key changes from any source", () => {
    expect(nextActivitiesListPage("draft\0\0", "draft\0\0", 3)).toBe(3);
    expect(nextActivitiesListPage("draft\0\0", "\0\0", 3)).toBe(1);
    expect(nextActivitiesListPage("\0\0", "archived\0\0", 2)).toBe(1);
  });

  it("treats a loaded activity as populated even with an empty name", () => {
    expect(
      classifyActivityDetailState({
        activityName: "",
        error: null,
        activityLoaded: true,
      })
    ).toBe("populated");
    expect(
      classifyActivityDetailState({
        activityName: "Clinic",
        error: "gone",
        errorKind: "not-found",
        activityLoaded: true,
      })
    ).toBe("not-found");
  });

  it("uses the activity name as the populated detail h1", () => {
    expect(activityDetailHeading("populated", "Harbourline Clinic")).toBe(
      "Harbourline Clinic"
    );
    expect(activityDetailHeading("loading", null)).toBe("Activity");
    expect(activityDetailHeading("not-found", null)).toBe("Activity");
    expect(activityDetailHeading("permission", null)).toBe("Activity");
    expect(activityDetailHeading("error", null)).toBe("Activity");
  });

  it("classifies detail 401/403/404 distinctly", () => {
    expect(
      classifyActivityDetailState({
        activityName: null,
        error: "no",
        errorKind: "denied",
      })
    ).toBe("permission");
    expect(
      classifyActivityDetailState({
        activityName: null,
        error: "missing",
        errorKind: "not-found",
      })
    ).toBe("not-found");
    expect(classifyActivityRequestFailure(new ActivityRequestError(403, "no"))).toBe(
      "denied"
    );
    expect(classifyActivityRequestFailure(new ActivityRequestError(404, "gone"))).toBe(
      "not-found"
    );
    expect(activityDetailErrorCopy("denied").title).toMatch(/don’t have access/i);
    expect(activityDetailErrorCopy("not-found").title).toMatch(/not found/i);
    expect(activitiesListErrorCopy("error").title).not.toMatch(/caught up/i);
  });

  it("does not treat Opportunity as an Activities surface", () => {
    expect(
      activitiesHasOpportunitySurface({
        navLabels: ["All activities", "Communities", "Categories"],
        filterLabels: ["All statuses", "Draft", "Published", "Archived"],
        pathname: "/activities",
      })
    ).toBe(false);
    expect(
      activitiesHasOpportunitySurface({
        navLabels: ["Opportunity"],
        filterLabels: [],
        pathname: "/activities",
      })
    ).toBe(true);
    expect(
      activitiesHasOpportunitySurface({
        navLabels: [],
        filterLabels: [],
        pathname: "/opportunities",
      })
    ).toBe(true);
    expect(ACTIVITIES_FORBIDDEN_NAV).toContain("/opportunities");
    const activityNav = adminNavItems.find((item) => item.label === "Activities");
    expect(activityNav?.children?.map((child) => child.label)).toEqual([
      "All activities",
      "Communities",
      "Categories",
    ]);
    expect(
      [...adminNavItems, ...(activityNav?.children ?? [])]
        .map((item) => item.label)
        .join(" ")
    ).not.toMatch(/opportunity/i);
  });
});
