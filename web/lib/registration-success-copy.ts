/** System copy for the public registration success screen. Plain text — never HTML entities. */

export const REGISTRATION_SUCCESS_HEADING = "You're registered!";

export const REGISTRATION_SUCCESS_PREVIEW_HEADING = "Preview success screen";

export const REGISTRATION_SUCCESS_SAVED_PREFIX = "We've saved your spot for";

export const REGISTRATION_SUCCESS_CHECKIN_HINT =
  "Save your registration ID below — you'll need it at check-in.";

const HTML_ENTITY_PATTERN = /&(?:apos|quot|amp|lt|gt|#39|#x27);/i;

export function registrationSuccessCopyContainsHtmlEntity(value: string): boolean {
  return HTML_ENTITY_PATTERN.test(value);
}
