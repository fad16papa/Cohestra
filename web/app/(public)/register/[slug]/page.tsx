import { PublicRegistrationOpen } from "@/components/registration/public-registration-open";
import { PublicRegistrationUnavailable } from "@/components/registration/public-registration-unavailable";
import { fetchPublicActivityBySlugServer } from "@/lib/public-registration-server-api";

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
    />
  );
}
