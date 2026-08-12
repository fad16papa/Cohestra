import type { Metadata } from "next";

import { PublicRegistrationOpen } from "@/components/registration/public-registration-open";
import { PublicRegistrationUnavailable } from "@/components/registration/public-registration-unavailable";
import { fetchPublicDoorServer } from "@/lib/public-door-api";
import { fetchPublicActivityBySlugServer } from "@/lib/public-registration-server-api";
import { buildPublisherWebsiteLink } from "@/lib/publisher-website-url";
import { getRequestOrigin } from "@/lib/request-origin";
import { buildActivityRegistrationMetadata } from "@/lib/site-seo-metadata";

type PublicRegistrationPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicRegistrationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [result, origin] = await Promise.all([
    fetchPublicActivityBySlugServer(slug),
    getRequestOrigin(),
  ]);

  if (result.kind !== "ok") {
    return {
      title: "Registration unavailable",
      robots: { index: false, follow: false },
    };
  }

  const indexable =
    result.activity.isRegistrationOpen && result.activity.status === "published";

  return buildActivityRegistrationMetadata(result.activity, origin, {
    indexable,
  });
}

export default async function PublicRegistrationPage({
  params,
}: PublicRegistrationPageProps) {
  const { slug } = await params;
  const result = await fetchPublicActivityBySlugServer(slug);

  if (result.kind === "not-found") {
    return <PublicRegistrationUnavailable slug={slug} reason="not-found" />;
  }

  if (result.kind === "error") {
    return <PublicRegistrationUnavailable slug={slug} reason="error" />;
  }

  const { activity } = result;
  const [door, origin] = await Promise.all([fetchPublicDoorServer(), getRequestOrigin()]);
  const websiteLink = origin ? buildPublisherWebsiteLink(door, origin) : null;

  if (!activity.isRegistrationOpen) {
    return (
      <PublicRegistrationUnavailable
        slug={slug}
        activityName={activity.name}
        reason="unavailable"
      />
    );
  }

  if (activity.isRegistrationPaused) {
    return (
      <PublicRegistrationUnavailable
        slug={slug}
        activityName={activity.name}
        reason="plan-limit"
      />
    );
  }

  if (activity.isRegistrationFull) {
    return (
      <PublicRegistrationUnavailable
        slug={slug}
        activityName={activity.name}
        reason="full"
      />
    );
  }

  return (
    <PublicRegistrationOpen
      slug={activity.slug}
      name={activity.name}
      schedule={activity.schedule}
      location={activity.location}
      communityLabel={activity.communityLabel}
      heroImageUrl={activity.heroImageUrl}
      accentColor={activity.accentColor}
      logoAssetId={activity.logoAssetId}
      preset={activity.preset}
      formSchema={activity.formSchema}
      websiteLink={websiteLink}
    />
  );
}
