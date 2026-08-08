"use client";

import { useCallback, useEffect, useState } from "react";

import { ClientFollowUpDateField } from "@/components/clients/client-follow-up-date-field";
import { ClientMergeSuspectBanner } from "@/components/clients/client-merge-suspect-banner";
import { ClientMasterFields } from "@/components/clients/client-master-fields";
import { ClientOutreachBar } from "@/components/clients/client-outreach-bar";
import { ClientProfileSection } from "@/components/clients/client-profile-motion";
import { ClientRegistrationHistory } from "@/components/clients/client-registration-history";
import { ClientRelationshipTimeline } from "@/components/clients/client-relationship-timeline";
import { ClientTimelinePreview } from "@/components/clients/client-timeline-preview";
import { useAdminPageMeta } from "@/components/layouts/admin-shell-context";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
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

  return (
    <div className="space-y-6">
      <ClientProfileSection animationDelayMs={0}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <PersonAvatar name={client.fullName} size="md" />
              <h2 className="text-display-sm text-text-warm">{client.fullName}</h2>
            </div>
            <p className="text-sm text-text-muted-warm">
              Act first — outreach and timeline above registration details.
            </p>
          </div>
        </div>
      </ClientProfileSection>

      {client.isMergeSuspect ? (
        <ClientProfileSection animationDelayMs={20}>
          <ClientMergeSuspectBanner />
        </ClientProfileSection>
      ) : null}

      <ClientProfileSection animationDelayMs={40}>
        <ClientOutreachBar client={client} onUpdated={handleUpdated} />
      </ClientProfileSection>

      <ClientProfileSection animationDelayMs={60}>
        <ClientFollowUpDateField
          client={client}
          timeZoneId={shell?.registrationTimeZoneId}
          onUpdated={handleUpdated}
        />
      </ClientProfileSection>

      <ClientProfileSection animationDelayMs={80}>
        <ClientTimelinePreview timeline={client.timeline} />
      </ClientProfileSection>

      <ClientProfileSection animationDelayMs={120}>
        <ClientMasterFields client={client} onUpdated={handleUpdated} />
      </ClientProfileSection>

      <ClientProfileSection animationDelayMs={160}>
        <ClientRegistrationHistory
          history={client.registrationHistory}
          defaultCollapsed={collapseRegistrationHistory}
        />
      </ClientProfileSection>

      <ClientProfileSection animationDelayMs={200}>
        <div id="client-full-timeline">
          <ClientRelationshipTimeline timeline={client.timeline} />
        </div>
      </ClientProfileSection>
    </div>
  );
}
