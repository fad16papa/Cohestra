"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, ChevronUp, Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientPhoneDisplay } from "@/components/clients/client-phone-display";
import { clientProfileCardClassName, ClientProfileExpandableRegion } from "@/components/clients/client-profile-motion";
import type { ClientRegistrationHistoryItem } from "@/lib/clients-api";
import { looksLikePhoneValue } from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type ClientRegistrationHistoryProps = {
  history: ClientRegistrationHistoryItem[];
  defaultCollapsed?: boolean;
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

function looksLikeEmailValue(value: string | null | undefined) {
  if (!value?.trim()) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isEmailAnswer(label: string, value: string | null | undefined) {
  return /email/i.test(label) || looksLikeEmailValue(value);
}

function isConsentAnswer(label: string) {
  return /consent/i.test(label);
}

function registrationAnswerSpanClass(
  label: string,
  value: string | null | undefined
) {
  if (
    isEmailAnswer(label, value) ||
    isConsentAnswer(label) ||
    (value?.trim().length ?? 0) > 48
  ) {
    return "sm:col-span-2";
  }

  return undefined;
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
        <dl className="mt-4 grid max-h-[min(28rem,50vh)] gap-x-4 gap-y-3 overflow-y-auto sm:grid-cols-2">
          {entry.answers.map((answer) => (
            <div
              key={`${entry.registrationId}-${answer.fieldId}`}
              className={cn(
                "min-w-0",
                registrationAnswerSpanClass(answer.label, answer.value)
              )}
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                {answer.label}
              </dt>
              <dd
                className={cn(
                  "mt-1 text-sm text-text-warm",
                  isEmailAnswer(answer.label, answer.value) &&
                    "break-all font-mono text-[0.8125rem] leading-relaxed"
                )}
              >
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

export function ClientRegistrationHistory({
  history,
  defaultCollapsed = false,
}: ClientRegistrationHistoryProps) {
  const [expanded, setExpanded] = useState(!defaultCollapsed || history.length <= 3);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => history[0]?.registrationId ?? null
  );

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return history;
    }

    return history.filter(
      (entry) =>
        entry.activityName.toLowerCase().includes(query) ||
        entry.registrationNumber.toLowerCase().includes(query) ||
        entry.answers.some(
          (answer) =>
            answer.label.toLowerCase().includes(query) ||
            (answer.value?.toLowerCase().includes(query) ?? false)
        )
    );
  }, [history, search]);

  const selectedEntry = useMemo(
    () =>
      filteredHistory.find((entry) => entry.registrationId === selectedId) ??
      filteredHistory[0] ??
      null,
    [filteredHistory, selectedId]
  );

  useEffect(() => {
    if (filteredHistory.length === 0) {
      setSelectedId(null);
      return;
    }

    const stillExists = filteredHistory.some(
      (entry) => entry.registrationId === selectedId
    );
    if (!stillExists) {
      setSelectedId(filteredHistory[0]?.registrationId ?? null);
    }
  }, [filteredHistory, selectedId]);

  return (
    <Card className={clientProfileCardClassName}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Registration answers</CardTitle>
            <CardDescription>
              {history.length === 0
                ? "Activity-specific responses captured at sign-up."
                : `${history.length} ${history.length === 1 ? "activity" : "activities"} · newest first`}
            </CardDescription>
          </div>
          {history.length > 0 ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  Collapse
                  <ChevronUp className="size-4" aria-hidden />
                </>
              ) : (
                <>
                  Expand
                  <ChevronDown className="size-4" aria-hidden />
                </>
              )}
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-text-muted-warm">
            No registrations recorded for this client yet.
          </p>
        ) : (
          <>
            {!expanded ? (
              <p className="text-sm text-text-muted-warm">
                Registration history collapsed — expand to browse form answers from each activity.
              </p>
            ) : null}

            <ClientProfileExpandableRegion expanded={expanded}>
              <div className="space-y-4">
              {history.length >= 5 ? (
                <div className="relative max-w-md">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted-warm"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    placeholder="Search activities or answers…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9"
                  />
                </div>
              ) : null}

              {filteredHistory.length === 0 ? (
                <p className="text-sm text-text-muted-warm">
                  No registrations match your search.
                </p>
              ) : filteredHistory.length === 1 && selectedEntry ? (
                <RegistrationAnswersDetail entry={selectedEntry} />
              ) : (
                <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
                  <div
                    role="listbox"
                    aria-label="Activity registrations"
                    className="flex max-h-[min(28rem,50vh)] flex-col gap-1 overflow-y-auto rounded-lg border border-border-warm bg-card p-1"
                  >
                    {filteredHistory.map((entry) => {
                      const isSelected =
                        entry.registrationId === selectedEntry?.registrationId;

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
            </div>
            </ClientProfileExpandableRegion>
          </>
        )}
      </CardContent>
    </Card>
  );
}
