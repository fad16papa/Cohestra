"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  recordViberFollowUp,
  recordWhatsAppFollowUp,
  type ClientDetail,
  type ClientTimelineItem,
} from "@/lib/clients-api";
import type { OutreachLogStatus } from "@/lib/client-follow-up-date";
import { cn } from "@/lib/utils";

export type { OutreachLogStatus };

export type OutreachChannel = "whatsapp" | "viber";

type ChannelDraft = {
  status: OutreachLogStatus;
  note: string;
};

type ChannelDrafts = Record<OutreachChannel, ChannelDraft | null>;

type ClientOutreachLogCardProps = {
  client: ClientDetail;
  onUpdated: (client: ClientDetail) => void;
  onOutreachSaved?: (payload: {
    client: ClientDetail;
    status: OutreachLogStatus;
  }) => void;
};

const followUpEventTypeByChannel: Record<
  OutreachChannel,
  ClientTimelineItem["eventType"]
> = {
  whatsapp: "whatsapp_follow_up_recorded",
  viber: "viber_follow_up_recorded",
};

function emptyChannelDrafts(): ChannelDrafts {
  return { whatsapp: null, viber: null };
}

function parseOutreachStatusFromTimeline(
  subject: string | null | undefined
): OutreachLogStatus | null {
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

function getLatestFollowUpEvent(
  client: ClientDetail,
  channel: OutreachChannel
): ClientTimelineItem | undefined {
  const eventType = followUpEventTypeByChannel[channel];

  return client.timeline
    .filter((item: ClientTimelineItem) => item.eventType === eventType)
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime()
    )[0];
}

function getLatestOutreachStatus(
  client: ClientDetail,
  channel: OutreachChannel
): OutreachLogStatus {
  const latestFollowUp = getLatestFollowUpEvent(client, channel);

  return (
    parseOutreachStatusFromTimeline(latestFollowUp?.campaignSubject) ??
    "contacted"
  );
}

function getLatestOutreachNote(
  client: ClientDetail,
  channel: OutreachChannel
): string {
  return getLatestFollowUpEvent(client, channel)?.note?.trim() ?? "";
}

function getDefaultOutreachChannel(client: ClientDetail): OutreachChannel {
  const latestWhatsApp = client.timeline
    .filter((item) => item.eventType === "whatsapp_initiated")
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime()
    )[0];
  const latestViber = client.timeline
    .filter((item) => item.eventType === "viber_initiated")
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime()
    )[0];

  if (!latestWhatsApp && !latestViber) {
    return "whatsapp";
  }

  if (!latestWhatsApp) {
    return "viber";
  }

  if (!latestViber) {
    return "whatsapp";
  }

  const whatsappTime = new Date(latestWhatsApp.occurredAt).getTime();
  const viberTime = new Date(latestViber.occurredAt).getTime();

  return viberTime > whatsappTime ? "viber" : "whatsapp";
}

function resolveChannelForm(
  client: ClientDetail,
  channel: OutreachChannel,
  draft: ChannelDraft | null
): {
  outreachStatus: OutreachLogStatus;
  outreachNote: string;
  baselineStatus: OutreachLogStatus;
  baselineNote: string;
} {
  const baselineStatus = getLatestOutreachStatus(client, channel);
  const baselineNote = getLatestOutreachNote(client, channel);

  if (draft) {
    return {
      outreachStatus: draft.status,
      outreachNote: draft.note,
      baselineStatus,
      baselineNote,
    };
  }

  return {
    outreachStatus: baselineStatus,
    outreachNote: "",
    baselineStatus,
    baselineNote,
  };
}

