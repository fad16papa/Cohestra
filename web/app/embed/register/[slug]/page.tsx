import type { Metadata } from "next";

import { EmbedHeightReporter } from "@/components/registration/embed-height-reporter";
import { PublicRegistrationOpen } from "@/components/registration/public-registration-open";
import { PublicRegistrationUnavailable } from "@/components/registration/public-registration-unavailable";
import { fetchPublicActivityBySlugServer } from "@/lib/public-registration-server-api";

type EmbedRegisterPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EmbedRegisterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchPublicActivityBySlugServer(slug);

  if (result.kind !== "ok") {
    return {
      title: "Registration embed unavailable",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Register — ${result.activity.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function EmbedRegisterPage({ params }: EmbedRegisterPageProps) {
  const { slug } = await params;
  const result = await fetchPublicActivityBySlugServer(slug);

  if (result.kind === "not-found") {
    return (
      <EmbedHeightReporter>
        <PublicRegistrationUnavailable slug={slug} reason="not-found" />
      </EmbedHeightReporter>
    );
  }

  if (result.kind === "error") {
    return (
      <EmbedHeightReporter>
        <PublicRegistrationUnavailable slug={slug} reason="error" />
      </EmbedHeightReporter>
    );
  }

  const { activity } = result;

  if (!activity.isRegistrationOpen) {
    return (
      <EmbedHeightReporter>
        <PublicRegistrationUnavailable
          slug={slug}
          activityName={activity.name}
          reason="unavailable"
        />
      </EmbedHeightReporter>
    );
  }

  if (activity.isRegistrationPaused) {
    return (
      <EmbedHeightReporter>
        <PublicRegistrationUnavailable
          slug={slug}
          activityName={activity.name}
          reason="plan-limit"
        />
      </EmbedHeightReporter>
    );
  }

  if (activity.isRegistrationFull) {
    return (
      <EmbedHeightReporter>
        <PublicRegistrationUnavailable
          slug={slug}
          activityName={activity.name}
          reason="full"
        />
      </EmbedHeightReporter>
    );
  }

  return (
    <EmbedHeightReporter>
      <div className="px-4 py-5 sm:px-6">
        <PublicRegistrationOpen
          slug={activity.slug}
          name={activity.name}
          schedule={activity.schedule}
          location={activity.location}
          communityLabel={activity.communityLabel}
          heroImageUrl={activity.heroImageUrl}
          accentColor={activity.accentColor}
          logoAssetId={activity.logoAssetId}
          preset="compact"
          formSchema={activity.formSchema}
          variant="embed"
        />
      </div>
    </EmbedHeightReporter>
  );
}
