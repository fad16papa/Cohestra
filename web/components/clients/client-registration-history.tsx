"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientPhoneDisplay } from "@/components/clients/client-phone-display";
import { clientProfileCardClassName } from "@/components/clients/client-profile-motion";
import type { ClientRegistrationHistoryItem } from "@/lib/clients-api";
import { looksLikePhoneValue } from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type ClientRegistrationHistoryProps = {
  history: ClientRegistrationHistoryItem[];
};

function formatRegisteredAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RegistrationAnswersDetail({
  entry,
}: {
  entry: ClientRegistrationHistoryItem;
}) {
  return (
    <div className="min-h-0 flex-1 rounded-lg border border-border-warm bg-muted/20 p-4">
      <div className="flex flex-col gap-1 border-b border-border-warm pb-3 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h3 className="font-medium text-text-warm">{entry.activityName}</h3>
          <p className="mt-1 font-mono text-xs text-text-muted-warm">
            {entry.registrationNumber}
          </p>
        </div>
        <p className="text-xs text-text-muted-warm">
          Registered {formatRegisteredAt(entry.registeredAt)}
        </p>
      </div>

      {entry.answers.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted-warm">
          No answers stored for this registration.
        </p>
      ) : (
        <dl className="mt-4 grid max-h-[min(28rem,50vh)] gap-3 overflow-y-auto sm:grid-cols-2">
          {entry.answers.map((answer) => (
            <div key={`${entry.registrationId}-${answer.fieldId}`}>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                {answer.label}
              </dt>
              <dd className="mt-1 text-sm text-text-warm">
                {looksLikePhoneValue(answer.value) ? (
                  <ClientPhoneDisplay phone={answer.value} />
                ) : (
                  (answer.value ?? "—")
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function ClientRegistrationHistory({ history }: ClientRegistrationHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => history[0]?.registrationId ?? null
  );

  const selectedEntry = useMemo(
    () => history.find((entry) => entry.registrationId === selectedId) ?? history[0] ?? null,
    [history, selectedId]
  );

  useEffect(() => {
    if (history.length === 0) {
      setSelectedId(null);
      return;
    }

    const stillExists = history.some((entry) => entry.registrationId === selectedId);
    if (!stillExists) {
      setSelectedId(history[0]?.registrationId ?? null);
    }
  }, [history, selectedId]);

  return (
    <Card className={clientProfileCardClassName}>
      <CardHeader>
        <CardTitle>Registration answers</CardTitle>
        <CardDescription>
          {history.length === 0
            ? "Activity-specific responses captured at sign-up."
            : `${history.length} ${history.length === 1 ? "activity" : "activities"} · newest first · select one to view answers`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-text-muted-warm">
            No registrations recorded for this client yet.
          </p>
        ) : history.length === 1 && selectedEntry ? (
          <RegistrationAnswersDetail entry={selectedEntry} />
        ) : (
          <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
            <div
              role="listbox"
              aria-label="Activity registrations"
              className="flex max-h-[min(28rem,50vh)] flex-col gap-1 overflow-y-auto rounded-lg border border-border-warm bg-card p-1"
            >
              {history.map((entry) => {
                const isSelected = entry.registrationId === selectedEntry?.registrationId;

                return (
                  <button
                    key={entry.registrationId}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedId(entry.registrationId)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-l-4 border-l-primary bg-primary/5"
                        : "border-l-4 border-l-transparent hover:bg-muted/50"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-warm">
                        {entry.activityName}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted-warm">
                        <CalendarDays className="size-3 shrink-0" aria-hidden />
                        {formatRegisteredAt(entry.registeredAt)}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-text-muted-warm">
                        {entry.registrationNumber}
                      </span>
                      <span className="mt-1 block text-xs text-text-muted-warm">
                        {entry.answers.length}{" "}
                        {entry.answers.length === 1 ? "field" : "fields"}
                      </span>
                    </span>
                    <ChevronRight
                      className={cn(
                        "mt-0.5 size-4 shrink-0 text-text-muted-warm",
                        isSelected && "text-primary"
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>

            {selectedEntry ? (
              <RegistrationAnswersDetail entry={selectedEntry} />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
