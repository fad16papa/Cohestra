import { describe, expect, it } from "vitest";

import { marketingDemoClub } from "@/lib/marketing/marketing-demo-club";
import {
  getWebsiteCinemaDefaultSectionId,
  getWebsiteCinemaInspectorFields,
  getWebsiteSectionLabel,
  listWebsiteCinemaSections,
  normalizeWebsiteSectionType,
  WEBSITE_CINEMA_STUDIO_DEFAULT_SECTION_ID,
} from "@/lib/marketing/website-cinema-studio";

describe("website cinema studio helpers", () => {
  it("normalizes demo upcoming section type", () => {
    expect(normalizeWebsiteSectionType("upcomingactivities")).toBe(
      "upcomingActivities"
    );
  });

  it("lists enabled Harbourline sections in order", () => {
    const sections = listWebsiteCinemaSections(marketingDemoClub.website);
    expect(sections.length).toBeGreaterThan(3);
    expect(sections[0]?.type).toBe("hero");
    expect(
      sections.some(
        (section) =>
          normalizeWebsiteSectionType(section.type) === "upcomingActivities"
      )
    ).toBe(true);
  });

  it("defaults inspector focus to upcoming activities section", () => {
    expect(getWebsiteCinemaDefaultSectionId(marketingDemoClub.website)).toBe(
      WEBSITE_CINEMA_STUDIO_DEFAULT_SECTION_ID
    );
  });

  it("surfaces operational activity connection in inspector", () => {
    const upcoming = listWebsiteCinemaSections(marketingDemoClub.website).find(
      (section) => section.id === WEBSITE_CINEMA_STUDIO_DEFAULT_SECTION_ID
    );
    const fields = getWebsiteCinemaInspectorFields(
      upcoming,
      marketingDemoClub.website.upcomingActivities.length
    );
    expect(fields.some((field) => field.label === "Data source")).toBe(true);
    expect(fields.some((field) => field.value.includes("3 published"))).toBe(
      true
    );
  });

  it("uses production section labels", () => {
    expect(getWebsiteSectionLabel("upcomingactivities")).toBe(
      "Upcoming activities"
    );
    expect(getWebsiteSectionLabel("hero")).toBe("Hero");
  });
});
