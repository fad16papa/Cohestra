/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  hasCompletedWebsiteBuilderTour,
  markWebsiteBuilderTourCompleted,
  scopedWebsiteBuilderPreferenceKey,
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

  it("encodes slugs so tenant keys cannot collide", () => {
    const tour = "activity-lead:website-builder-tour-completed";
    expect(scopedWebsiteBuilderPreferenceKey(tour, "Harbourline")).toBe(
      scopedWebsiteBuilderPreferenceKey(tour, "harbourline")
    );
    expect(scopedWebsiteBuilderPreferenceKey(tour, "foo")).not.toBe(
      scopedWebsiteBuilderPreferenceKey(tour, "foo:bar")
    );
    expect(scopedWebsiteBuilderPreferenceKey(tour, "a/b")).not.toBe(
      scopedWebsiteBuilderPreferenceKey(tour, "a%2Fb")
    );
    markWebsiteBuilderTourCompleted("foo");
    expect(hasCompletedWebsiteBuilderTour("FOO")).toBe(true);
    expect(hasCompletedWebsiteBuilderTour("foo:bar")).toBe(false);
  });

  it("ignores missing slugs and legacy unscoped keys", () => {
    window.localStorage.setItem("activity-lead:website-builder-tour-completed", "1");
    expect(hasCompletedWebsiteBuilderTour(null)).toBe(false);
    expect(hasCompletedWebsiteBuilderTour("")).toBe(false);
    expect(shouldShowWebsiteBuilderTour(null)).toBe(false);
    expect(shouldShowWebsiteBuilderTour("")).toBe(false);
  });
});
