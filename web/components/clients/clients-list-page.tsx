"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ClientBulkSelectBar } from "@/components/clients/client-bulk-select-bar";
import { ClientLeadQueueHeader } from "@/components/clients/client-lead-queue-header";
import { ClientRow } from "@/components/clients/client-row";
import {
  clientsTableGridClassName,
  clientsTableStatusColumnClassName,
} from "@/components/clients/clients-table-layout";
import { MessengerOpenConfirmDialog } from "@/components/clients/messenger-open-confirm-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  downloadClientsCsvExport,
  exportClientsCsv,
  fetchClientNationalities,
  fetchClients,
  leadStatusLabels,
  leadStatusOptions,
  recordWhatsAppInitiated,
  updateClientLeadStatus,
  type ClientLeadStatusCounts,
  type ClientListItem,
  type ClientSortBy,
  type LeadStatus,
} from "@/lib/clients-api";
import { isCoreOrAbove, isProPlan } from "@/lib/shell/tenant-shell-api";
import { buildWhatsAppWebUrl } from "@/lib/messenger-links";
import { formatPhoneDisplay } from "@/lib/phone-countries";
import { cn } from "@/lib/utils";
import { Download, Users } from "lucide-react";

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

type SortDirection = "asc" | "desc";

const sortColumns: Array<{
  id: ClientSortBy;
  label: string;
  headerLabel?: string;
}> = [
  { id: "name", label: "Name", headerLabel: "Contact" },
  { id: "status", label: "Status" },
  { id: "lastRegistrationDate", label: "Last registration" },
];

