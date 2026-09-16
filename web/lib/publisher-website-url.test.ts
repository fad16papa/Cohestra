import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import { EMPTY_PUBLIC_DOOR } from "@/lib/public-door-payload";
import {
  buildPublicRegistrationLayoutFooterLink,
  isPublisherWebsiteLinkEnabledForForm,
  resolveRegistrationPublisherWebsiteLink,
} from "@/lib/publisher-website-url";

const coreDoor = {
  ...EMPTY_PUBLIC_DOOR,
  kind: "active" as const,
  plan: "Core",
  tenantSlug: "creativorare",
};

describe("isPublisherWebsiteLinkEnabledForForm", () => {
  it("returns false for Basic", () => {
    expect(
      isPublisherWebsiteLinkEnabledForForm("Basic", { version: 1, fields: [] })
    ).toBe(false);
  });

  it("defaults to enabled for Core when meta unset", () => {
    expect(
      isPublisherWebsiteLinkEnabledForForm("Core", { version: 1, fields: [] })
    ).toBe(true);
  });

  it("respects explicit false", () => {
    const schema: ActivityFormSchema = {
      version: 1,
      fields: [],
      meta: { introMarkdown: null, showPublisherWebsiteLink: false },
    };
    expect(isPublisherWebsiteLinkEnabledForForm("Pro", schema)).toBe(false);
  });
});

describe("resolveRegistrationPublisherWebsiteLink", () => {
  it("returns tenant link for Core when enabled", () => {
    const link = resolveRegistrationPublisherWebsiteLink(
      coreDoor,
      "https://creativorare.uat.cohestra.app",
      { version: 1, fields: [] }
    );
    expect(link?.label).toContain("creativorare");
    expect(link?.href).toContain("creativorare.uat.cohestra.app");
  });

  it("returns null when disabled in schema", () => {
    const link = resolveRegistrationPublisherWebsiteLink(
      coreDoor,
      "https://creativorare.uat.cohestra.app",
      {
        version: 1,
        fields: [],
        meta: { introMarkdown: null, showPublisherWebsiteLink: false },
      }
    );
    expect(link).toBeNull();
  });
});

describe("buildPublicRegistrationLayoutFooterLink", () => {
  it("returns Explore link for Basic only", () => {
    const link = buildPublicRegistrationLayoutFooterLink(
      { ...coreDoor, plan: "Basic" },
      "https://creativorare.uat.cohestra.app"
    );
    expect(link?.label).toBe("Explore Cohestra");
  });

  it("returns null for Core layout footer", () => {
    const link = buildPublicRegistrationLayoutFooterLink(
      coreDoor,
      "https://creativorare.uat.cohestra.app"
    );
    expect(link).toBeNull();
  });
});
