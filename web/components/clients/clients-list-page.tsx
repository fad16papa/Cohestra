"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ClientBulkSelectBar } from "@/components/clients/client-bulk-select-bar";
import { ClientLeadQueueHeader } from "@/components/clients/client-lead-queue-header";
import { ClientRow } from "@/components/clients/client-row";
import { ClientsFilterBanners } from "@/components/clients/clients-filter-banners";
import {
  clientsTableActionsColumnClassName,
  clientsTableContactColumnClassName,
  clientsTableGridClassName,
  clientsTableHeaderButtonClassName,
  clientsTableHeaderClassName,
  clientsTableMinWidthClassName,
  clientsTableOutreachColumnClassName,
  clientsTableRegistrationColumnClassName,
  clientsTableScrollClassName,
  clientsTableStatusColumnClassName,
} from "@/components/clients/clients-table-layout";
import { MessengerOpenConfirmDialog } from "@/components/clients/messenger-open-confirm-dialog";
import { useClientsListFilters } from "@/components/clients/use-clients-list-filters";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  downloadClientsCsvExport,
  exportClientsCsv,
  fetchClientNationalities,
  fetchClients,
  recordWhatsAppInitiated,
  recordViberInitiated,
  updateClientLeadStatus,
  type ClientLeadStatusCounts,
  type ClientListItem,
  type ClientSortBy,
  type LeadStatus,
} from "@/lib/clients-api";
import { isCoreOrAbove, isProPlan } from "@/lib/shell/tenant-shell-api";
import { fetchActivityById } from "@/lib/activities-api";
import { buildViberAppDeepLink, buildWhatsAppWebUrl, openAppDeepLink } from "@/lib/messenger-links";
import type { MessengerChannel } from "@/lib/messenger-prerequisites";
import { formatPhoneDisplay } from "@/lib/phone-countries";
import { cn } from "@/lib/utils";
import { ChevronDown, Download, Users } from "lucide-react";

const CLIENT_PAGE_SIZE = 25;
const CLIENT_SEARCH_DEBOUNCE_MS = 400;

const emptyStatusCounts: ClientLeadStatusCounts = {
  newCount: 0,
  contactedCount: 0,
  activeCount: 0,
  inactiveCount: 0,
  mergeSuspectCount: 0,
  followUpDueCount: 0,
};

function adjustStatusCounts(
  counts: ClientLeadStatusCounts,
  from: LeadStatus,
  to: LeadStatus
): ClientLeadStatusCounts {
  if (from === to) {
    return counts;
  }

  const next = { ...counts };
  if (from === "new") next.newCount = Math.max(0, next.newCount - 1);
  if (from === "contacted") next.contactedCount = Math.max(0, next.contactedCount - 1);
  if (from === "active") next.activeCount = Math.max(0, next.activeCount - 1);
  if (from === "inactive") next.inactiveCount = Math.max(0, next.inactiveCount - 1);

  if (to === "new") next.newCount += 1;
  if (to === "contacted") next.contactedCount += 1;
  if (to === "active") next.activeCount += 1;
  if (to === "inactive") next.inactiveCount += 1;

  return next;
}

type SortDirection = "asc" | "desc";

type ClientSearchInputProps = {
  committedValue: string;
  onCommit: (value: string) => void;
};

function ClientSearchInput({ committedValue, onCommit }: ClientSearchInputProps) {
  const [draft, setDraft] = useState(committedValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft === committedValue) {
        return;
      }

      onCommit(draft);
    }, CLIENT_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [committedValue, draft, onCommit]);

  return (
    <Input
      id="client-search"
      type="search"
      placeholder="Search by name, phone, or email…"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
};

type ClientSearchNationalityFiltersProps = {
  searchFilter: string;
  nationalityFilter: string;
  nationalitySelectOptions: string[];
  onSearchCommit: (value: string) => void;
  onNationalityChange: (value: string) => void;
};

