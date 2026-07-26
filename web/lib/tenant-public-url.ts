import { parseTenantSlugFromOrigin } from "@/lib/tenant-host";
import { buildTenantDashboardUrl } from "@/lib/signup/signup-api";

/** Public homepage origin for a tenant slug (e.g. creativorare.localhost:8088). */
export function buildTenantPublicSiteUrl(slug: string): string {
  return buildTenantDashboardUrl(slug).replace(/\/dashboard\/?$/, "");
}

/**
 * Resolve the visitor-facing homepage URL for the current workspace.
 * When the operator dashboard is on apex localhost, pass tenantSlug from admin shell or door API.
 */
export function resolvePublicSiteUrl(tenantSlug?: string | null): string {
  if (typeof window === "undefined") {
    return "";
  }

  const slugFromHost = parseTenantSlugFromOrigin(window.location.origin);
  if (slugFromHost) {
    return window.location.origin.replace(/\/$/, "");
  }

  if (tenantSlug?.trim()) {
    return buildTenantPublicSiteUrl(tenantSlug.trim());
  }

  return window.location.origin.replace(/\/$/, "");
}
