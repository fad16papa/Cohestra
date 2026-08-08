"use client";

import { useState } from "react";
import { CalendarClock, Check, Mail, Phone } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { MessengerOpenConfirmDialog } from "@/components/clients/messenger-open-confirm-dialog";
import { PersonAvatar } from "@/components/shared/person-avatar";
import {
  ViberBrandIcon,
  WhatsAppBrandIcon,
} from "@/components/shared/messenger-brand-icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  formatNextFollowUpDate,
  isFollowUpDue,
  leadStatusLabels,
  leadStatusOptions,
  recordViberInitiated,
  recordWhatsAppInitiated,
  updateClientLeadStatus,
  type ClientDetail,
  type LeadStatus,
} from "@/lib/clients-api";
import {
  buildViberAppDeepLink,
  buildWhatsAppWebUrl,
  openAppDeepLink,
} from "@/lib/messenger-links";
import type { MessengerChannel } from "@/lib/messenger-prerequisites";
import { formatPhoneDisplay } from "@/lib/phone-countries";

type ClientProfileHeaderProps = {
  client: ClientDetail;
  timeZoneId?: string | null;
  onUpdated: (client: ClientDetail) => void;
};

export function ClientProfileHeader({
  client,
  timeZoneId,
  onUpdated,
}: ClientProfileHeaderProps) {
  const { authFetch } = useAuth();
  const { showToast, showActionToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [confirmChannel, setConfirmChannel] = useState<MessengerChannel | null>(
    null
  );

  const whatsAppUrl = buildWhatsAppWebUrl(client.phone);
  const viberDeepLink = buildViberAppDeepLink(client.phone);
  const phoneLabel = formatPhoneDisplay(client.phone)?.display ?? null;
  const hasPhone = Boolean(whatsAppUrl);
  const followUpDue = isFollowUpDue(client.nextFollowUpAt, timeZoneId);

  async function handleStatusChange(nextStatus: LeadStatus) {
    if (nextStatus === client.leadStatus) {
      return;
    }

    setStatusSaving(true);
    try {
      const updated = await updateClientLeadStatus(
        authFetch,
        client.id,
        nextStatus
      );
      onUpdated(updated);
      showToast(`Lead status updated to ${leadStatusLabels[nextStatus]}.`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not update lead status."
      );
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleMarkContacted() {
    const previousStatus = client.leadStatus;
    try {
      const updated = await updateClientLeadStatus(
        authFetch,
        client.id,
        "contacted"
      );
      onUpdated(updated);
      showActionToast(`${client.fullName} marked as contacted`, "Undo", () => {
        void updateClientLeadStatus(authFetch, client.id, previousStatus)
          .then(onUpdated)
          .catch(() => showToast("Could not undo status change."));
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not update lead status."
      );
    }
  }

  async function handleOpenWhatsApp() {
    if (!whatsAppUrl) {
      return;
    }

    setBusy(true);
    const whatsAppPopup = window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
    try {
      const updated = await recordWhatsAppInitiated(authFetch, client.id);
      onUpdated(updated);
      if (!whatsAppPopup) {
        showToast("Allow pop-ups to open WhatsApp.");
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Could not log WhatsApp initiation."
      );
    } finally {
      setBusy(false);
      setConfirmChannel(null);
    }
  }

  async function handleOpenViber() {
    if (!viberDeepLink) {
      return;
    }

    setBusy(true);
    try {
      const updated = await recordViberInitiated(authFetch, client.id);
      onUpdated(updated);
      openAppDeepLink(viberDeepLink);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Could not log Viber initiation."
      );
    } finally {
      setBusy(false);
      setConfirmChannel(null);
    }
  }

  function handleConfirmOpenMessenger() {
    if (confirmChannel === "whatsapp") {
      void handleOpenWhatsApp();
      return;
    }

    if (confirmChannel === "viber") {
      void handleOpenViber();
    }
  }

  return (
    <section className="rounded-2xl border border-border-warm bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <PersonAvatar name={client.fullName} size="lg" />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="truncate text-display-sm text-text-warm">
                {client.fullName}
              </h2>
              <LeadStatusBadge status={client.leadStatus} />
              {followUpDue ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <CalendarClock className="size-3" aria-hidden />
                  Follow-up due
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted-warm">
              {phoneLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" aria-hidden />
                  <span className="tabular-nums">{phoneLabel}</span>
                </span>
              ) : null}
              {client.email ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{client.email}</span>
                </span>
              ) : null}
              {!phoneLabel && !client.email ? (
                <span>No contact info on file</span>
              ) : null}
              {client.nextFollowUpAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                  Next follow-up{" "}
                  {formatNextFollowUpDate(client.nextFollowUpAt, timeZoneId)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!hasPhone || busy}
            title={hasPhone ? undefined : "Add a phone number to message"}
            onClick={() => setConfirmChannel("whatsapp")}
            className="gap-1.5 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
          >
            <WhatsAppBrandIcon className="size-3.5" />
            WhatsApp
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!hasPhone || busy}
            title={hasPhone ? undefined : "Add a phone number to message"}
            onClick={() => setConfirmChannel("viber")}
            className="gap-1.5 bg-viber text-viber-foreground hover:bg-viber/90"
          >
            <ViberBrandIcon className="size-3.5" />
            Viber
          </Button>
          {client.leadStatus === "new" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleMarkContacted()}
            >
              <Check className="size-3.5" aria-hidden />
              Mark contacted
            </Button>
          ) : null}
          <label htmlFor="client-lead-status" className="sr-only">
            Lead status
          </label>
          <select
            id="client-lead-status"
            value={client.leadStatus}
            disabled={statusSaving}
            onChange={(event) => {
              void handleStatusChange(event.target.value as LeadStatus);
            }}
            className="flex h-8 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            {leadStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <MessengerOpenConfirmDialog
        channel={confirmChannel}
        clientPhoneLabel={phoneLabel}
        open={confirmChannel !== null}
        busy={busy}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setConfirmChannel(null);
          }
        }}
        onConfirm={() => handleConfirmOpenMessenger()}
      />
    </section>
  );
}
