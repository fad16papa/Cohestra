export const MARKETING_COOKIE_CONSENT_KEY = "cohestra-marketing-cookie-consent";

export const CONSENT_ACCEPTED = "accepted";
export const CONSENT_ESSENTIAL = "essential";

export type MarketingCookieConsentValue = typeof CONSENT_ACCEPTED | typeof CONSENT_ESSENTIAL;

export function isKnownConsentValue(value: string | null): value is MarketingCookieConsentValue {
  return value === CONSENT_ACCEPTED || value === CONSENT_ESSENTIAL;
}

/** Any stored decision hides the banner, including unknown legacy strings. */
export function shouldShowMarketingCookieBanner(stored: string | null, _hash?: string): boolean {
  return stored == null || stored === "";
}

export function consentFromPreferences(optionalAnalyticsEnabled: boolean): MarketingCookieConsentValue {
  return optionalAnalyticsEnabled ? CONSENT_ACCEPTED : CONSENT_ESSENTIAL;
}

export function readStoredMarketingConsent(): string | null {
  try {
    return window.localStorage.getItem(MARKETING_COOKIE_CONSENT_KEY);
  } catch {
    return null;
  }
}

export function writeStoredMarketingConsent(value: MarketingCookieConsentValue): void {
  try {
    window.localStorage.setItem(MARKETING_COOKIE_CONSENT_KEY, value);
  } catch {
    // Private mode / blocked storage: still dismiss for this session.
  }
}
