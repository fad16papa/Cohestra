import type { PublicDoorPayload } from "@/lib/public-door-api";

export type PublisherWebsiteLink = {
  href: string;
  label: string;
  external: boolean;
};

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

    const siteLabel =
      displayHost ||
      door.tenantSlug?.trim() ||
      door.site?.published.siteName?.trim() ||
      door.tenantName?.trim();

    if (!siteLabel) {
      return null;
    }

    return {
      href: origin.endsWith("/") ? origin : `${origin}/`,
      label: displayHost ? `Visit ${displayHost}` : `Visit ${siteLabel}`,
      external: false,
    };
  }

  if (plan === "basic") {
    const marketingUrl = resolveMarketingApexUrl(origin);
    return {
      href: marketingUrl,
      label: "Explore Cohestra",
      external: marketingUrl !== origin,
    };
  }

  return null;
}
