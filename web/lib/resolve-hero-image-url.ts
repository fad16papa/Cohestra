import { getPublicApiBaseUrl } from "@/lib/api";

const CAMPAIGN_ASSET_PREFIX = "/api/v1/public/campaign-assets/";

export function resolveHeroImageUrl(
  heroImageUrl: string | null | undefined,
  publicApiBaseUrl?: string
): string | null {
  const trimmed = heroImageUrl?.trim();
  if (!trimmed) {
    return null;
  }

  const baseUrl = (publicApiBaseUrl ?? getPublicApiBaseUrl()).replace(/\/$/, "");

  if (trimmed.toLowerCase().startsWith(CAMPAIGN_ASSET_PREFIX)) {
    return `${baseUrl}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname;
    const index = path.toLowerCase().indexOf(CAMPAIGN_ASSET_PREFIX);
    if (index >= 0) {
      return `${baseUrl}${path.slice(index)}`;
    }
  } catch {
    // Keep non-URL strings as-is (validator requires absolute URLs on save).
  }

  return trimmed;
}
