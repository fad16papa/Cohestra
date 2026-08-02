"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { clientProfileCardClassName } from "@/components/clients/client-profile-motion";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  recordViberInitiated,
  recordWhatsAppFollowUp,
  recordWhatsAppInitiated,
  type ClientDetail,
  type ClientTimelineItem,
} from "@/lib/clients-api";
import { formatPhoneDisplay } from "@/lib/phone-countries";
import {
  buildViberAppDeepLink,
  buildWhatsAppWebUrl,
  openAppDeepLink,
} from "@/lib/messenger-links";
import { cn } from "@/lib/utils";

type ClientMessengerOutreachProps = {
  client: ClientDetail;
  onUpdated: (client: ClientDetail) => void;
};

type FollowUpStatus = "contacted" | "awaiting_reply";

type FollowUpFormBaseline = {
  status: FollowUpStatus;
  note: string;
};

function parseFollowUpStatusFromTimeline(
  subject: string | null | undefined
): FollowUpStatus | null {
  if (!subject) {
    return null;
  }

  const normalized = subject.trim().toLowerCase();
  if (normalized === "contacted") {
    return "contacted";
  }

  if (normalized === "awaiting reply") {
    return "awaiting_reply";
  }

  return null;
}

function getLatestFollowUpStatus(client: ClientDetail): FollowUpStatus {
  const latestFollowUp = client.timeline.find(
    (item: ClientTimelineItem) => item.eventType === "whatsapp_follow_up_recorded"
  );

  return (
    parseFollowUpStatusFromTimeline(latestFollowUp?.campaignSubject) ?? "contacted"
  );
}

function createFollowUpBaseline(client: ClientDetail): FollowUpFormBaseline {
  return {
    status: getLatestFollowUpStatus(client),
    note: "",
  };
}

export function ClientMessengerOutreach({
  client,
  onUpdated,
}: ClientMessengerOutreachProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [baseline, setBaseline] = useState<FollowUpFormBaseline>(() =>
    createFollowUpBaseline(client)
  );
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>(
    () => baseline.status
  );
  const [followUpNote, setFollowUpNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const nextBaseline = createFollowUpBaseline(client);
    setBaseline(nextBaseline);
    setFollowUpStatus(nextBaseline.status);
    setFollowUpNote("");
  }, [client.id]);

  const trimmedNote = followUpNote.trim();
  const isDirty =
    followUpStatus !== baseline.status || trimmedNote !== baseline.note;
  const canSaveFollowUp = isDirty && !busy;

  const whatsAppUrl = buildWhatsAppWebUrl(client.phone);
  const viberDeepLink = buildViberAppDeepLink(client.phone);
  const phoneLabel = formatPhoneDisplay(client.phone)?.display ?? null;
  const hasPhone = Boolean(whatsAppUrl);

  async function handleOpenWhatsApp() {
    if (!whatsAppUrl) {
      showToast("This client has no phone number on file.");
      return;
    }

    setBusy(true);
    try {
      const updated = await recordWhatsAppInitiated(authFetch, client.id);
      onUpdated(updated);
      window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not log WhatsApp initiation."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenViber() {
    if (!viberDeepLink) {
      showToast("This client has no phone number on file.");
      return;
    }

    setBusy(true);
    try {
      const updated = await recordViberInitiated(authFetch, client.id);
      onUpdated(updated);
      openAppDeepLink(viberDeepLink);
      showToast(
        "Opening Viber… If nothing happens, install Viber desktop or use the mobile app."
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not log Viber initiation."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordFollowUp() {
    if (!canSaveFollowUp || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setBusy(true);
    try {
      const updated = await recordWhatsAppFollowUp(authFetch, client.id, {
        status: followUpStatus,
        note: trimmedNote || undefined,
      });
      onUpdated(updated);
      const nextBaseline = { status: followUpStatus, note: "" };
      setBaseline(nextBaseline);
      setFollowUpNote("");
      showToast("WhatsApp follow-up recorded.");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not record follow-up."
      );
    } finally {
      setBusy(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border-warm bg-card p-4",
        clientProfileCardClassName
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-text-warm">Messenger outreach</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Open WhatsApp or Viber with this client&apos;s number. Record WhatsApp
          follow-up status below.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          disabled={!hasPhone || busy}
          onClick={() => void handleOpenWhatsApp()}
          className="w-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 sm:flex-1"
        >
          Open WhatsApp
        </Button>
        <Button
          type="button"
          disabled={!hasPhone || busy}
          onClick={() => void handleOpenViber()}
          className="w-full bg-viber text-viber-foreground hover:bg-viber/90 sm:flex-1"
        >
          Open Viber
        </Button>
      </div>

      {phoneLabel ? (
        <p className="text-xs text-text-muted-warm">
          Opens chat for{" "}
          <span className="font-medium tabular-nums text-text-warm">
            {phoneLabel}
          </span>
        </p>
      ) : (
        <p className="text-xs text-text-muted-warm">
          Add a phone number to enable messenger outreach.
        </p>
      )}

      <div className="space-y-2 border-t border-border-warm pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          WhatsApp follow-up
        </p>
        <Label htmlFor="whatsapp-follow-up-status">Record follow-up status</Label>
        <select
          id="whatsapp-follow-up-status"
          value={followUpStatus}
          disabled={busy}
          onChange={(event) =>
            setFollowUpStatus(event.target.value as FollowUpStatus)
          }
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="contacted">Contacted</option>
          <option value="awaiting_reply">Awaiting reply</option>
        </select>
        <Label htmlFor="whatsapp-follow-up-note">Optional note</Label>
        <Input
          id="whatsapp-follow-up-note"
          value={followUpNote}
          disabled={busy}
          onChange={(event) => setFollowUpNote(event.target.value)}
          placeholder="Brief follow-up note"
        />
        <Button
          type="button"
          disabled={!canSaveFollowUp}
          onClick={() => void handleRecordFollowUp()}
        >
          Save follow-up status
        </Button>
        {!isDirty ? (
          <p className="text-xs text-text-muted-warm">
            Change the status or add a note to record a new follow-up.
          </p>
        ) : null}
      </div>
    </div>
  );
}
