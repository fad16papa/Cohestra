"use client";

import { useCallback, useEffect, useState } from "react";

import { ClientFollowUpDateField } from "@/components/clients/client-follow-up-date-field";
import { ClientMergeSuspectBanner } from "@/components/clients/client-merge-suspect-banner";
import { ClientMasterFields } from "@/components/clients/client-master-fields";
import { ClientOutreachLogCard } from "@/components/clients/client-outreach-log-card";
import { ClientProfileHeader } from "@/components/clients/client-profile-header";
import { ClientProfileSection } from "@/components/clients/client-profile-motion";
import { ClientRegistrationHistory } from "@/components/clients/client-registration-history";
import { ClientRelationshipTimeline } from "@/components/clients/client-relationship-timeline";
import { ClientTimelinePreview } from "@/components/clients/client-timeline-preview";
import { useAdminPageMeta } from "@/components/layouts/admin-shell-context";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { ProfileSkeleton } from "@/components/shared/profile-skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import {
  fetchClientById,
  type ClientDetail,
} from "@/lib/clients-api";

type ClientProfilePageProps = {
  id: string;
};

export function ClientProfilePage({ id }: ClientProfilePageProps) {
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useAdminPageMeta(
    client
      ? { title: client.fullName, breadcrumbTail: client.fullName }
      : null
  );

  const loadClient = useCallback(() => {
    let cancelled = false;

    void fetchClientById(authFetch, id)
      .then((result) => {
        if (!cancelled) {
          setClient(result);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load client profile."
          );
          setClient(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, id]);

  useEffect(() => {
    return loadClient();
  }, [loadClient, reloadToken]);

  function handleUpdated(nextClient: ClientDetail) {
    setClient(nextClient);
  }

  function handleRetry() {
    setError(null);
    setReloadToken((current) => current + 1);
  }

  if (error) {
    return (
      <ProductErrorState
        message={error}
        onRetry={handleRetry}
        backHref="/clients"
        backLabel="Back to clients"
      />
    );
  }

  if (!client) {
    return <ProfileSkeleton />;
  }

  const collapseRegistrationHistory = client.registrationHistory.length >= 10;
  const timeZoneId = shell?.registrationTimeZoneId;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <ClientProfileSection animationDelayMs={0}>
        <ClientProfileHeader
          client={client}
          timeZoneId={timeZoneId}
          onUpdated={handleUpdated}
        />
      </ClientProfileSection>

      {client.isMergeSuspect ? (
        <ClientProfileSection animationDelayMs={20}>
          <ClientMergeSuspectBanner />
        </ClientProfileSection>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-start">
        <div className="min-w-0 space-y-5">
          <ClientProfileSection animationDelayMs={40}>
            <ClientTimelinePreview timeline={client.timeline} />
          </ClientProfileSection>

          <ClientProfileSection animationDelayMs={80}>
            <ClientRegistrationHistory
              history={client.registrationHistory}
              defaultCollapsed={collapseRegistrationHistory}
            />
          </ClientProfileSection>

          <ClientProfileSection animationDelayMs={120}>
            <div id="client-full-timeline">
              <ClientRelationshipTimeline timeline={client.timeline} />
            </div>
          </ClientProfileSection>
        </div>

        <div className="min-w-0 space-y-5">
          <ClientProfileSection animationDelayMs={60}>
            <ClientFollowUpDateField
              client={client}
              timeZoneId={timeZoneId}
              onUpdated={handleUpdated}
            />
          </ClientProfileSection>

          <ClientProfileSection animationDelayMs={100}>
            <ClientOutreachLogCard client={client} onUpdated={handleUpdated} />
          </ClientProfileSection>

          <ClientProfileSection animationDelayMs={140}>
            <ClientMasterFields
              client={client}
              onUpdated={handleUpdated}
              compact
            />
          </ClientProfileSection>
        </div>
      </div>
    </div>
  );
}
