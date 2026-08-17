import type { PublicDoorPayload } from "@/lib/public-door-api";

export type PublisherWebsiteLink = {
  href: string;
  label: string;
  /** Tooltip / screen-reader hint with the destination host or URL. */
  title?: string;
  external: boolean;
};

function formatSlugLabel(slug: string): string {
  return slug.trim().toLowerCase();
}

function resolveTenantSlug(door: PublicDoorPayload, origin: string): string | null {
  const fromDoor = door.tenantSlug?.trim();
  if (fromDoor) {
    return formatSlugLabel(fromDoor);
  }

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (hostname.endsWith(".localhost") && hostname !== "localhost") {
      return hostname.slice(0, -".localhost".length);
    }

    if (hostname.endsWith(".cohestra.app") && hostname !== "cohestra.app") {
      return hostname.slice(0, -".cohestra.app".length);
    }

    if (hostname.endsWith(".nip.io")) {
      const parts = hostname.split(".");
      if (parts.length >= 4) {
        return parts[0];
      }
    }
  } catch {
    return null;
  }

  return null;
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
      if (parts.length >= 4) {
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

    const slug = resolveTenantSlug(door, origin);
    if (!slug && !displayHost) {
      return null;
    }

    return {
      href: origin.endsWith("/") ? origin : `${origin}/`,
      label: slug ? `Visit ${slug} Cohestra` : "Visit Cohestra",
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
