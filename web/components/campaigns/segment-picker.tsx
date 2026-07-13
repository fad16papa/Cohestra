"use client";

import { CheckCircle2, Mail, MailX, Search, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  AdditionalRecipientsPicker,
  type AdditionalRecipientSummary,
} from "@/components/campaigns/additional-recipients-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Activity } from "@/lib/activities-api";
import { fetchCommunities, type CommunityListItem } from "@/lib/communities-api";
import {
  isComposeSegmentReady,
  isValidSegmentQuery,
  previewClientSegment,
  type ClientSegmentPreview,
  type ClientSegmentQuery,
} from "@/lib/campaigns-api";
import { cn } from "@/lib/utils";

type SegmentPickerProps = {
  activities: Activity[];
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  value: ClientSegmentQuery;
  onChange: (segment: ClientSegmentQuery) => void;
  onPreviewChange?: (preview: ClientSegmentPreview | null) => void;
};

const FILTER_DEBOUNCE_MS = 400;

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SegmentPicker({
  activities,
  authFetch,
  value,
  onChange,
  onPreviewChange,
}: SegmentPickerProps) {
  const [preview, setPreview] = useState<ClientSegmentPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [communities, setCommunities] = useState<CommunityListItem[]>([]);
  const [nameDraft, setNameDraft] = useState(value.name ?? "");
  const [nationalityDraft, setNationalityDraft] = useState(value.nationality ?? "");
  const [professionDraft, setProfessionDraft] = useState(value.profession ?? "");
  const [additionalClients, setAdditionalClients] = useState<AdditionalRecipientSummary[]>(
    []
  );
  const valueRef = useRef(value);

  valueRef.current = value;

  const hasCommunity = Boolean(value.community?.trim());
  const hasSearchFilters = Boolean(
    nameDraft.trim() || nationalityDraft.trim() || professionDraft.trim()
  );
  const segmentIsValid = isValidSegmentQuery(value);
  const composeReady = isComposeSegmentReady(value);

  useEffect(() => {
    let cancelled = false;

    void fetchCommunities(authFetch)
      .then((items) => {
        if (!cancelled) {
          setCommunities(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCommunities([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    if (!segmentIsValid) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      onPreviewChange?.(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void previewClientSegment(authFetch, value)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
          setPreviewError(null);
          onPreviewChange?.(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Could not preview segment.";
          setPreview(null);
          setPreviewError(message);
          onPreviewChange?.(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, onPreviewChange, segmentIsValid, value]);

  useEffect(() => {
    if (!hasCommunity) {
      return;
    }

    const timer = window.setTimeout(() => {
      applySegment({
        name: nameDraft.trim() || undefined,
        nationality: nationalityDraft.trim() || undefined,
        profession: professionDraft.trim() || undefined,
      });
    }, FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [hasCommunity, nameDraft, nationalityDraft, professionDraft]);

  const activityCommunities = useMemo(
    () =>
      Array.from(
        new Set(
          activities
            .map((activity) => activity.communityLabel?.trim())
            .filter((label): label is string => Boolean(label))
        )
      ).sort(),
    [activities]
  );

  const communityOptions = useMemo(() => {
    if (communities.length > 0) {
      return communities;
    }

    return activityCommunities.map((name) => ({
      id: name,
      name,
      activityCount: 0,
      leadCount: 0,
      createdAt: "",
      updatedAt: "",
    }));
  }, [activityCommunities, communities]);

  const consentedRecipients = useMemo(
    () => preview?.previewItems.filter((item) => item.consentGiven) ?? [],
    [preview]
  );

  const readyCount = preview?.withEmailCount ?? 0;
  const totalCount = preview?.totalCount ?? 0;
  const additionalReadyCount = preview?.additionalWithEmailCount ?? 0;
  const additionalCount = value.additionalClientIds?.length ?? 0;

  function applySegment(nextPartial: ClientSegmentQuery) {
    const nextSegment: ClientSegmentQuery = {
      ...valueRef.current,
      ...nextPartial,
      allClients: false,
      consentOnly: true,
    };

    if (!isValidSegmentQuery(nextSegment)) {
      onPreviewChange?.(null);
    }

    onChange(nextSegment);
  }

  function handleCommunityChange(communityName: string) {
    setAdditionalClients([]);
    if (!communityName) {
      setNameDraft("");
      setNationalityDraft("");
      setProfessionDraft("");
      onChange({ consentOnly: true });
      return;
    }

    onChange({
      community: communityName,
      consentOnly: true,
      additionalClientIds: undefined,
    });
  }

  function handleAdditionalChange(
    ids: string[],
    clients: AdditionalRecipientSummary[]
  ) {
    setAdditionalClients(clients);
    applySegment({
      additionalClientIds: ids.length > 0 ? ids : undefined,
    });
  }

  function clearSearchFilters() {
    setNameDraft("");
    setNationalityDraft("");
    setProfessionDraft("");
    applySegment({
      name: undefined,
      nationality: undefined,
      profession: undefined,
    });
  }

  function resetTargeting() {
    setNameDraft("");
    setNationalityDraft("");
    setProfessionDraft("");
    setAdditionalClients([]);
    onChange({ consentOnly: true });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-warm bg-card">
      <div className="border-b border-border-warm bg-muted/20 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-warm">Recipients</h3>
            <p className="mt-1 max-w-2xl text-sm text-text-muted-warm">
              Choose a community, optionally add consented leads from outside that
              community, then refine who receives this campaign.
            </p>
          </div>

          {hasCommunity || hasSearchFilters ? (
            <Button type="button" size="sm" variant="outline" onClick={resetTargeting}>
              Reset
            </Button>
          ) : null}
        </div>

        {composeReady && preview && !previewError ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-card px-3 py-1 text-xs font-medium text-text-warm">
              <Users className="size-3.5 text-primary" aria-hidden />
              {totalCount} consented
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Mail className="size-3.5" aria-hidden />
              {readyCount} ready to send
            </span>
            {additionalReadyCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-text-warm">
                +{additionalReadyCount} outside community
              </span>
            ) : null}
            {totalCount - readyCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                <MailX className="size-3.5" aria-hidden />
                {totalCount - readyCount} missing email
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-6 p-5">
        <div className="space-y-2">
          <Label htmlFor="segment-community">Target community</Label>
          {communityOptions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-warm px-4 py-6 text-center text-sm text-text-muted-warm">
              No communities yet. Create communities or publish activities with a
              community label.
            </p>
          ) : (
            <select
              id="segment-community"
              value={value.community ?? ""}
              onChange={(event) => handleCommunityChange(event.target.value)}
              className={selectClassName}
            >
              <option value="">Select a community…</option>
              {communityOptions.map((community) => (
                <option key={community.id} value={community.name}>
                  {community.name}
                  {community.leadCount > 0
                    ? ` · ${community.leadCount} lead${community.leadCount === 1 ? "" : "s"}`
                    : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {!hasCommunity ? (
          <div className="rounded-lg border border-dashed border-border-warm bg-muted/10 px-6 py-10 text-center">
            <Users className="mx-auto size-8 text-text-muted-warm/70" aria-hidden />
            <p className="mt-3 text-sm font-medium text-text-warm">
              Select a community to preview recipients
            </p>
            <p className="mt-1 text-sm text-text-muted-warm">
              You will see every consented lead from that community, then narrow
              the list with search filters.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-text-warm">
                    Refine recipients
                  </h4>
                  <p className="mt-1 text-xs text-text-muted-warm">
                    Optional filters combine with AND logic. Consent is always
                    required.
                  </p>
                </div>
                {hasSearchFilters ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={clearSearchFilters}
                  >
                    Clear search
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="segment-name" className="text-xs">
                    Name
                  </Label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-text-muted-warm"
                      aria-hidden
                    />
                    <Input
                      id="segment-name"
                      value={nameDraft}
                      placeholder="Search name or email…"
                      className="pl-9"
                      onChange={(event) => setNameDraft(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="segment-nationality" className="text-xs">
                    Nationality
                  </Label>
                  <Input
                    id="segment-nationality"
                    value={nationalityDraft}
                    placeholder="e.g. Filipino"
                    onChange={(event) => setNationalityDraft(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="segment-profession" className="text-xs">
                    Profession
                  </Label>
                  <Input
                    id="segment-profession"
                    value={professionDraft}
                    placeholder="e.g. Engineer"
                    onChange={(event) => setProfessionDraft(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <AdditionalRecipientsPicker
              authFetch={authFetch}
              community={value.community ?? ""}
              selectedIds={value.additionalClientIds ?? []}
              selectedClients={additionalClients}
              onChange={handleAdditionalChange}
            />

            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-text-warm">
                    Sending to
                  </h4>
                  <p className="text-xs text-text-muted-warm">
                    {value.community}
                    {hasSearchFilters ? " · filtered" : " · all consented leads"}
                    {additionalCount > 0
                      ? ` · +${additionalCount} additional`
                      : ""}
                  </p>
                </div>
                {previewLoading ? (
                  <span className="text-xs text-text-muted-warm">Updating…</span>
                ) : null}
              </div>

              {previewError ? (
                <p role="alert" className="text-sm text-destructive">
                  {previewError}
                </p>
              ) : previewLoading && !preview ? (
                <div className="rounded-lg border border-border-warm bg-muted/10 px-4 py-8 text-center text-sm text-text-muted-warm">
                  Loading recipients…
                </div>
              ) : consentedRecipients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border-warm bg-muted/10 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-text-warm">
                    No matching recipients
                  </p>
                  <p className="mt-1 text-sm text-text-muted-warm">
                    Try clearing search filters or choose a different community.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border-warm">
                  <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-3 border-b border-border-warm bg-muted/30 px-4 py-2 text-xs font-medium tracking-wide text-text-muted-warm uppercase sm:grid">
                    <span>Name</span>
                    <span>Email</span>
                    <span className="text-right">Status</span>
                  </div>
                  <ul className="max-h-72 divide-y divide-border-warm overflow-y-auto">
                    {consentedRecipients.map((recipient) => {
                      const hasEmail = Boolean(recipient.email?.trim());

                      return (
                        <li
                          key={recipient.id}
                          className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
                        >
                          <span className="min-w-0 truncate text-sm font-medium text-text-warm">
                            {recipient.fullName}
                            {recipient.isAdditionalRecipient ? (
                              <span className="ml-2 text-xs font-normal text-primary">
                                Outside community
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 truncate text-sm",
                              hasEmail
                                ? "text-text-muted-warm"
                                : "text-amber-700 dark:text-amber-300"
                            )}
                          >
                            {hasEmail ? recipient.email : "No email on file"}
                          </span>
                          <span className="sm:text-right">
                            {hasEmail ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="size-3" aria-hidden />
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <MailX className="size-3" aria-hidden />
                                Skipped
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!segmentIsValid && hasCommunity ? (
        <div
          role="status"
          className="border-t border-border-warm bg-muted/20 px-5 py-3 text-sm text-text-muted-warm"
        >
          Adjust your filters to include at least one recipient before sending.
        </div>
      ) : null}
    </div>
  );
}
