import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CONSENT_ACCEPTED,
  CONSENT_ESSENTIAL,
  MARKETING_COOKIE_CONSENT_KEY,
  consentFromPreferences,
  isKnownConsentValue,
  shouldShowMarketingCookieBanner,
} from "@/lib/marketing-cookie-consent";

const COOKIE_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/marketing/marketing-cookie-consent.tsx"),
  "utf8"
);
const SHELL_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/marketing/marketing-shell.tsx"),
  "utf8"
);

describe("marketing cookie consent contract", () => {
  it("keeps the existing storage key", () => {
    expect(MARKETING_COOKIE_CONSENT_KEY).toBe("cohestra-marketing-cookie-consent");
  });

  it("hides for accepted, essential, and unknown stored values", () => {
    expect(shouldShowMarketingCookieBanner(null, "")).toBe(true);
    expect(shouldShowMarketingCookieBanner("", "")).toBe(true);
    expect(shouldShowMarketingCookieBanner(CONSENT_ACCEPTED, "")).toBe(false);
    expect(shouldShowMarketingCookieBanner(CONSENT_ESSENTIAL, "")).toBe(false);
    expect(shouldShowMarketingCookieBanner("legacy-yes", "")).toBe(false);
    expect(isKnownConsentValue("legacy-yes")).toBe(false);
  });

  it("does not hide the banner for a leftover #crm hash", () => {
    expect(shouldShowMarketingCookieBanner(null, "#crm")).toBe(true);
    expect(shouldShowMarketingCookieBanner("", "#crm")).toBe(true);
  });

  it("maps preferences to accepted only when optional analytics is on", () => {
    expect(consentFromPreferences(false)).toBe(CONSENT_ESSENTIAL);
    expect(consentFromPreferences(true)).toBe(CONSENT_ACCEPTED);
  });

  it("ships D20 actions without a covering dialog or Learn-more accept", () => {
    expect(COOKIE_SOURCE).toContain('role="region"');
    expect(COOKIE_SOURCE).not.toMatch(/role=["']dialog["']/);
    expect(COOKIE_SOURCE).not.toContain("fixed inset-x-4");
    expect(COOKIE_SOURCE).toContain("Accept");
    expect(COOKIE_SOURCE).toContain("Reject non-essential");
    expect(COOKIE_SOURCE).toContain("Preferences");
    expect(COOKIE_SOURCE).toContain("<Dialog");
    expect(COOKIE_SOURCE).not.toMatch(/Learn more[\s\S]{0,200}onClick=\{accept\}/);
    expect(COOKIE_SOURCE).toContain("writeStoredMarketingConsent");
    expect(SHELL_SOURCE).toContain("<MarketingCookieConsent");
    expect(SHELL_SOURCE).toContain("focus-visible:ring-2");
  });
});
