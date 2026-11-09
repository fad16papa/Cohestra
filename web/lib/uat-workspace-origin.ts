import { parseTenantSlugFromHostname } from "./tenant-host";

const UAT_MARKETING_APEX_HOSTS = new Set(["uat.cohestra.app", "www.uat.cohestra.app"]);

/**
 * True when the configured slug is the UAT marketing apex label, not a tenant.
 * Pro acceptance must reject this instead of following a handoff to whatever
 * workspace the account belongs to.
 */
export function configuredSlugIsMarketingApex(base: string, slug: string): boolean {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }

  const host = new URL(base).hostname.toLowerCase();
  if (parseTenantSlugFromHostname(host) !== null) {
    return false;
  }

  if (UAT_MARKETING_APEX_HOSTS.has(host) && trimmed === "uat") {
    return true;
  }

  return host.split(".")[0] === trimmed;
}

/**
 * Tenant origin for UAT acceptance.
 *
 * `uat.cohestra.app` is the marketing apex. Its first label is `uat`, so a
 * slug of `uat` must not be treated as "already on the tenant host" and must
 * not be rewritten to `uat.uat.cohestra.app`. Callers that require a tenant
 * reject that slug before login.
 */
export function resolveUatWorkspaceOrigin(base: string, slug: string): string {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("tenant slug is required");
  }

  const url = new URL(base);
  const host = url.hostname.toLowerCase();
  if (parseTenantSlugFromHostname(host) === trimmed) {
    return url.origin;
  }

  if (parseTenantSlugFromHostname(host) === null && host.split(".")[0] === trimmed) {
    return url.origin;
  }

  url.hostname = `${trimmed}.${host}`;
  return url.origin;
}
