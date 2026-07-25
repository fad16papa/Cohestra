import { PublicRegistrationOpen } from "@/components/registration/public-registration-open";
import { PublicRegistrationUnavailable } from "@/components/registration/public-registration-unavailable";
import { fetchPublicDoorServer } from "@/lib/public-door-api";
import { fetchPublicActivityBySlugServer } from "@/lib/public-registration-server-api";
import { buildPublisherWebsiteLink } from "@/lib/publisher-website-url";
import { getRequestOrigin } from "@/lib/request-origin";

type PublicRegistrationPageProps = {
  params: Promise<{ slug: string }>;
};

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

  return (
    <PublicRegistrationOpen
      slug={activity.slug}
      name={activity.name}
      schedule={activity.schedule}
      location={activity.location}
      communityLabel={activity.communityLabel}
      heroImageUrl={activity.heroImageUrl}
      accentColor={activity.accentColor}
      formSchema={activity.formSchema}
      websiteLink={websiteLink}
    />
  );
}
