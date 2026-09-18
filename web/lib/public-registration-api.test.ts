import { describe, expect, it } from "vitest";

import { parsePublicActivity } from "@/lib/public-registration-api";

describe("parsePublicActivity", () => {
  it("parses resolvedExperience from public payload", () => {
    const activity = parsePublicActivity({
      slug: "demo",
      name: "Demo",
      status: "published",
      isRegistrationOpen: true,
      isRegistrationFull: false,
      registrationCount: 0,
      schedule: "Sat 10am",
      location: "Court A",
      communityLabel: "Youth",
      preset: "classic",
      resolvedExperience: {
        layout: "centered",
        style: "modern",
        flow: "single-page",
        heroDisplay: "cover",
      },
    });

    expect(activity.resolvedExperience.layout).toBe("centered");
    expect(activity.resolvedExperience.style).toBe("modern");
  });

  it("falls back to preset defaults when resolvedExperience missing", () => {
    const activity = parsePublicActivity({
      slug: "demo",
      name: "Demo",
      status: "published",
      isRegistrationOpen: true,
      isRegistrationFull: false,
      registrationCount: 0,
      schedule: "Sat 10am",
      location: "Court A",
      communityLabel: "Youth",
      preset: "card",
    });

    expect(activity.resolvedExperience.layout).toBe("card");
  });
});
