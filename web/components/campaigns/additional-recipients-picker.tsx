"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_ADDITIONAL_CAMPAIGN_RECIPIENTS } from "@/lib/campaigns-api";
import { fetchClients, type ClientListItem } from "@/lib/clients-api";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;
const MIN_SEARCH_LENGTH = 1;

export type AdditionalRecipientSummary = {
  id: string;
  fullName: string;
  email: string | null;
};

type AdditionalRecipientsPickerProps = {
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  community: string;
  selectedIds: string[];
  selectedClients: AdditionalRecipientSummary[];
  onChange: (ids: string[], clients: AdditionalRecipientSummary[]) => void;
};

export function AdditionalRecipientsPicker({
  authFetch,
  community,
  selectedIds,
  selectedClients,
  onChange,
}: AdditionalRecipientsPickerProps) {
  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ClientListItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const atLimit = selectedIds.length >= MAX_ADDITIONAL_CAMPAIGN_RECIPIENTS;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchDraft.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    if (searchTerm.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    void fetchClients(authFetch, {
      page: 1,
      pageSize: 25,
      search: searchTerm,
      consentOnly: true,
      excludeCommunity: community,
      sortBy: "name",
      sortDirection: "asc",
    })
      .then((response) => {
        if (!cancelled) {
          setResults(response.items);
          setSearchError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setResults([]);
          setSearchError(
            error instanceof Error ? error.message : "Could not search clients."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, community, searchTerm]);

  const visibleResults = useMemo(
    () => results.filter((client) => !selectedIds.includes(client.id)),
    [results, selectedIds]
  );

  const addableResults = useMemo(
    () => visibleResults.filter((client) => Boolean(client.email?.trim())),
    [visibleResults]
  );

  function addClient(client: ClientListItem) {
    if (atLimit || selectedIds.includes(client.id) || !client.email?.trim()) {
      return;
    }

    const nextClient: AdditionalRecipientSummary = {
      id: client.id,
      fullName: client.fullName,
      email: client.email,
    };

    onChange(
      [...selectedIds, client.id],
      [...selectedClients, nextClient]
    );
    setSearchDraft("");
    setSearchTerm("");
    setResults([]);
  }

  function removeClient(clientId: string) {
    onChange(
      selectedIds.filter((id) => id !== clientId),
      selectedClients.filter((client) => client.id !== clientId)
    );
  }

  function renderEmptyMessage() {
    if (visibleResults.length === 0) {
      return "No consented clients outside this community match this search.";
    }

    return "Matching clients were found, but none have an email address on file yet. Add an email on their client profile before including them.";
  }

  return (
    <div className="space-y-4 rounded-xl border border-border-warm bg-muted/10 p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-text-warm">Also send to</h4>
        <p className="text-xs leading-relaxed text-text-muted-warm">
          Add up to {MAX_ADDITIONAL_CAMPAIGN_RECIPIENTS} consented leads outside{" "}
          <span className="font-medium text-text-warm">{community}</span>. Search
          by name or email. Only clients with email addresses can be added.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional-recipient-search" className="text-xs">
          Search consented clients
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted-warm"
            aria-hidden
          />
          <Input
            id="additional-recipient-search"
            value={searchDraft}
            placeholder={
              atLimit
                ? "Maximum additional recipients reached"
                : "Name or email…"
            }
            className="pl-9"
            disabled={atLimit}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </div>
        <p className="text-xs text-text-muted-warm">
          {selectedIds.length} / {MAX_ADDITIONAL_CAMPAIGN_RECIPIENTS} additional
        </p>
      </div>

      {searchError ? (
        <p role="alert" className="text-sm text-destructive">
          {searchError}
        </p>
      ) : null}

      {searchDraft.trim().length > 0 && searchTerm.length < MIN_SEARCH_LENGTH ? (
        <p className="text-sm text-text-muted-warm">Keep typing to search…</p>
      ) : null}

      {searchTerm.length >= MIN_SEARCH_LENGTH ? (
        <div className="overflow-hidden rounded-lg border border-border-warm bg-card">
          {searchLoading ? (
            <p className="px-4 py-3 text-sm text-text-muted-warm">Searching…</p>
          ) : addableResults.length === 0 && visibleResults.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted-warm">
              {renderEmptyMessage()}
            </p>
          ) : (
            <ul className="divide-y divide-border-warm">
              {visibleResults.map((client) => {
                const hasEmail = Boolean(client.email?.trim());

                return (
                  <li
                    key={client.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-warm">
                        {client.fullName}
                      </p>
                      <p
                        className={cn(
                          "truncate text-xs",
                          hasEmail
                            ? "text-text-muted-warm"
                            : "text-amber-700 dark:text-amber-300"
                        )}
                      >
                        {hasEmail
                          ? client.email
                          : "No email on file — update client profile first"}
                        {client.lastActivityName
                          ? hasEmail
                            ? ` · ${client.lastActivityName}`
                            : ""
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={atLimit || !hasEmail}
                      onClick={() => addClient(client)}
                    >
                      <UserPlus className="size-3.5" aria-hidden />
                      Add
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {selectedClients.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selectedClients.map((client) => (
            <li
              key={client.id}
              className={cn(
                "inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/5 py-1 pr-1 pl-3 text-xs text-text-warm"
              )}
            >
              <span className="min-w-0 truncate">
                {client.fullName}
                {client.email ? ` · ${client.email}` : ""}
              </span>
              <button
                type="button"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-text-muted-warm transition-colors hover:bg-muted hover:text-text-warm"
                aria-label={`Remove ${client.fullName}`}
                onClick={() => removeClient(client.id)}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
