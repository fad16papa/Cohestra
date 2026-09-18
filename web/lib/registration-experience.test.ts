import { describe, expect, it } from "vitest";

import { resolveRegistrationExperience } from "@/lib/registration-experience";

describe("resolveRegistrationExperience", () => {
  it("defaults classic preset to centered modern single-page", () => {
    const resolved = resolveRegistrationExperience({
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
    });
    expect(resolved.layout).toBe("centered");
    expect(resolved.style).toBe("modern");
    expect(resolved.flow).toBe("single-page");
  });

  it("honors explicit experience layout", () => {
    const resolved = resolveRegistrationExperience({
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { layout: "split", style: "editorial", flow: "sections", heroDisplay: "split" },
    });
    expect(resolved.layout).toBe("split");
    expect(resolved.style).toBe("editorial");
  });
});