export function ClientOutreachLogCard({
  client,
  onUpdated,
  onOutreachSaved,
}: ClientOutreachLogCardProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const initialChannel = getDefaultOutreachChannel(client);
  const initialForm = resolveChannelForm(client, initialChannel, null);
  const [channel, setChannel] = useState<OutreachChannel>(initialChannel);
  const [channelDrafts, setChannelDrafts] = useState<ChannelDrafts>(
    emptyChannelDrafts
  );
  const [baselineStatus, setBaselineStatus] = useState<OutreachLogStatus>(
    initialForm.baselineStatus
  );
  const [baselineNote, setBaselineNote] = useState(initialForm.baselineNote);
  const [outreachStatus, setOutreachStatus] = useState<OutreachLogStatus>(
    initialForm.outreachStatus
  );
  const [outreachNote, setOutreachNote] = useState(initialForm.outreachNote);
  const [busy, setBusy] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const nextChannel = getDefaultOutreachChannel(client);
    const nextForm = resolveChannelForm(client, nextChannel, null);
    setChannelDrafts(emptyChannelDrafts());
    setChannel(nextChannel);
    setBaselineStatus(nextForm.baselineStatus);
    setBaselineNote(nextForm.baselineNote);
    setOutreachStatus(nextForm.outreachStatus);
    setOutreachNote(nextForm.outreachNote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  function handleChannelChange(nextChannel: OutreachChannel) {
    if (nextChannel === channel) {
      return;
    }

    const nextDrafts: ChannelDrafts = {
      ...channelDrafts,
      [channel]: {
        status: outreachStatus,
        note: outreachNote,
      },
    };
    const nextForm = resolveChannelForm(
      client,
      nextChannel,
      nextDrafts[nextChannel]
    );

    setChannelDrafts(nextDrafts);
    setChannel(nextChannel);
    setBaselineStatus(nextForm.baselineStatus);
    setBaselineNote(nextForm.baselineNote);
    setOutreachStatus(nextForm.outreachStatus);
    setOutreachNote(nextForm.outreachNote);
  }

  const trimmedNote = outreachNote.trim();
  const isDirty =
    outreachStatus !== baselineStatus || trimmedNote !== baselineNote;
  const canSave = isDirty && !busy;

  async function handleSaveOutreachLog() {
    if (!canSave || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setBusy(true);
    try {
      const payload = {
        status: outreachStatus,
        note: trimmedNote || undefined,
      };
      const updated =
        channel === "viber"
          ? await recordViberFollowUp(authFetch, client.id, payload)
          : await recordWhatsAppFollowUp(authFetch, client.id, payload);
      onUpdated(updated);
      setBaselineStatus(outreachStatus);
      setBaselineNote(trimmedNote);
      setOutreachNote("");
      setChannelDrafts((current) => ({
        ...current,
        [channel]: null,
      }));

      if (onOutreachSaved) {
        onOutreachSaved({ client: updated, status: outreachStatus });
      } else {
        showToast("Outreach log saved.");
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not save outreach log."
      );
    } finally {
      setBusy(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <section
      className="rounded-2xl border border-border-warm bg-card p-4 shadow-sm"
      aria-labelledby="client-outreach-log-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="size-4 text-primary" aria-hidden />
        <h3
          id="client-outreach-log-heading"
          className="text-sm font-semibold text-text-warm"
        >
          Log outreach
        </h3>
      </div>

      <p className="mb-3 text-xs text-text-muted-warm">
        Record what happened after messaging. To schedule a return visit, use
        Next follow-up above.
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label id="client-outreach-channel-label">Channel</Label>
          <div
            role="radiogroup"
            aria-labelledby="client-outreach-channel-label"
            className="flex overflow-hidden rounded-lg border border-input"
          >
            <button
              type="button"
              role="radio"
              disabled={busy}
              aria-checked={channel === "whatsapp"}
              onClick={() => handleChannelChange("whatsapp")}
              className={cn(
                "flex-1 px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                channel === "whatsapp"
                  ? "bg-whatsapp text-whatsapp-foreground"
                  : "bg-background text-text-muted-warm hover:bg-muted/60"
              )}
            >
              WhatsApp
            </button>
            <button
              type="button"
              role="radio"
              disabled={busy}
              aria-checked={channel === "viber"}
              onClick={() => handleChannelChange("viber")}
              className={cn(
                "flex-1 px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                channel === "viber"
                  ? "bg-viber text-viber-foreground"
                  : "bg-background text-text-muted-warm hover:bg-muted/60"
              )}
            >
              Viber
            </button>
          </div>
          {channel === "viber" ? (
            <p className="text-xs text-text-muted-warm">Logging Viber outreach</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-outreach-status">Outreach status</Label>
          <select
            id="client-outreach-status"
            value={outreachStatus}
            disabled={busy}
            onChange={(event) =>
              setOutreachStatus(event.target.value as OutreachLogStatus)
            }
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="contacted">Contacted</option>
            <option value="awaiting_reply">Awaiting reply</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-outreach-note">Note (optional)</Label>
          <Input
            id="client-outreach-note"
            value={outreachNote}
            disabled={busy}
            onChange={(event) => setOutreachNote(event.target.value)}
            placeholder="Brief outreach note"
          />
        </div>

        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!canSave}
          onClick={() => void handleSaveOutreachLog()}
        >
          {busy ? "Saving…" : "Save outreach log"}
        </Button>
      </div>
    </section>
  );
}
