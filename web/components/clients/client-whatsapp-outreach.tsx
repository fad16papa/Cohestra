"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { clientProfileCardClassName } from "@/components/clients/client-profile-motion";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  recordWhatsAppFollowUp,
  recordWhatsAppInitiated,
  type ClientDetail,
  type ClientTimelineItem,
} from "@/lib/clients-api";
import { formatPhoneDisplay, toWhatsAppPhoneDigits } from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type ClientWhatsAppOutreachProps = {
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

export function ClientWhatsAppOutreach({
  client,
  onUpdated,
}: ClientWhatsAppOutreachProps) {
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

  const whatsAppPhone = toWhatsAppPhoneDigits(client.phone);
  const whatsAppPhoneLabel = formatPhoneDisplay(client.phone)?.display ?? null;

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
        <h3 className="text-sm font-semibold text-text-warm">WhatsApp outreach</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Open WhatsApp with this client&apos;s number and record follow-up status.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={!whatsAppPhone || busy}
        onClick={() => void handleOpenWhatsApp()}
      >
        Open WhatsApp
      </Button>
      {whatsAppPhoneLabel ? (
        <p className="text-xs text-text-muted-warm">
          Opens chat for{" "}
          <span className="font-medium tabular-nums text-text-warm">
            {whatsAppPhoneLabel}
          </span>
        </p>
      ) : null}

      <div className="space-y-2 border-t border-border-warm pt-4">
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
