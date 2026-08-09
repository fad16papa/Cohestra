"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  recordWhatsAppFollowUp,
  type ClientDetail,
  type ClientTimelineItem,
} from "@/lib/clients-api";

export type OutreachLogStatus = "contacted" | "awaiting_reply";

type ClientOutreachLogCardProps = {
  client: ClientDetail;
  onUpdated: (client: ClientDetail) => void;
  onOutreachSaved?: (payload: {
    client: ClientDetail;
    status: OutreachLogStatus;
  }) => void;
};

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

function getLatestOutreachStatus(client: ClientDetail): OutreachLogStatus {
  const latestFollowUp = client.timeline.find(
    (item: ClientTimelineItem) =>
      item.eventType === "whatsapp_follow_up_recorded"
  );

  return (
    parseOutreachStatusFromTimeline(latestFollowUp?.campaignSubject) ??
    "contacted"
  );
}

export function ClientOutreachLogCard({
  client,
  onUpdated,
  onOutreachSaved,
}: ClientOutreachLogCardProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [baselineStatus, setBaselineStatus] = useState<OutreachLogStatus>(() =>
    getLatestOutreachStatus(client)
  );
  const [outreachStatus, setOutreachStatus] =
    useState<OutreachLogStatus>(baselineStatus);
  const [outreachNote, setOutreachNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const nextStatus = getLatestOutreachStatus(client);
    setBaselineStatus(nextStatus);
    setOutreachStatus(nextStatus);
    setOutreachNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const trimmedNote = outreachNote.trim();
  const isDirty = outreachStatus !== baselineStatus || trimmedNote.length > 0;
  const canSave = isDirty && !busy;

  async function handleSaveOutreachLog() {
    if (!canSave || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setBusy(true);
    try {
      const updated = await recordWhatsAppFollowUp(authFetch, client.id, {
        status: outreachStatus,
        note: trimmedNote || undefined,
      });
      onUpdated(updated);
      setBaselineStatus(outreachStatus);
      setOutreachNote("");

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
