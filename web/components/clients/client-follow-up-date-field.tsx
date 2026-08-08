"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  formatNextFollowUpDate,
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
        "rounded-2xl border border-border-warm bg-card p-5 shadow-sm",
        className
      )}
      aria-labelledby="client-follow-up-date-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
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
          <p className="text-sm text-text-muted-warm">
            Optional reminder date — overdue items appear on Dashboard and the Clients queue.
            {client.nextFollowUpAt
              ? ` Currently ${formatNextFollowUpDate(client.nextFollowUpAt, timeZoneId)}.`
              : ""}
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2">
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
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void handleSave(draftDate)}
            >
              Save date
            </Button>
            {draftDate ? (
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
      </div>
    </section>
  );
}
