"use client";

import { Clock, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  leadStatusLabels,
  recordWhatsAppInitiated,
  updateClientLeadStatus,
  type ClientDetail,
} from "@/lib/clients-api";
import { formatPhoneDisplay, toWhatsAppPhoneDigits } from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type ClientFollowUpPanelProps = {
  client: ClientDetail;
  onUpdated: (client: ClientDetail) => void;
  className?: string;
};

function formatLatestRegistration(client: ClientDetail): string | null {
  const latest = client.registrationHistory[0];
  if (!latest) {
    return null;
  }

  const registeredAt = new Date(latest.registeredAt);
  if (Number.isNaN(registeredAt.getTime())) {
    return latest.activityName;
  }

  const dateLabel = registeredAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return `${latest.activityName} · ${dateLabel}`;
}

export function ClientFollowUpPanel({
  client,
  onUpdated,
  className,
}: ClientFollowUpPanelProps) {
  const { authFetch } = useAuth();
  const { showToast, showActionToast } = useToast();
  const [busy, setBusy] = useState(false);

  const whatsAppPhone = toWhatsAppPhoneDigits(client.phone);
  const phoneLabel = formatPhoneDisplay(client.phone)?.display ?? null;
  const latestRegistration = formatLatestRegistration(client);
  const needsFollowUp = client.leadStatus === "new";

  async function handleMarkContacted() {
    if (client.leadStatus === "contacted") {
      return;
    }

    const previousStatus = client.leadStatus;
    setBusy(true);

    try {
      const updated = await updateClientLeadStatus(authFetch, client.id, "contacted");
      onUpdated(updated);
      showActionToast(
        `${client.fullName} marked as contacted`,
        "Undo",
        () => {
          void updateClientLeadStatus(authFetch, client.id, previousStatus)
            .then(onUpdated)
            .catch(() => showToast("Could not undo status change."));
        }
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not update lead status."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenWhatsApp() {
    if (!whatsAppPhone) {
      showToast("This client has no phone number on file.");
      return;
    }

    setBusy(true);
    try {
      const updated = await recordWhatsAppInitiated(authFetch, client.id);
      onUpdated(updated);
      window.open(`https://wa.me/${whatsAppPhone}`, "_blank", "noopener,noreferrer");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not log WhatsApp initiation."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-border-warm bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm",
        className
      )}
      aria-labelledby="client-follow-up-heading"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p
            id="client-follow-up-heading"
            className="text-xs font-medium uppercase tracking-wide text-text-muted-warm"
          >
            Follow-up
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <LeadStatusBadge status={client.leadStatus} />
            {needsFollowUp ? (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                Needs outreach
              </span>
            ) : null}
          </div>
          {latestRegistration ? (
            <p className="flex items-center gap-2 text-sm text-text-muted-warm">
              <Clock className="size-4 shrink-0" aria-hidden />
              Last registration: {latestRegistration}
            </p>
          ) : (
            <p className="text-sm text-text-muted-warm">No registrations recorded yet.</p>
          )}
          {phoneLabel ? (
            <p className="flex items-center gap-2 text-sm text-text-muted-warm">
              <Phone className="size-4 shrink-0" aria-hidden />
              {phoneLabel}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {needsFollowUp ? (
            <Button
              type="button"
              disabled={busy}
              className="gap-2"
              onClick={() => void handleMarkContacted()}
            >
              <MessageCircle className="size-4" aria-hidden />
              Mark contacted
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={!whatsAppPhone || busy}
            onClick={() => void handleOpenWhatsApp()}
          >
            Open WhatsApp
          </Button>
        </div>
      </div>

      {needsFollowUp ? (
        <p className="mt-4 text-xs text-text-muted-warm">
          Tip: Mark as {leadStatusLabels.contacted.toLowerCase()} after your first touch — it
          improves follow-up coverage on your dashboard.
        </p>
      ) : null}
    </section>
  );
}
