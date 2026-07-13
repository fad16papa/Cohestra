import type { Metadata } from "next";
import { cache } from "react";

import { getPublicApiBaseUrl } from "@/lib/api";
import { PLATFORM_NAME } from "@/lib/brand-assets";
import { getSiteLandingConfig } from "@/lib/site-landing-config";
import {
  fetchPublicSiteServer,
  readHeroDescription,
  readHeroHeadline,
  readHeroImageAssetId,
  type PublicSitePayload,
} from "@/lib/public-site-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

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