function parseLeadStatusFilter(value: string | null): LeadStatus | null {
  if (
    value === "new" ||
    value === "contacted" ||
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return null;
}

function parseCreatedWithinDays(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
}

export function ClientsListPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const { showToast, showActionToast } = useToast();
  const searchParams = useSearchParams();
  const mergeSuspectOnly = searchParams.get("mergeSuspect") === "true";
  const followUpDueOnly = searchParams.get("followUpDue") === "true";
  const createdWithinDays = parseCreatedWithinDays(
    searchParams.get("createdWithinDays")
  );
  const registeredWithinDays = parseCreatedWithinDays(
    searchParams.get("registeredWithinDays")
  );
  const leadStatusFilter = parseLeadStatusFilter(searchParams.get("leadStatus"));
  const nationalityFilter = searchParams.get("nationality")?.trim() ?? "";
  const searchFilter = searchParams.get("search")?.trim() ?? "";
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
  const [messengerClient, setMessengerClient] = useState<ClientListItem | null>(
    null
  );
  const [messengerBusy, setMessengerBusy] = useState(false);
  const [selectedClientsById, setSelectedClientsById] = useState<
    Map<string, ClientListItem>
  >(() => new Map());
  const [isExporting, setIsExporting] = useState(false);

  const selectedClientIds = useMemo(
    () => new Set(selectedClientsById.keys()),
    [selectedClientsById]
  );

  const canUseCampaignHandoff = isProPlan(shell?.plan ?? "Basic");

  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENT_PAGE_SIZE));

  const commitSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();

      if (trimmed) {
        params.set("search", trimmed);
      } else {
        params.delete("search");
      }

      router.replace(
        params.toString() ? `/clients?${params.toString()}` : "/clients"
      );
    },
    [router, searchParams]
  );

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

  function updateLeadStatusFilter(nextStatus: LeadStatus | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextStatus) {
      params.set("leadStatus", nextStatus);
      params.delete("mergeSuspect");
      params.delete("followUpDue");
    } else {
      params.delete("leadStatus");
    }

    router.replace(
      params.toString() ? `/clients?${params.toString()}` : "/clients"
    );
  }

  function updateMergeSuspectFilter(active: boolean) {
    const params = new URLSearchParams(searchParams.toString());

    if (active) {
      params.set("mergeSuspect", "true");
      params.delete("leadStatus");
      params.delete("registeredWithinDays");
      params.delete("createdWithinDays");
      params.delete("followUpDue");
    } else {
      params.delete("mergeSuspect");
    }

    router.replace(
      params.toString() ? `/clients?${params.toString()}` : "/clients"
    );
  }

  function updateRegisteredWithinDaysFilter(days: number | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (days && days > 0) {
      params.set("registeredWithinDays", String(days));
      params.delete("mergeSuspect");
      params.delete("createdWithinDays");
      params.delete("followUpDue");
    } else {
      params.delete("registeredWithinDays");
    }

    router.replace(
      params.toString() ? `/clients?${params.toString()}` : "/clients"
    );
  }

  function updateFollowUpDueFilter(active: boolean) {
    const params = new URLSearchParams(searchParams.toString());

    if (active) {
      params.set("followUpDue", "true");
      params.delete("mergeSuspect");
      params.delete("leadStatus");
      params.delete("registeredWithinDays");
      params.delete("createdWithinDays");
    } else {
      params.delete("followUpDue");
    }

    router.replace(
      params.toString() ? `/clients?${params.toString()}` : "/clients"
    );
  }

  function updateNationalityFilter(nextNationality: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextNationality) {
      params.set("nationality", nextNationality);
    } else {
      params.delete("nationality");
    }

    router.replace(
      params.toString() ? `/clients?${params.toString()}` : "/clients"
    );
  }

  function clearCreatedWithinDaysFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("createdWithinDays");
    router.replace(
      params.toString() ? `/clients?${params.toString()}` : "/clients"
    );
  }

  const hasActiveFilters =
    Boolean(searchFilter) ||
    Boolean(leadStatusFilter) ||
    Boolean(nationalityFilter) ||
    mergeSuspectOnly ||
    followUpDueOnly ||
    Boolean(createdWithinDays) ||
    Boolean(registeredWithinDays);

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

  const handleOpenMessenger = useCallback((client: ClientListItem) => {
    setMessengerClient(client);
  }, []);

  const handleConfirmOpenMessenger = useCallback(async () => {
    if (!messengerClient?.phone) {
      return;
    }

    const whatsAppUrl = buildWhatsAppWebUrl(messengerClient.phone);
    if (!whatsAppUrl) {
      showToast("Enter a valid phone number on the client profile first.");
      return;
    }

    setMessengerBusy(true);
    try {
      await recordWhatsAppInitiated(authFetch, messengerClient.id);
      window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
      setClients((current) =>
        current.map((item) =>
          item.id === messengerClient.id
            ? {
                ...item,
                lastOutreachAt: new Date().toISOString(),
                lastOutreachKind: "whatsapp",
              }
            : item
        )
      );
      setMessengerClient(null);
    } catch (openError) {
      showToast(
        openError instanceof Error
          ? openError.message
          : "Could not log WhatsApp initiation."
      );
    } finally {
      setMessengerBusy(false);
    }
  }, [authFetch, messengerClient, showToast]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Clients"
        description="One row per contact — repeat sign-ups on activities merge by phone or email. Filter new leads, mark contacted, and open WhatsApp without leaving the queue."
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
        onLeadStatusChange={updateLeadStatusFilter}
        onMergeSuspectToggle={updateMergeSuspectFilter}
        onRegisteredWithinDaysChange={updateRegisteredWithinDaysFilter}
        onFollowUpDueToggle={updateFollowUpDueFilter}
      />

      <div className="grid gap-4 rounded-xl border border-border-warm bg-card p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="space-y-2 md:col-span-2 xl:col-span-1">
          <Label htmlFor="client-search">Search</Label>
          <ClientSearchInput
            key={searchFilter}
            committedValue={searchFilter}
            onCommit={commitSearch}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-nationality-filter">Nationality</Label>
          <select
            id="client-nationality-filter"
            value={nationalityFilter}
            onChange={(event) => updateNationalityFilter(event.target.value)}
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

        <div className="space-y-2">
          <Label htmlFor="client-status-filter">Lead status</Label>
          <select
            id="client-status-filter"
            value={leadStatusFilter ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              updateLeadStatusFilter(
                value === "" ? null : (value as LeadStatus)
              );
            }}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All statuses</option>
            {leadStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {followUpDueOnly ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Showing clients with a follow-up due today or overdue.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateFollowUpDueFilter(false)}
          >
            Clear filter
          </Button>
        </div>
      ) : null}

      {mergeSuspectOnly ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Showing merge-suspect clients only.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateMergeSuspectFilter(false)}
          >
            Clear filter
          </Button>
        </div>
      ) : null}

      {registeredWithinDays ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            Showing clients with a registration in the last {registeredWithinDays}{" "}
            day
            {registeredWithinDays === 1 ? "" : "s"}.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateRegisteredWithinDaysFilter(null)}
          >
            Clear filter
          </Button>
        </div>
      ) : null}

      {createdWithinDays && !registeredWithinDays ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            Showing clients created in the last {createdWithinDays} day
            {createdWithinDays === 1 ? "" : "s"}.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCreatedWithinDaysFilter}
          >
            Clear filter
          </Button>
        </div>
      ) : null}

      {leadStatusFilter && !mergeSuspectOnly && !createdWithinDays && !registeredWithinDays ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            Showing clients with status {leadStatusLabels[leadStatusFilter]}.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateLeadStatusFilter(null)}
          >
            Clear status filter
          </Button>
        </div>
      ) : null}

      {nationalityFilter && !mergeSuspectOnly && !createdWithinDays && !registeredWithinDays ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Showing clients with nationality {nationalityFilter}.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateNationalityFilter("")}
          >
            Clear nationality filter
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border-warm bg-card shadow-sm">
        <div
          className={cn(
            clientsTableGridClassName,
            "hidden border-b border-border-warm bg-muted/30 py-3 sm:grid"
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
          {sortColumns.map((column) => {
            const isActive = sortBy === column.id;
            const directionLabel =
              isActive && sortDirection === "asc" ? "ascending" : "descending";
            const isStatusColumn = column.id === "status";

            return (
              <div
                key={column.id}
                className={cn(
                  "min-w-0",
                  isStatusColumn && clientsTableStatusColumnClassName
                )}
              >
                <button
                  type="button"
                  role="columnheader"
                  aria-sort={isActive ? directionLabel : "none"}
                  className={cn(
                    "w-full min-w-0 p-0 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm",
                    isActive && "text-text-warm"
                  )}
                  onClick={() => handleSort(column.id)}
                >
                  {column.headerLabel ?? column.label}
                  {isActive ? (sortDirection === "asc" ? " ↑" : " ↓") : null}
                </button>
              </div>
            );
          })}
          <span className="hidden min-w-0 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm sm:block">
            Last outreach
          </span>
          <span className="hidden min-w-0 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm sm:block">
            Actions
          </span>
        </div>

        {error ? (
          <p role="alert" className="px-4 py-6 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!error && initialized && clients.length === 0 && totalCount === 0 ? (
          hasActiveFilters ? (
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
                secondaryHref="/clients?leadStatus=new"
                secondaryLabel="View new leads filter"
                className="border-solid"
              />
            </div>
          )
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted-warm">
          {totalCount === 0
            ? "0 clients"
            : `Showing ${(page - 1) * CLIENT_PAGE_SIZE + 1}-${Math.min(page * CLIENT_PAGE_SIZE, totalCount)} of ${totalCount}`}
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

      <MessengerOpenConfirmDialog
        channel={messengerClient ? "whatsapp" : null}
        clientPhoneLabel={
          messengerClient?.phone
            ? formatPhoneDisplay(messengerClient.phone)?.display ?? null
            : null
        }
        open={messengerClient !== null}
        busy={messengerBusy}
        onOpenChange={(open) => {
          if (!open) {
            setMessengerClient(null);
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
