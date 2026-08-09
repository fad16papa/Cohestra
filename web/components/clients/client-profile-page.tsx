"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ClientFollowUpDateField,
  type ClientFollowUpDateFieldHandle,
} from "@/components/clients/client-follow-up-date-field";
import { ClientMergeSuspectBanner } from "@/components/clients/client-merge-suspect-banner";
import { ClientMasterFields } from "@/components/clients/client-master-fields";
import {
  ClientOutreachLogCard,
  type OutreachLogStatus,
} from "@/components/clients/client-outreach-log-card";
import { ClientProfileHeader } from "@/components/clients/client-profile-header";
import { ClientProfileSection } from "@/components/clients/client-profile-motion";
import { ClientRegistrationHistory } from "@/components/clients/client-registration-history";
import { ClientRelationshipTimeline } from "@/components/clients/client-relationship-timeline";
import { useAdminPageMeta } from "@/components/layouts/admin-shell-context";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { ProfileSkeleton } from "@/components/shared/profile-skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  addDaysToDateInputValue,
  toDateInputValue,
} from "@/lib/client-follow-up-date";
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
  const { showActionToast, showSuccessToast } = useToast();
  const followUpDateRef = useRef<ClientFollowUpDateFieldHandle>(null);
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

  const handleOutreachSaved = useCallback(
    ({
      client: updatedClient,
      status,
    }: {
      client: ClientDetail;
      status: OutreachLogStatus;
    }) => {
      const timeZoneId = shell?.registrationTimeZoneId;
      const shouldNudge =
        !updatedClient.nextFollowUpAt || status === "awaiting_reply";

      if (!shouldNudge) {
        showSuccessToast("Outreach log saved.");
        return;
      }

      showActionToast("Outreach logged.", "Set follow-up date", () => {
        if (!updatedClient.nextFollowUpAt && status === "awaiting_reply") {
          followUpDateRef.current?.focusAndSuggestDate(
            addDaysToDateInputValue(3, timeZoneId)
          );
          return;
        }

        if (!updatedClient.nextFollowUpAt) {
          followUpDateRef.current?.focusAndSuggestDate("");
          return;
        }

        followUpDateRef.current?.focusAndSuggestDate(
          toDateInputValue(updatedClient.nextFollowUpAt, timeZoneId)
        );
      });
    },
    [shell?.registrationTimeZoneId, showActionToast, showSuccessToast]
  );

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
  const collapseTimeline = client.timeline.length >= 5;
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

      <ClientProfileSection animationDelayMs={40}>
        <ClientMasterFields client={client} onUpdated={handleUpdated} />
      </ClientProfileSection>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-start">
        <div className="min-w-0 space-y-5">
          <ClientProfileSection animationDelayMs={60}>
            <ClientRegistrationHistory
              history={client.registrationHistory}
              defaultCollapsed={collapseRegistrationHistory}
            />
          </ClientProfileSection>

          <ClientProfileSection animationDelayMs={100}>
            <ClientRelationshipTimeline
              timeline={client.timeline}
              defaultCollapsed={collapseTimeline}
            />
          </ClientProfileSection>
        </div>

        <div className="min-w-0 space-y-5">
          <ClientProfileSection animationDelayMs={80}>
            <ClientFollowUpDateField
              ref={followUpDateRef}
              client={client}
              timeZoneId={timeZoneId}
              onUpdated={handleUpdated}
            />
          </ClientProfileSection>

          <ClientProfileSection animationDelayMs={120}>
            <ClientOutreachLogCard
              client={client}
              onUpdated={handleUpdated}
              onOutreachSaved={handleOutreachSaved}
            />
          </ClientProfileSection>
        </div>
      </div>
    </div>
  );
}
