/**
 * Resolve activity/site hero image URLs for browser rendering.
 * Campaign assets are returned as same-origin relative paths so tenant hosts
 * (e.g. creativorare.localhost) can pass tenant-scoped public asset auth.
 */
const CAMPAIGN_ASSET_PREFIX = "/api/v1/public/campaign-assets/";

export function resolveHeroImageUrl(
  heroImageUrl: string | null | undefined,
  _publicApiBaseUrl?: string
): string | null {
  const trimmed = heroImageUrl?.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith(CAMPAIGN_ASSET_PREFIX)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname;
    const index = path.toLowerCase().indexOf(CAMPAIGN_ASSET_PREFIX);
    if (index >= 0) {
      return path.slice(index);
    }
  } catch {
    // Keep non-URL strings as-is (validator requires absolute URLs on save).
  }

  return trimmed;
}
