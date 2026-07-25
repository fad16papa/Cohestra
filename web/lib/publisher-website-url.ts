import type { PublicDoorPayload } from "@/lib/public-door-api";

export type PublisherWebsiteLink = {
  href: string;
  label: string;
  /** Tooltip / screen-reader hint with the destination host or URL. */
  title?: string;
  external: boolean;
};

function formatSlugLabel(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Marketing apex from a tenant workspace origin (e.g. slug.localhost → localhost). */
export function resolveMarketingApexUrl(origin: string): string {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    const portSuffix = url.port ? `:${url.port}` : "";

    if (hostname.endsWith(".localhost") && hostname !== "localhost") {
      return `${url.protocol}//localhost${portSuffix}`;
    }

    if (
      hostname.endsWith(".cohestra.app") &&
      hostname !== "cohestra.app" &&
      hostname !== "www.cohestra.app"
    ) {
      return `${url.protocol}//cohestra.app`;
    }

    if (hostname.endsWith(".nip.io")) {
      const parts = hostname.split(".");
      if (parts.length >= 5) {
        return `${url.protocol}//${parts.slice(1).join(".")}${portSuffix}`;
      }
    }

    return origin;
  } catch {
    return origin;
  }
}

export function buildPublisherWebsiteLink(
  door: PublicDoorPayload,
  origin: string
): PublisherWebsiteLink | null {
  const plan = door.plan?.trim().toLowerCase();

  if (plan === "core" || plan === "pro") {
    let displayHost: string | null = null;
    try {
      displayHost = new URL(origin).host;
    } catch {
      displayHost = null;
    }

    const friendlyName =
      door.site?.published.siteName?.trim() ||
      door.tenantName?.trim() ||
      (door.tenantSlug?.trim() ? formatSlugLabel(door.tenantSlug) : null);

    if (!friendlyName && !displayHost) {
      return null;
    }

    return {
      href: origin.endsWith("/") ? origin : `${origin}/`,
      label: friendlyName ? `Visit ${friendlyName}` : "Visit website",
      title: displayHost ? `Opens ${displayHost}` : undefined,
      external: false,
    };
  }

  if (plan === "basic") {
    const marketingUrl = resolveMarketingApexUrl(origin);
    let marketingHost: string | undefined;
    try {
      marketingHost = new URL(marketingUrl).host;
    } catch {
      marketingHost = undefined;
    }

    return {
      href: marketingUrl,
      label: "Explore Cohestra",
      title: marketingHost ? `Opens ${marketingHost}` : undefined,
      external: marketingUrl !== origin,
    };
  }

  return null;
}
