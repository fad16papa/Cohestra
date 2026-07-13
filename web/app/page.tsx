import type { Metadata } from "next";

import { SiteLandingPage } from "@/components/marketing/site-landing-page";
import { SitePageRenderer } from "@/components/marketing/site-page-renderer";
import {
  buildEnvLandingMetadata,
  buildPublishedSiteMetadata,
} from "@/lib/site-seo-metadata";
import {
  fetchPreviewSiteServer,
  fetchPublicSiteServer,
} from "@/lib/public-site-api";

type HomePageProps = {
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const previewToken = params.preview?.trim();

  if (previewToken) {
    const previewSite = await fetchPreviewSiteServer(previewToken);
    if (previewSite) {
      return buildPublishedSiteMetadata(previewSite, { preview: true });
    }
  }

  const publishedSite = await fetchPublicSiteServer();
  if (publishedSite) {
    return buildPublishedSiteMetadata(publishedSite);
  }

  return buildEnvLandingMetadata();
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const previewToken = params.preview?.trim();

  if (previewToken) {
    const previewSite = await fetchPreviewSiteServer(previewToken);
    if (previewSite) {
      return <SitePageRenderer site={previewSite} isPreview />;
    }
  }

  const publishedSite = await fetchPublicSiteServer();
  if (publishedSite) {
    return <SitePageRenderer site={publishedSite} />;
  }

  return <SiteLandingPage />;
}
