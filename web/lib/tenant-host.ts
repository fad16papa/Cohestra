/** Parse tenant slug from a host header or hostname (e.g. creativorare.localhost). */
export function parseTenantSlugFromHostname(hostname: string): string | null {
  const host = hostname.trim().toLowerCase();
  if (!host) {
    return null;
  }

  if (host.endsWith(".localhost") && host !== "localhost") {
    return host.slice(0, -".localhost".length);
  }

  if (
    host.endsWith(".cohestra.app") &&
    host !== "cohestra.app" &&
    host !== "www.cohestra.app"
  ) {
    return host.slice(0, -".cohestra.app".length);
  }

  if (host.endsWith(".nip.io")) {
    const parts = host.split(".");
    if (parts.length >= 5) {
      return parts[0] ?? null;
    }
  }

  return null;
}

export function parseTenantSlugFromOrigin(origin: string): string | null {
  try {
    return parseTenantSlugFromHostname(new URL(origin).hostname);
  } catch {
    return null;
  }
}

export function formatTenantWorkspaceLabel(
  slug: string,
  tenantName: string | null | undefined
): string {
  const trimmedName = tenantName?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
