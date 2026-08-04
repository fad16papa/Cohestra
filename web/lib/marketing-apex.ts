import { isMarketingApexHost } from "@/lib/server-api-fetch";

const DEV_TENANT_SLUG_ENV = "DEV_TENANT_SLUG";

/**
 * Whether the home route should render the marketing landing page.
 * Mirrors API TenantHostResolver: bare localhost is marketing unless DEV_TENANT_SLUG is set.
 * Web-side guard keeps local UAT working when the API container has not been rebuilt yet.
 */
export function shouldRenderMarketingHome(
  host: string | null,
  doorKind: string
): boolean {
  if (doorKind === "marketing") {
    return true;
  }

  if (!isMarketingApexHost(host)) {
    return false;
  }

  const devTenantSlug =
    process.env[DEV_TENANT_SLUG_ENV]?.trim() ||
    process.env.Tenancy__DevTenantSlug?.trim();

  return !devTenantSlug;
}
