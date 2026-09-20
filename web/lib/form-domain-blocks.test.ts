import { describe, expect, it } from "vitest";

import {
  FORM_COMPOSITION_DOMAIN_TYPES,
  isFormCompositionDomainType,
  resolveFormDomainBlock,
} from "@/lib/form-domain-blocks";

describe("form-domain-blocks", () => {
  it("accepts only the three canonical domain types", () => {
    expect(FORM_COMPOSITION_DOMAIN_TYPES).toEqual([
      "activityDetails",
      "communityIdentity",
      "capacityStatus",
    ]);
    expect(isFormCompositionDomainType("activityDetails")).toBe(true);
    expect(isFormCompositionDomainType("location")).toBe(false);
    expect(isFormCompositionDomainType("")).toBe(false);
  });

  it("renders complementary schedule and location without Activity title", () => {
    const resolved = resolveFormDomainBlock("activityDetails", {
      schedule: "Friday 7:00 AM SGT",
      location: "East Coast Park",
    });
    expect(resolved).toMatchObject({
      domain: "activityDetails",
      visible: true,
      schedule: "Friday 7:00 AM SGT",
      location: "East Coast Park",
    });
    expect(JSON.stringify(resolved)).not.toMatch(/title|name/i);
  });

  it("hides empty activity detail rows and omits the block when both are missing", () => {
    expect(
      resolveFormDomainBlock("activityDetails", {
        schedule: "  ",
        location: "Marina Bay",
      })
    ).toMatchObject({
      visible: true,
      schedule: null,
      location: "Marina Bay",
    });
    expect(
      resolveFormDomainBlock("activityDetails", {
        schedule: "",
        location: null,
      }).visible
    ).toBe(false);
  });

  it("omits community identity when name and logo are absent", () => {
    expect(
      resolveFormDomainBlock("communityIdentity", {
        communityLabel: "  ",
        logoAssetId: null,
      }).visible
    ).toBe(false);
  });

  it("keeps community name when logo is missing", () => {
    const resolved = resolveFormDomainBlock("communityIdentity", {
      communityLabel: "Harbourline",
      logoAssetId: null,
    });
    expect(resolved).toMatchObject({
      domain: "communityIdentity",
      visible: true,
      communityLabel: "Harbourline",
      logoUrl: null,
      logoAlt: "Harbourline logo",
    });
  });

  it("reuses capacity summary and hides unlimited zero-going", () => {
    const hidden = resolveFormDomainBlock("capacityStatus", {
      registrationCount: 0,
      maxRegistrants: null,
    });
    expect(hidden.visible).toBe(false);

    const spots = resolveFormDomainBlock("capacityStatus", {
      registrationCount: 34,
      maxRegistrants: 42,
    });
    expect(spots.visible).toBe(true);
    if (spots.domain === "capacityStatus") {
      expect(spots.summary).toMatchObject({
        kind: "spots",
        going: 34,
        spotsRemaining: 8,
      });
    }
  });

  it("never shows negative remaining spots for over-cap state", () => {
    const resolved = resolveFormDomainBlock("capacityStatus", {
      registrationCount: 50,
      maxRegistrants: 42,
      isRegistrationFull: true,
    });
    expect(resolved.visible).toBe(true);
    if (resolved.domain === "capacityStatus" && resolved.summary.kind === "full") {
      expect(resolved.summary.going).toBe(42);
    }
  });

  it("hides unknown domain types instead of rendering broken output", () => {
    expect(resolveFormDomainBlock("not-a-block", {}).visible).toBe(false);
    expect(resolveFormDomainBlock(null, undefined).visible).toBe(false);
  });
});
