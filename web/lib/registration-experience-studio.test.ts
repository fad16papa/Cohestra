import { describe, expect, it } from "vitest";

import type { RegistrationTheme } from "@/lib/activities-api";
import {
  activeExperienceFlow,
  activeExperienceLayoutChoice,
  applyExperienceFlow,
  applyPrimaryExperienceLayout,
  buildExperiencePreviewKey,
  canSelectExperienceFlow,
  canSelectExperienceLayout,
  registrationThemeForSave,
} from "@/lib/registration-experience-studio";

const baseTheme: RegistrationTheme = {
  preset: "classic",
  inheritCommunityBrand: true,
  accentColor: null,
  heroImageUrl: null,
};

describe("registration experience studio", () => {
  it("allows Modern Centered for Basic", () => {
    expect(canSelectExperienceLayout("Basic", "centered")).toBe(true);
    expect(canSelectExperienceLayout("Basic", "split")).toBe(false);
  });

  it("allows Split and Poster for Core", () => {
    expect(canSelectExperienceLayout("Core", "split")).toBe(true);
    expect(canSelectExperienceLayout("Core", "poster")).toBe(true);
  });

  it("allows Conversational flow only for Pro", () => {
    expect(canSelectExperienceFlow("Core", "conversational")).toBe(false);
    expect(canSelectExperienceFlow("Pro", "conversational")).toBe(true);
  });

  it("applies primary layout on classic preset", () => {
    const next = applyPrimaryExperienceLayout(baseTheme, "split");
    expect(next.preset).toBe("classic");
    expect(next.experience?.layout).toBe("split");
    expect(activeExperienceLayoutChoice(next)).toBe("split");
  });

  it("applies conversational flow to draft theme", () => {
    const next = applyExperienceFlow(baseTheme, "conversational");
    expect(activeExperienceFlow(next)).toBe("conversational");
  });

  it("buildExperiencePreviewKey changes when flow changes", () => {
    const single = buildExperiencePreviewKey(baseTheme);
    const conversational = buildExperiencePreviewKey(
      applyExperienceFlow(baseTheme, "conversational")
    );
    expect(single).not.toBe(conversational);
  });

  it("registrationThemeForSave preserves brand fields and experience", () => {
    const draft: RegistrationTheme = {
      ...baseTheme,
      accentColor: "  #abc123  ",
      experience: { layout: "poster", flow: "single-page" },
    };
    const saved = registrationThemeForSave(draft);
    expect(saved.accentColor).toBe("#abc123");
    expect(saved.experience?.layout).toBe("poster");
    expect(saved.preset).toBe("classic");
  });
});
