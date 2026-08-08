"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  isFollowUpDue,
  updateClientNextFollowUp,
  type ClientDetail,
} from "@/lib/clients-api";
import { cn } from "@/lib/utils";

type ClientFollowUpDateFieldProps = {
  client: ClientDetail;
  timeZoneId?: string | null;
  onUpdated: (client: ClientDetail) => void;
  className?: string;
};

function toDateInputValue(
  isoValue: string | null,
  timeZoneId?: string | null
): string {
  if (!isoValue) {
    return "";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZoneId ?? "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export function ClientFollowUpDateField({
  client,
  timeZoneId,
  onUpdated,
  className,
}: ClientFollowUpDateFieldProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [draftDate, setDraftDate] = useState(() =>
    toDateInputValue(client.nextFollowUpAt, timeZoneId)
  );
  const [busy, setBusy] = useState(false);

  const due = isFollowUpDue(client.nextFollowUpAt, timeZoneId);
  const savedDate = toDateInputValue(client.nextFollowUpAt, timeZoneId);
  const isDirty = draftDate !== savedDate;

  async function handleSave(nextValue: string) {
    setBusy(true);
    try {
      const updated = await updateClientNextFollowUp(
        authFetch,
        client.id,
        nextValue.trim() ? nextValue.trim() : null
      );
      onUpdated(updated);
      setDraftDate(toDateInputValue(updated.nextFollowUpAt, timeZoneId));
      showToast(nextValue ? "Follow-up date saved." : "Follow-up date cleared.");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not save follow-up date."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-border-warm bg-card p-4 shadow-sm",
        className
      )}
      aria-labelledby="client-follow-up-date-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="size-4 text-primary" aria-hidden />
        <h3
          id="client-follow-up-date-heading"
          className="text-sm font-semibold text-text-warm"
        >
          Next follow-up
        </h3>
        {due ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            Due
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="client-next-follow-up-date" className="sr-only">
            Next follow-up date
          </Label>
          <Input
            id="client-next-follow-up-date"
            type="date"
            value={draftDate}
            disabled={busy}
            onChange={(event) => setDraftDate(event.target.value)}
          />
          <p className="text-xs text-text-muted-warm">
            Overdue items surface on the Dashboard and Clients queue.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            disabled={busy || !isDirty}
            onClick={() => void handleSave(draftDate)}
          >
            Save
          </Button>
          {savedDate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDraftDate("");
                void handleSave("");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
