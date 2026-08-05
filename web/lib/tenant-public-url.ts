import { parseTenantSlugFromOrigin } from "@/lib/tenant-host";
import { buildTenantDashboardUrl } from "@/lib/signup/signup-api";

function isProductionPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "cohestra.app" || host.endsWith(".cohestra.app");
}

function isLocalDevHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost")
  );
}

/** Public homepage origin for a tenant slug (e.g. creativorare.localhost:8088). */
export function buildTenantPublicSiteUrl(slug: string): string {
  return buildTenantDashboardUrl(slug).replace(/\/dashboard\/?$/, "");
}

/**
 * Resolve the visitor-facing homepage URL for the current workspace.
 * Prefer an explicit tenant slug (shell / door API) over the dashboard host.
 */
export function resolvePublicSiteUrl(tenantSlug?: string | null): string {
  if (typeof window === "undefined") {
    return "";
  }

  const slug =
    tenantSlug?.trim() || parseTenantSlugFromOrigin(window.location.origin);

  if (slug) {
    return buildTenantPublicSiteUrl(slug).replace(/\/$/, "");
  }

  return window.location.origin.replace(/\/$/, "");
}

/**
 * UI-safe public URL: no dev ports on screen; production is always https without port.
 */
export function formatPublicSiteUrlForDisplay(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    if (isProductionPublicHost(host)) {
      return `https://${host.replace(/^www\./, "")}`;
    }

    if (isLocalDevHost(host)) {
      return `${parsed.protocol}//${parsed.hostname}`;
    }

    const isDefaultPort =
      parsed.port === "" ||
      (parsed.protocol === "http:" && parsed.port === "80") ||
      (parsed.protocol === "https:" && parsed.port === "443");

    if (isDefaultPort) {
      return `${parsed.protocol}//${parsed.hostname}`;
    }

    return parsed.origin.replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

/** Hostname for preview chrome and link cards (never includes port). */
export function publicSiteHostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "yoursite.com";
  }
}

export function resolvePublicSiteDisplayUrl(tenantSlug?: string | null): string {
  return formatPublicSiteUrlForDisplay(resolvePublicSiteUrl(tenantSlug));
}
