import { afterEach, describe, expect, it } from "vitest";

import {
  hasCompletedWebsiteBuilderTour,
  markWebsiteBuilderTourCompleted,
  shouldShowWebsiteBuilderTour,
} from "./website-builder-preferences";

describe("website builder preferences", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("scopes tour completion to the tenant slug", () => {
    expect(shouldShowWebsiteBuilderTour("harbourline")).toBe(true);
    markWebsiteBuilderTourCompleted("harbourline");
    expect(hasCompletedWebsiteBuilderTour("harbourline")).toBe(true);
    expect(hasCompletedWebsiteBuilderTour("px2-pro")).toBe(false);
    expect(shouldShowWebsiteBuilderTour("px2-pro")).toBe(true);
  });

  it("ignores missing slugs and legacy unscoped keys", () => {
    window.localStorage.setItem("activity-lead:website-builder-tour-completed", "1");
    expect(hasCompletedWebsiteBuilderTour(null)).toBe(false);
    expect(hasCompletedWebsiteBuilderTour("")).toBe(false);
    expect(shouldShowWebsiteBuilderTour(null)).toBe(false);
    expect(shouldShowWebsiteBuilderTour("")).toBe(false);
  });
});
