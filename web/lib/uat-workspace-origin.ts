import { parseTenantSlugFromHostname } from "./tenant-host";

/**
 * Tenant origin for UAT acceptance.
 *
 * `uat.cohestra.app` is the marketing apex. Its first label is `uat`, so a
 * slug of `uat` must not be treated as "already on the tenant host" and must
 * not be rewritten to `uat.uat.cohestra.app`. Login on that apex hands off to
 * the account's real workspace.
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
