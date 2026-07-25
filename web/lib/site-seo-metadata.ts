import type { Metadata } from "next";
import { cache } from "react";

import { getPublicApiBaseUrl } from "@/lib/api";
import { PLATFORM_NAME } from "@/lib/brand-assets";
import { getSiteLandingConfig } from "@/lib/site-landing-config";
import {
  readHeroDescription,
  readHeroHeadline,
  readHeroImageAssetId,
  type PublicSitePayload,
} from "@/lib/public-site-api";
import { fetchPublicSiteServer } from "@/lib/public-site-server-api";
import type { PublicActivity } from "@/lib/public-registration-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import { buildActivitySharePreview } from "@/lib/share-kit-utils";

export type PublishedSiteBranding = {
  siteName: string;
  logoUrl: string | null;
};

function resolveCampaignAssetUrl(assetId: string): string | null {
  return resolveHeroImageUrl(
    `/api/v1/public/campaign-assets/${assetId}`,
    getPublicApiBaseUrl()
  );
}

function buildOpenGraphImage(imageUrl: string, alt: string): Metadata["openGraph"] {
  return {
    images: [{ url: imageUrl, alt }],
  };
}

function resolveAbsolutePublicAssetUrl(
  imageUrl: string | null | undefined,
  origin: string | null
): string | null {
  const resolved = resolveHeroImageUrl(imageUrl);
  if (!resolved) {
    return null;
  }

  if (/^https?:\/\//i.test(resolved)) {
    return resolved;
  }

  if (origin && resolved.startsWith("/")) {
    return `${origin.replace(/\/$/, "")}${resolved}`;
  }

  return null;
}

export function buildActivityRegistrationMetadata(
  activity: PublicActivity,
  origin: string | null,
  options: { indexable?: boolean } = {}
): Metadata {
  const registrationPath = `/register/${activity.slug}`;
  const registrationUrl = origin
    ? `${origin.replace(/\/$/, "")}${registrationPath}`
    : registrationPath;

  const preview = buildActivitySharePreview(activity, registrationUrl);
  const ogImageUrl = resolveAbsolutePublicAssetUrl(activity.heroImageUrl, origin);

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    title: preview.title,
    description: preview.description,
    type: "website",
    url: registrationUrl,
    ...(ogImageUrl
      ? buildOpenGraphImage(ogImageUrl, preview.title)
      : {}),
  };

  return {
    title: `${activity.name} | Register`,
    description: preview.description,
    ...(options.indexable === false
      ? { robots: { index: false, follow: false } }
      : {}),
    openGraph,
    ...(ogImageUrl
      ? {
          twitter: {
            card: "summary_large_image",
            title: preview.title,
            description: preview.description,
            images: [ogImageUrl],
          },
        }
      : {}),
  };
}

export function resolvePublishedSiteBranding(site: PublicSitePayload): PublishedSiteBranding {
  const logoAssetId = site.published.logoAssetId?.trim();
  return {
    siteName: site.published.siteName,
    logoUrl: logoAssetId ? resolveCampaignAssetUrl(logoAssetId) : null,
  };
}

export const fetchPublishedSiteBranding = cache(
  async (): Promise<PublishedSiteBranding | null> => {
    const site = await fetchPublicSiteServer();
    return site ? resolvePublishedSiteBranding(site) : null;
  }
);

export function buildPublishedSiteMetadata(
  site: PublicSitePayload,
  options: { preview?: boolean } = {}
): Metadata {
  const { published } = site;
  const headline = readHeroHeadline(published) ?? published.siteName;
  const description =
    readHeroDescription(published) ?? `${published.siteName} community events`;
  const openGraphDescription = readHeroDescription(published) ?? headline;
  const heroImageAssetId = readHeroImageAssetId(published);
  const openGraphImageUrl = heroImageAssetId
    ? resolveCampaignAssetUrl(heroImageAssetId)
    : null;

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    title: published.siteName,
    description: openGraphDescription,
    type: "website",
    ...(openGraphImageUrl
      ? buildOpenGraphImage(openGraphImageUrl, headline)
      : {}),
  };

  return {
    title: options.preview
      ? `${published.siteName} | Preview`
      : `${published.siteName} | Community activities`,
    description,
    ...(options.preview ? { robots: { index: false, follow: false } } : {}),
    openGraph,
    ...(openGraphImageUrl
      ? {
          twitter: {
            card: "summary_large_image",
            title: published.siteName,
            description: openGraphDescription,
            images: [openGraphImageUrl],
          },
        }
      : {}),
  };
}

export function buildEnvLandingMetadata(): Metadata {
  const config = getSiteLandingConfig();

  return {
    title: `${config.siteName} | Community activities`,
    description: config.description,
    openGraph: {
      title: config.siteName,
      description: config.tagline,
      type: "website",
    },
  };
}

export function buildLoginMetadata(branding: PublishedSiteBranding | null): Metadata {
  if (!branding) {
    return {
      title: `Sign in | ${PLATFORM_NAME}`,
      description:
        "Sign in to Cohestra — the community operator workspace for activities, registrations, client follow-up, and campaigns.",
      openGraph: {
        title: PLATFORM_NAME,
        description: "Turn every community activity into a measurable lead engine.",
        type: "website",
      },
    };
  }

  return {
    title: `Sign in | ${branding.siteName}`,
    description: `Sign in to manage ${branding.siteName} activities, registrations, and community outreach.`,
    openGraph: {
      title: `${branding.siteName} — Operator sign in`,
      description: `Secure operator access for ${branding.siteName}.`,
      type: "website",
      ...(branding.logoUrl ? { images: [{ url: branding.logoUrl, alt: branding.siteName }] } : {}),
    },
  };
}