function ClientSearchNationalityFilters({
  searchFilter,
  nationalityFilter,
  nationalitySelectOptions,
  onSearchCommit,
  onNationalityChange,
}: ClientSearchNationalityFiltersProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="client-search">Search</Label>
        <ClientSearchInput
          key={searchFilter}
          committedValue={searchFilter}
          onCommit={onSearchCommit}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client-nationality-filter">Nationality</Label>
        <select
          id="client-nationality-filter"
          value={nationalityFilter}
          onChange={(event) => onNationalityChange(event.target.value)}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All nationalities</option>
          {nationalitySelectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export function ClientsListPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const { showToast, showActionToast } = useToast();
  const {
    filters,
    hasActiveFilters,
    updateSearch,
    updateLeadStatus,
    updateNationality,
    updateFollowUpDue,
    updateMergeSuspect,
    updateRegisteredWithinDays,
    updateCreatedWithinDays,
    clearActivityFilter,
  } = useClientsListFilters();

  const {
    search: searchFilter,
    leadStatus: leadStatusFilter,
    nationality: nationalityFilter,
    followUpDue: followUpDueOnly,
    mergeSuspect: mergeSuspectOnly,
    createdWithinDays,
    registeredWithinDays,
    activityId: activityIdFilter,
    activityName: activityNameFilter,
  } = filters;

  const [resolvedActivityName, setResolvedActivityName] = useState("");
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [statusCounts, setStatusCounts] =
    useState<ClientLeadStatusCounts>(emptyStatusCounts);
  const [nationalityOptions, setNationalityOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<ClientSortBy>("lastRegistrationDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingClientIds, setUpdatingClientIds] = useState<Set<string>>(
    () => new Set()
  );
  const [messengerTarget, setMessengerTarget] = useState<{
    client: ClientListItem;
    channel: MessengerChannel;
  } | null>(null);
  const [messengerBusy, setMessengerBusy] = useState(false);
  const [selectedClientsById, setSelectedClientsById] = useState<
    Map<string, ClientListItem>
  >(() => new Map());
  const [isExporting, setIsExporting] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedClientIds = useMemo(
    () => new Set(selectedClientsById.keys()),
    [selectedClientsById]
  );

  const canUseCampaignHandoff = isProPlan(shell?.plan ?? "Basic");

  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENT_PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;

    void fetchClientNationalities(authFetch)
      .then((options) => {
        if (!cancelled) {
          setNationalityOptions(options);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNationalityOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    if (!activityIdFilter || activityNameFilter) {
      setResolvedActivityName("");
      return;
    }

    let cancelled = false;

    void fetchActivityById(authFetch, activityIdFilter)
      .then((activity) => {
        if (!cancelled) {
          setResolvedActivityName(activity.name);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedActivityName("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activityIdFilter, activityNameFilter, authFetch]);

  useEffect(() => {
    let cancelled = false;

    void fetchClients(authFetch, {
      page,
      pageSize: CLIENT_PAGE_SIZE,
      sortBy,
      sortDirection,
      mergeSuspect: mergeSuspectOnly ? true : undefined,
      createdWithinDays: createdWithinDays ?? undefined,
      registeredWithinDays: registeredWithinDays ?? undefined,
      followUpDue: followUpDueOnly ? true : undefined,
      leadStatus: leadStatusFilter ?? undefined,
      nationality: nationalityFilter || undefined,
      search: searchFilter || undefined,
      activityId: activityIdFilter || undefined,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        const nextTotalPages = Math.max(
          1,
          Math.ceil(result.totalCount / CLIENT_PAGE_SIZE)
        );
        if (page > nextTotalPages) {
          setTotalCount(result.totalCount);
          setClients([]);
          setError(null);
          setInitialized(true);
          setPage(nextTotalPages);
          return;
        }

        setClients(result.items);
        setStatusCounts(result.statusCounts);
        setTotalCount(result.totalCount);
        setError(null);
        setInitialized(true);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load clients."
        );
        setInitialized(true);
      });

    return () => {
      cancelled = true;
    };
  }, [
    authFetch,
    activityIdFilter,
    createdWithinDays,
    registeredWithinDays,
    followUpDueOnly,
    leadStatusFilter,
    mergeSuspectOnly,
    nationalityFilter,
    page,
    searchFilter,
    sortBy,
    sortDirection,
  ]);

  function handleSort(nextSortBy: ClientSortBy) {
    if (sortBy === nextSortBy) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(nextSortBy);
      setSortDirection(nextSortBy === "name" ? "asc" : "desc");
    }

    setPage(1);
  }

  const activityFilterLabel = activityNameFilter || resolvedActivityName;

  const selectedClients = useMemo(
    () => Array.from(selectedClientsById.values()),
    [selectedClientsById]
  );

  const consentedSelectedCount = selectedClients.filter(
    (client) => client.consentGiven
  ).length;
  const excludedConsentCount = selectedClients.length - consentedSelectedCount;
  const allPageSelected =
    clients.length > 0 && clients.every((client) => selectedClientIds.has(client.id));

  useEffect(() => {
    setSelectedClientsById(new Map());
  }, [
    page,
    activityIdFilter,
    followUpDueOnly,
    leadStatusFilter,
    mergeSuspectOnly,
    nationalityFilter,
    searchFilter,
    createdWithinDays,
    registeredWithinDays,
    sortBy,
    sortDirection,
  ]);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedClientsById((current) => {
      const next = new Map(current);
      if (allPageSelected) {
        for (const client of clients) {
          next.delete(client.id);
        }
      } else {
        for (const client of clients) {
          next.set(client.id, client);
        }
      }
      return next;
    });
  }, [allPageSelected, clients]);

  const handleSelectedChange = useCallback(
    (client: ClientListItem, selected: boolean) => {
      setSelectedClientsById((current) => {
        const next = new Map(current);
        if (selected) {
          next.set(client.id, client);
        } else {
          next.delete(client.id);
        }
        return next;
      });
    },
    []
  );

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const plan = shell?.plan ?? "Basic";
      const filteredExport = isCoreOrAbove(plan);

      if (!filteredExport && hasActiveFilters) {
        showToast(
          "Exporting full client list. Upgrade to Core for filtered CSV export."
        );
      }

      const exportResult = await exportClientsCsv(authFetch, {
        sortBy,
        sortDirection,
        ...(filteredExport
          ? {
              mergeSuspect: mergeSuspectOnly ? true : undefined,
              createdWithinDays: createdWithinDays ?? undefined,
              registeredWithinDays: registeredWithinDays ?? undefined,
              followUpDue: followUpDueOnly ? true : undefined,
              leadStatus: leadStatusFilter ?? undefined,
              nationality: nationalityFilter || undefined,
              search: searchFilter || undefined,
              activityId: activityIdFilter || undefined,
            }
          : {}),
      });
      downloadClientsCsvExport(exportResult);
      showToast(`Exported ${exportResult.rowCount} clients.`);
    } catch (exportError) {
      showToast(
        exportError instanceof Error
          ? exportError.message
          : "Could not export clients."
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    authFetch,
    activityIdFilter,
    createdWithinDays,
    followUpDueOnly,
    hasActiveFilters,
    leadStatusFilter,
    mergeSuspectOnly,
    nationalityFilter,
    registeredWithinDays,
    searchFilter,
    shell?.plan,
    showToast,
    sortBy,
    sortDirection,
  ]);

  const handleAddToCampaign = useCallback(() => {
    const consentedIds = selectedClients
      .filter((client) => client.consentGiven)
      .map((client) => client.id);

    if (consentedIds.length === 0) {
      showToast("Select at least one client with marketing consent.");
      return;
    }

    router.push(`/campaigns/new?clientIds=${consentedIds.join(",")}`);
  }, [router, selectedClients, showToast]);

  const nationalitySelectOptions = useMemo(() => {
    if (nationalityFilter && !nationalityOptions.includes(nationalityFilter)) {
      return [nationalityFilter, ...nationalityOptions];
    }

    return nationalityOptions;
  }, [nationalityFilter, nationalityOptions]);

  const handleMarkContacted = useCallback(
    async (client: ClientListItem) => {
      const previousStatus = client.leadStatus;
      if (previousStatus === "contacted") {
        return;
      }

      setUpdatingClientIds((current) => new Set(current).add(client.id));
      setClients((current) =>
        current.map((item) =>
          item.id === client.id ? { ...item, leadStatus: "contacted" } : item
        )
      );

      try {
        await updateClientLeadStatus(authFetch, client.id, "contacted");
        setStatusCounts((current) =>
          adjustStatusCounts(current, previousStatus, "contacted")
        );
        showActionToast(
          `${client.fullName} marked as contacted`,
          "Undo",
          () => {
            setClients((current) =>
              current.map((item) =>
                item.id === client.id
                  ? { ...item, leadStatus: previousStatus }
                  : item
              )
            );
            setStatusCounts((current) =>
              adjustStatusCounts(current, "contacted", previousStatus)
            );

            void updateClientLeadStatus(authFetch, client.id, previousStatus).catch(
              () => {
                setClients((current) =>
                  current.map((item) =>
                    item.id === client.id
                      ? { ...item, leadStatus: "contacted" }
                      : item
                  )
                );
                showToast("Could not undo status change.");
              }
            );
          }
        );
      } catch {
        setClients((current) =>
          current.map((item) =>
            item.id === client.id ? { ...item, leadStatus: previousStatus } : item
          )
        );
        showToast("Could not update lead status.");
      } finally {
        setUpdatingClientIds((current) => {
          const next = new Set(current);
          next.delete(client.id);
          return next;
        });
      }
    },
    [authFetch, showActionToast, showToast]
  );

  const handleOpenMessenger = useCallback(
    (client: ClientListItem, channel: MessengerChannel) => {
      setMessengerTarget({ client, channel });
    },
    []
  );

  const handleConfirmOpenMessenger = useCallback(async () => {
    if (!messengerTarget?.client.phone) {
      return;
    }

    const { client, channel } = messengerTarget;

    if (channel === "whatsapp") {
      const whatsAppUrl = buildWhatsAppWebUrl(client.phone);
      if (!whatsAppUrl) {
        showToast("Enter a valid phone number on the client profile first.");
        return;
      }

      setMessengerBusy(true);
      const whatsAppPopup = window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
      try {
        await recordWhatsAppInitiated(authFetch, client.id);
        if (!whatsAppPopup) {
          showToast("Allow pop-ups to open WhatsApp.");
        }
        setClients((current) =>
          current.map((item) =>
            item.id === client.id
              ? {
                  ...item,
                  lastOutreachAt: new Date().toISOString(),
                  lastOutreachKind: "whatsapp",
                }
              : item
          )
        );
        setMessengerTarget(null);
      } catch (openError) {
        showToast(
          openError instanceof Error
            ? openError.message
            : "Could not log WhatsApp initiation."
        );
      } finally {
        setMessengerBusy(false);
      }
      return;
    }

    const viberDeepLink = buildViberAppDeepLink(client.phone);
    if (!viberDeepLink) {
      showToast("Enter a valid phone number on the client profile first.");
      return;
    }

    setMessengerBusy(true);
    openAppDeepLink(viberDeepLink);
    try {
      await recordViberInitiated(authFetch, client.id);
      setClients((current) =>
        current.map((item) =>
          item.id === client.id
            ? {
                ...item,
                lastOutreachAt: new Date().toISOString(),
                lastOutreachKind: "viber",
              }
            : item
        )
      );
      setMessengerTarget(null);
    } catch (openError) {
      showToast(
        openError instanceof Error
          ? openError.message
          : "Could not log Viber initiation."
      );
    } finally {
      setMessengerBusy(false);
    }
  }, [authFetch, messengerTarget, showToast]);

  const searchNationalityFilters = (
    <ClientSearchNationalityFilters
      searchFilter={searchFilter}
      nationalityFilter={nationalityFilter}
      nationalitySelectOptions={nationalitySelectOptions}
      onSearchCommit={updateSearch}
      onNationalityChange={updateNationality}
    />
  );

  const showClientsEmptyPanel =
    !error && initialized && clients.length === 0 && totalCount === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Clients"
        description="One row per contact — repeat sign-ups merge by phone or email."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting || totalCount === 0}
            className="gap-2"
            onClick={() => void handleExportCsv()}
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <ClientLeadQueueHeader
        statusCounts={statusCounts}
        activeLeadStatus={leadStatusFilter}
        mergeSuspectOnly={mergeSuspectOnly}
        registeredWithinDays={registeredWithinDays}
        followUpDueOnly={followUpDueOnly}
        onLeadStatusChange={updateLeadStatus}
        onMergeSuspectToggle={updateMergeSuspect}
        onRegisteredWithinDaysChange={updateRegisteredWithinDays}
        onFollowUpDueToggle={updateFollowUpDue}
      />

      <div className="rounded-xl border border-border-warm bg-card p-4">
        <div className="md:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-sm font-medium text-text-warm"
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen((current) => !current)}
          >
            <span>
              Search & filters
              {hasActiveFilters && (searchFilter || nationalityFilter)
                ? " (active)"
                : ""}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-text-muted-warm transition-transform",
                mobileFiltersOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>
          {mobileFiltersOpen ? (
            <div className="mt-4 grid gap-4">{searchNationalityFilters}</div>
          ) : null}
        </div>

        <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,1fr)_220px]">
          {searchNationalityFilters}
        </div>
      </div>

      <ClientsFilterBanners
        followUpDue={followUpDueOnly}
        mergeSuspect={mergeSuspectOnly}
        registeredWithinDays={registeredWithinDays}
        createdWithinDays={createdWithinDays}
        leadStatus={leadStatusFilter}
        nationality={nationalityFilter}
        activityId={activityIdFilter}
        activityLabel={activityFilterLabel}
        onClearFollowUpDue={() => updateFollowUpDue(false)}
        onClearMergeSuspect={() => updateMergeSuspect(false)}
        onClearRegisteredWithinDays={() => updateRegisteredWithinDays(null)}
        onClearCreatedWithinDays={() => updateCreatedWithinDays(null)}
        onClearLeadStatus={() => updateLeadStatus(null)}
        onClearNationality={() => updateNationality("")}
        onClearActivity={clearActivityFilter}
      />

      {showClientsEmptyPanel ? (
        <div className="overflow-hidden rounded-xl border border-border-warm bg-card shadow-sm">
          {hasActiveFilters ? (
            <p className="px-4 py-10 text-center text-sm text-text-muted-warm">
              No clients match your search or filters.
            </p>
          ) : (
            <div className="p-4">
              <ProductEmptyState
                icon={Users}
                title="No clients yet"
                description="Publish an activity and share your registration link or QR code — new sign-ups appear here automatically."
                primaryHref="/activities/new"
                primaryLabel="Create an activity"
                className="border-solid"
              />
            </div>
          )}
        </div>
      ) : (
      <div className="overflow-hidden rounded-xl border border-border-warm bg-card shadow-sm">
        <div className={clientsTableScrollClassName}>
          <div className={clientsTableMinWidthClassName}>
            <div
              className={cn(
                clientsTableGridClassName,
                "hidden border-b border-border-warm bg-muted/30 sm:grid"
              )}
              role="row"
            >
              <div className="hidden sm:flex sm:items-center sm:justify-center">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  aria-label="Select all clients on this page"
                  className="size-4 rounded border-input accent-primary"
                  onChange={handleToggleSelectAll}
                />
              </div>
              <div className={clientsTableContactColumnClassName}>
                <button
                  type="button"
                  role="columnheader"
                  aria-sort={
                    sortBy === "name"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={cn(
                    clientsTableHeaderButtonClassName,
                    sortBy === "name" && "text-text-warm"
                  )}
                  onClick={() => handleSort("name")}
                >
                  Contact
                  {sortBy === "name" ? (sortDirection === "asc" ? " ↑" : " ↓") : null}
                </button>
              </div>
              <div className={clientsTableStatusColumnClassName}>
                <button
                  type="button"
                  role="columnheader"
                  aria-sort={
                    sortBy === "status"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={cn(
                    clientsTableHeaderButtonClassName,
                    sortBy === "status" && "text-text-warm"
                  )}
                  onClick={() => handleSort("status")}
                >
                  Status
                  {sortBy === "status" ? (sortDirection === "asc" ? " ↑" : " ↓") : null}
                </button>
              </div>
              <div className={clientsTableRegistrationColumnClassName}>
                <button
                  type="button"
                  role="columnheader"
                  aria-sort={
                    sortBy === "lastRegistrationDate"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={cn(
                    clientsTableHeaderButtonClassName,
                    sortBy === "lastRegistrationDate" && "text-text-warm"
                  )}
                  onClick={() => handleSort("lastRegistrationDate")}
                >
                  Last registration
                  {sortBy === "lastRegistrationDate"
                    ? sortDirection === "asc"
                      ? " ↑"
                      : " ↓"
                    : null}
                </button>
              </div>
              <div className={clientsTableOutreachColumnClassName}>
                <span className={clientsTableHeaderClassName}>Last outreach</span>
              </div>
              <div className={clientsTableActionsColumnClassName}>
                <span className={cn(clientsTableHeaderClassName, "text-right")}>
                  Actions
                </span>
              </div>
            </div>

        {error ? (
          <p role="alert" className="px-4 py-6 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!error && initialized && clients.length === 0 && totalCount > 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted-warm">
            No clients on this page.
          </p>
        ) : null}

        {!error
          ? clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                onMarkContacted={handleMarkContacted}
                onOpenMessenger={handleOpenMessenger}
                isUpdating={updatingClientIds.has(client.id)}
                selectable
                selected={selectedClientIds.has(client.id)}
                onSelectedChange={handleSelectedChange}
                timeZoneId={shell?.registrationTimeZoneId}
              />
            ))
          : null}

        {!error && !initialized ? (
          <div className="p-4">
            <ListSkeleton rows={6} />
          </div>
        ) : null}
          </div>
        </div>
      </div>
      )}

      {totalCount > 0 ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted-warm">
          {`Showing ${(page - 1) * CLIENT_PAGE_SIZE + 1}-${Math.min(page * CLIENT_PAGE_SIZE, totalCount)} of ${totalCount}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-text-muted-warm">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Next
          </Button>
        </div>
      </div>
      ) : null}

      <MessengerOpenConfirmDialog
        channel={messengerTarget?.channel ?? null}
        clientPhoneLabel={
          messengerTarget?.client.phone
            ? formatPhoneDisplay(messengerTarget.client.phone)?.display ?? null
            : null
        }
        open={messengerTarget !== null}
        busy={messengerBusy}
        onOpenChange={(open) => {
          if (!open) {
            setMessengerTarget(null);
          }
        }}
        onConfirm={() => {
          void handleConfirmOpenMessenger();
        }}
      />

      <ClientBulkSelectBar
        selectedCount={selectedClients.length}
        consentedCount={consentedSelectedCount}
        excludedConsentCount={excludedConsentCount}
        canUseCampaignHandoff={canUseCampaignHandoff}
        onClear={() => setSelectedClientsById(new Map())}
        onAddToCampaign={handleAddToCampaign}
      />
    </div>
  );
}
