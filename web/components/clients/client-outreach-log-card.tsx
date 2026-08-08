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

type ClientOutreachLogCardProps = {
  client: ClientDetail;
  onUpdated: (client: ClientDetail) => void;
};

type FollowUpStatus = "contacted" | "awaiting_reply";

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
    (item: ClientTimelineItem) =>
      item.eventType === "whatsapp_follow_up_recorded"
  );

  return (
    parseFollowUpStatusFromTimeline(latestFollowUp?.campaignSubject) ??
    "contacted"
  );
}

export function ClientOutreachLogCard({
  client,
  onUpdated,
}: ClientOutreachLogCardProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [baselineStatus, setBaselineStatus] = useState<FollowUpStatus>(() =>
    getLatestFollowUpStatus(client)
  );
  const [followUpStatus, setFollowUpStatus] =
    useState<FollowUpStatus>(baselineStatus);
  const [followUpNote, setFollowUpNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const nextStatus = getLatestFollowUpStatus(client);
    setBaselineStatus(nextStatus);
    setFollowUpStatus(nextStatus);
    setFollowUpNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const trimmedNote = followUpNote.trim();
  const isDirty = followUpStatus !== baselineStatus || trimmedNote.length > 0;
  const canSave = isDirty && !busy;

  async function handleRecordFollowUp() {
    if (!canSave || isSubmittingRef.current) {
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
      setBaselineStatus(followUpStatus);
      setFollowUpNote("");
      showToast("Follow-up recorded.");
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

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-follow-up-status">Follow-up status</Label>
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-follow-up-note">Note (optional)</Label>
          <Input
            id="whatsapp-follow-up-note"
            value={followUpNote}
            disabled={busy}
            onChange={(event) => setFollowUpNote(event.target.value)}
            placeholder="Brief follow-up note"
          />
        </div>

        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!canSave}
          onClick={() => void handleRecordFollowUp()}
        >
          {busy ? "Saving…" : "Save follow-up"}
        </Button>
      </div>
    </section>
  );
}
