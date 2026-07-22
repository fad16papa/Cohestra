import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteLandingPage } from "@/components/marketing/site-landing-page";
import { SitePageRenderer } from "@/components/marketing/site-page-renderer";
import { StubHome } from "@/components/public/stub-home";
import { TenantMaintenancePage } from "@/components/public/tenant-maintenance-page";
import { fetchPublicDoorServer } from "@/lib/public-door-api";
import {
  buildEnvLandingMetadata,
  buildPublishedSiteMetadata,
} from "@/lib/site-seo-metadata";

type HomePageProps = {
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  if (params.preview?.trim()) {
    return buildEnvLandingMetadata();
  }

  const door = await fetchPublicDoorServer();
  if (door.kind === "active" && door.site) {
    return buildPublishedSiteMetadata({
      published: door.site.published,
      publishedAt: door.site.publishedAt,
      upcomingActivities: door.site.upcomingActivities,
    });
  }

  if (door.kind === "active" && door.tenantName) {
    return { title: door.tenantName };
  }

  return buildEnvLandingMetadata();
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  if (params.preview?.trim()) {
    return <SiteLandingPage />;
  }

  const door = await fetchPublicDoorServer();

  switch (door.kind) {
    case "marketing":
      return <SiteLandingPage />;
    case "suspended":
      return <TenantMaintenancePage tenantName={door.tenantName} />;
    case "archived":
    case "unknown":
      notFound();
    case "active":
      if (door.plan === "Basic") {
        return (
          <StubHome
            tenantName={door.tenantName ?? "Workspace"}
            activities={door.stubActivities}
          />
        );
      }

      if (door.site) {
        return <SitePageRenderer site={door.site} />;
      }

      return (
        <StubHome
          tenantName={door.tenantName ?? "Workspace"}
          activities={door.stubActivities}
        />
      );
    default:
      notFound();
  }
}
