import { resolveMarketingApexUrl } from "@/lib/publisher-website-url";
import { parseTenantSlugFromHostname } from "@/lib/tenant-host";

/**
 * Platform ops (`/platform`, `/platform/login`, …) belongs on marketing apex only.
 * Tenant slug hosts 307 to the apex equivalent so club URLs never host Cohestra ops.
 */
export function resolvePlatformOpsRedirectUrl(
  origin: string,
  pathname: string,
  search = ""
): string | null {
  if (!pathname.startsWith("/platform")) {
    return null;
  }

  let hostname: string;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (!parseTenantSlugFromHostname(hostname)) {
    return null;
  }

  const apex = resolveMarketingApexUrl(origin).replace(/\/$/, "");
  const suffix =
    search === "" || search.startsWith("?") ? search : `?${search}`;
  return `${apex}${pathname}${suffix}`;
}

export function requestOriginFromHeaders(
  host: string | null | undefined,
  proto: string | null | undefined,
  fallbackOrigin: string
): string {
  const trimmedHost = host?.trim();
  if (!trimmedHost) {
    return fallbackOrigin;
  }

  const scheme = (proto?.trim() || "http").replace(/:$/, "");
  return `${scheme}://${trimmedHost}`;
}
