import type { ActivityFormSchema } from "@/lib/activities-api";
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

    if (hostname === "uat.cohestra.app" || hostname === "www.uat.cohestra.app") {
      return null;
    }

    if (hostname.endsWith(".uat.cohestra.app")) {
      const slug = hostname.slice(0, -".uat.cohestra.app".length);
      return slug && !slug.includes(".") ? slug : null;
    }

    if (hostname.endsWith(".cohestra.app") && hostname !== "cohestra.app") {
      const slug = hostname.slice(0, -".cohestra.app".length);
      return slug && !slug.includes(".") ? slug : null;
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

    if (hostname === "uat.cohestra.app" || hostname === "www.uat.cohestra.app") {
      return `${url.protocol}//uat.cohestra.app${portSuffix}`;
    }

    if (hostname.endsWith(".uat.cohestra.app")) {
      return `${url.protocol}//uat.cohestra.app${portSuffix}`;
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

function isCoreOrAbovePlan(plan: string | null | undefined): boolean {
  const normalizedPlan = plan?.trim().toLowerCase();
  return (
    normalizedPlan === "core" ||
    normalizedPlan === "pro" ||
    normalizedPlan === "enterprise"
  );
}

/** Whether this registration form should show the tenant Cohestra website link (Core/Pro). */
export function isPublisherWebsiteLinkEnabledForForm(
  plan: string | null | undefined,
  formSchema: ActivityFormSchema | null | undefined
): boolean {
  if (!isCoreOrAbovePlan(plan)) {
    return false;
  }

  return formSchema?.meta?.showPublisherWebsiteLink !== false;
}

/** Footer link for the public registration layout (Basic → marketing apex only). */
export function buildPublicRegistrationLayoutFooterLink(
  door: PublicDoorPayload,
  origin: string
): PublisherWebsiteLink | null {
  const plan = door.plan?.trim().toLowerCase();
  if (plan !== "basic") {
    return null;
  }

  return buildPublisherWebsiteLink(door, origin);
}

/** Per-activity tenant website link on the registration page (Core/Pro, optional). */
export function resolveRegistrationPublisherWebsiteLink(
  door: PublicDoorPayload,
  origin: string,
  formSchema: ActivityFormSchema | null | undefined
): PublisherWebsiteLink | null {
  if (!isPublisherWebsiteLinkEnabledForForm(door.plan, formSchema)) {
    return null;
  }

  return buildPublisherWebsiteLink(door, origin);
}

export function buildPublisherWebsiteLink(
  door: PublicDoorPayload,
  origin: string
): PublisherWebsiteLink | null {
  const plan = door.plan?.trim().toLowerCase();

  if (isCoreOrAbovePlan(plan)) {
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
