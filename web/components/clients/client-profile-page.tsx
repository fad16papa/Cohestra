"use client";

import { useCallback, useEffect, useState } from "react";

import { ClientFollowUpPanel } from "@/components/clients/client-follow-up-panel";
import { ClientWhatsAppOutreach } from "@/components/clients/client-whatsapp-outreach";
import { ClientLeadStatusControl } from "@/components/clients/client-lead-status-control";
import { ClientMergeSuspectBanner } from "@/components/clients/client-merge-suspect-banner";
import { ClientMasterFields } from "@/components/clients/client-master-fields";
import { ClientProfileSection } from "@/components/clients/client-profile-motion";
import { ClientRegistrationHistory } from "@/components/clients/client-registration-history";
import { ClientRelationshipTimeline } from "@/components/clients/client-relationship-timeline";
import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { useAdminPageMeta } from "@/components/layouts/admin-shell-context";
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

  function handleLeadStatusUpdated(nextClient: ClientDetail) {
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

  return (
    <div className="space-y-6">
      <ClientProfileSection animationDelayMs={0}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <PersonAvatar name={client.fullName} size="md" />
              <h2 className="text-display-sm text-text-warm">{client.fullName}</h2>
              <LeadStatusBadge status={client.leadStatus} />
            </div>
            <p className="text-sm text-text-muted-warm">
              Master profile, registration answers, and relationship timeline.
            </p>
          </div>
          <ClientLeadStatusControl
            clientId={client.id}
            leadStatus={client.leadStatus}
            onUpdated={handleLeadStatusUpdated}
          />
        </div>
      </ClientProfileSection>

      <ClientProfileSection animationDelayMs={20}>
        <ClientFollowUpPanel client={client} onUpdated={setClient} />
      </ClientProfileSection>

      {client.isMergeSuspect ? (
        <ClientProfileSection animationDelayMs={40}>
          <ClientMergeSuspectBanner />
        </ClientProfileSection>
      ) : null}

      <div className="space-y-6">
        <ClientProfileSection animationDelayMs={80}>
          <ClientMasterFields
            client={client}
            onUpdated={handleLeadStatusUpdated}
          />
        </ClientProfileSection>
        <ClientProfileSection animationDelayMs={120}>
          <ClientRegistrationHistory history={client.registrationHistory} />
        </ClientProfileSection>
      </div>

      <ClientProfileSection animationDelayMs={160}>
        <ClientWhatsAppOutreach client={client} onUpdated={setClient} />
      </ClientProfileSection>

      <ClientProfileSection animationDelayMs={200}>
        <ClientRelationshipTimeline timeline={client.timeline} />
      </ClientProfileSection>
    </div>
  );
}
