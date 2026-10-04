"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ActivitiesAtCapBanner } from "@/components/activities/activities-at-cap-banner";
import { ActivitiesRecoveryChips } from "@/components/activities/activities-recovery-chips";
import { ActivityCard } from "@/components/activities/activity-card";
import { useActivityScheduleConflicts } from "@/components/activities/use-activity-schedule-conflicts";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { CardGridSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activitiesListErrorCopy,
  classifyActivitiesListState,
  classifyActivityRequestFailure,
  type ActivityRequestKind,
} from "@/lib/activities-40-4-contract";
import {
  activitiesContextFromSearch,
  appendContinuityContext,
} from "@/lib/continuity-context";
import {
  applyActivitySortToSearchParams,
  fetchActivities,
  isDefaultActivitySort,
  parseActivitySortFromSearchParams,
  resolveActivityListSort,
  type Activity,
  type ActivitySortBy,
  type ActivitySortDirection,
  type ActivityStatus,
} from "@/lib/activities-api";
import { fetchCategories } from "@/lib/categories-api";
import { fetchCommunities } from "@/lib/communities-api";
import {
  getActivitiesAtCapBannerState,
  getPublishedActivitiesUsageCount,
  getRegistrationsDialForCards,
  isPublishedActivitiesBlocked,
  shouldShowActivitiesRecoveryChips,
  shouldShowPublishedOnlyChip,
} from "@/lib/plan-limit-utils";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronDown } from "lucide-react";

const ACTIVITY_PAGE_SIZE = 20;
const ACTIVITY_SEARCH_DEBOUNCE_MS = 400;

function parseActivitiesPage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

const statusFilterOptions: Array<{ value: ActivityStatus | ""; label: string }> =
  [
    { value: "", label: "All statuses" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
  ];

const sortFilterOptions: Array<{
  value: `${ActivitySortBy}:${ActivitySortDirection}`;
  label: string;
}> = [
  { value: "updatedAt:desc", label: "Last updated" },
  { value: "createdAt:desc", label: "Created" },
  { value: "name:asc", label: "Name" },
  { value: "registrationCount:desc", label: "Registrations" },
];

function parseStatusFilter(value: string | null): ActivityStatus | "" {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  return "";
}

function resolveSortSelectValue(
  sortBy: ActivitySortBy,
  sortDirection: ActivitySortDirection
): `${ActivitySortBy}:${ActivitySortDirection}` {
  const candidate = `${sortBy}:${sortDirection}` as `${ActivitySortBy}:${ActivitySortDirection}`;

  if (sortFilterOptions.some((option) => option.value === candidate)) {
    return candidate;
  }

  const presetForField = sortFilterOptions.find((option) =>
    option.value.startsWith(`${sortBy}:`)
  );

  return presetForField?.value ?? "updatedAt:desc";
}

type ActivitySearchInputProps = {
  committedValue: string;
  onCommit: (value: string) => void;
};

function ActivitySearchInput({ committedValue, onCommit }: ActivitySearchInputProps) {
  const [draft, setDraft] = useState(committedValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft === committedValue) {
        return;
      }

      onCommit(draft);
    }, ACTIVITY_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [committedValue, draft, onCommit]);

  return (
    <Input
      id="activity-search"
      type="search"
      placeholder="Search by name, community, category, or location"
      className="min-h-11"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

export function ActivitiesListPage() {
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const atCapBannerState = getActivitiesAtCapBannerState(shell);
  const showRecoveryChips = shouldShowActivitiesRecoveryChips(shell);
  const showPublishedOnlyChip = shouldShowPublishedOnlyChip(shell);
  const publishedBlocked = isPublishedActivitiesBlocked(shell);
  const publishedCount = getPublishedActivitiesUsageCount(shell);
  const planRegistrationsDial = getRegistrationsDialForCards(shell);
  const {
    getConflictsForActivity,
    ready: conflictsReady,
    error: conflictError,
  } = useActivityScheduleConflicts();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const searchFilter = searchParams.get("search")?.trim() ?? "";
  const categoryFilter = searchParams.get("category")?.trim() ?? "";
  const communityFilter = searchParams.get("community")?.trim() ?? "";
  const page = parseActivitiesPage(searchParams.get("page"));
  const { sortBy, sortDirection } = parseActivitySortFromSearchParams(
    searchParams.get("sortBy"),
    searchParams.get("sortDirection")
  );
  const sortSelectValue = resolveSortSelectValue(sortBy, sortDirection);
  const listContext = activitiesContextFromSearch(searchParams.toString());
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ActivityRequestKind | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activityGridRef = useRef<HTMLDivElement>(null);
  const recoveryChipsRef = useRef<HTMLDivElement>(null);
  const listQueryKey = [
    statusFilter,
    searchFilter,
    categoryFilter,
    communityFilter,
    sortBy,
    sortDirection,
    page,
  ].join("\0");

  const totalPages = Math.max(1, Math.ceil(totalCount / ACTIVITY_PAGE_SIZE));

  const replaceListParams = useCallback(
    (mutator: (params: URLSearchParams) => void, options?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      mutator(params);
      if (options?.resetPage !== false) {
        params.delete("page");
      }
      router.replace(
        params.toString() ? `/activities?${params.toString()}` : "/activities"
      );
    },
    [router, searchParams]
  );

  const updatePage = useCallback(
    (nextPage: number) => {
      replaceListParams((params) => {
        if (nextPage > 1) {
          params.set("page", String(nextPage));
        } else {
          params.delete("page");
        }
      }, { resetPage: false });
    },
    [replaceListParams]
  );

  const commitSearch = useCallback(
    (value: string) => {
      replaceListParams((params) => {
        const trimmed = value.trim();
        if (trimmed) {
          params.set("search", trimmed);
        } else {
          params.delete("search");
        }
      });
    },
    [replaceListParams]
  );

  const scrollToActivityGrid = useCallback(() => {
    window.requestAnimationFrame(() => {
      activityGridRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const applyPublishedFilter = useCallback(() => {
    replaceListParams((params) => {
      params.set("status", "published");
    });
  }, [replaceListParams]);

  useEffect(() => {
    if (statusFilter !== "published") {
      setRecoveryMode(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;

    void fetchActivities(authFetch, {
      status: statusFilter,
      category: categoryFilter,
      community: communityFilter,
      search: searchFilter || undefined,
      sortBy,
      sortDirection,
      page,
      pageSize: ACTIVITY_PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        const nextTotalPages = Math.max(
          1,
          Math.ceil(result.totalCount / ACTIVITY_PAGE_SIZE)
        );
        if (page > nextTotalPages) {
          setActivities([]);
          setTotalCount(result.totalCount);
          setError(null);
          setErrorKind(null);
          setInitialized(true);
          updatePage(nextTotalPages);
          return;
        }

        setActivities(result.items);
        setTotalCount(result.totalCount);
        setError(null);
        setErrorKind(null);
        setInitialized(true);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        const kind = classifyActivityRequestFailure(loadError);
        setErrorKind(kind);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load activities."
        );
        setInitialized(true);
      });

    return () => {
      cancelled = true;
    };
  }, [
    authFetch,
    categoryFilter,
    communityFilter,
    listQueryKey,
    page,
    searchFilter,
    sortBy,
    sortDirection,
    statusFilter,
    updatePage,
  ]);

  useEffect(() => {
    const { sortBy: resolvedSortBy, sortDirection: resolvedSortDirection, hadInvalidSortParams } =
      resolveActivityListSort(
        searchParams.get("sortBy"),
        searchParams.get("sortDirection")
      );

    if (!hadInvalidSortParams) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    applyActivitySortToSearchParams(params, resolvedSortBy, resolvedSortDirection);
    router.replace(
      params.toString() ? `/activities?${params.toString()}` : "/activities"
    );
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([fetchCommunities(authFetch), fetchCategories(authFetch)])
      .then(([communityItems, categoryItems]) => {
        if (cancelled) {
          return;
        }

        setCommunities(communityItems);
        setCategories(categoryItems);
        setCatalogError(null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setCatalogError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load communities and categories."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  function clearFilters() {
    setRecoveryMode(false);
    router.replace("/activities");
  }

  function updateStatusFilter(nextStatus: ActivityStatus | "") {
    replaceListParams((params) => {
      if (nextStatus) {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }
    });

    if (nextStatus !== "published") {
      setRecoveryMode(false);
    }
  }

  function updateCategoryFilter(nextCategory: string) {
    replaceListParams((params) => {
      if (nextCategory) {
        params.set("category", nextCategory);
      } else {
        params.delete("category");
      }
    });
  }

  function updateCommunityFilter(nextCommunity: string) {
    replaceListParams((params) => {
      if (nextCommunity) {
        params.set("community", nextCommunity);
      } else {
        params.delete("community");
      }
    });
  }

  function updateSortFilter(value: `${ActivitySortBy}:${ActivitySortDirection}`) {
    const [nextSortBy, nextSortDirection] = value.split(":") as [
      ActivitySortBy,
      ActivitySortDirection,
    ];

    replaceListParams((params) => {
      applyActivitySortToSearchParams(params, nextSortBy, nextSortDirection);
    });
  }

  function handleReviewPublished() {
    applyPublishedFilter();
    scrollToActivityGrid();
  }

  function handlePublishedOnlyClick() {
    if (statusFilter === "published") {
      updateStatusFilter("");
      return;
    }

    applyPublishedFilter();
  }

  function handleFreeASlotClick() {
    setRecoveryMode(true);
    applyPublishedFilter();
    scrollToActivityGrid();
  }

  function focusFreeASlotChip() {
    document.getElementById("free-a-slot-chip")?.focus();
    recoveryChipsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  const hasActiveFilters =
    Boolean(searchFilter) ||
    Boolean(statusFilter) ||
    Boolean(categoryFilter) ||
    Boolean(communityFilter) ||
    !isDefaultActivitySort(sortBy, sortDirection);
  const listState = classifyActivitiesListState({
    initialized,
    error,
    errorKind,
    itemCount: activities.length,
    hasActiveFilters,
  });
  const listErrorCopy = activitiesListErrorCopy(errorKind ?? "error");

  return (
    <div className="space-y-6" data-activities-list-state={listState}>
      <PageHeader
        title="Activities"
        description="Launch and manage your lead engines."
        actions={
          publishedBlocked ? (
            <Button
              type="button"
              variant="secondary"
              title="Free a published slot first — use the Free a slot chip below"
              aria-describedby="free-a-slot-chip"
              onClick={focusFreeASlotChip}
            >
              New activity
            </Button>
          ) : (
            <Link href="/activities/new" className={cn(buttonVariants())}>
              New activity
            </Link>
          )
        }
      />

      {atCapBannerState ? (
        <ActivitiesAtCapBanner
          state={atCapBannerState}
          showUpgradeLink={shell?.isTenantAdmin ?? false}
          tenantSlug={shell?.tenantSlug ?? "unknown"}
          onReviewPublished={handleReviewPublished}
        />
      ) : null}

      {showRecoveryChips ? (
        <ActivitiesRecoveryChips
          ref={recoveryChipsRef}
          publishedCount={publishedCount}
          publishedFilterActive={statusFilter === "published"}
          showPublishedOnlyChip={showPublishedOnlyChip}
          showFreeASlotChip={publishedBlocked}
          recoveryMode={recoveryMode}
          onPublishedOnlyClick={handlePublishedOnlyClick}
          onFreeASlotClick={handleFreeASlotClick}
        />
      ) : null}

      <div className="rounded-xl border border-border-warm bg-card p-4 md:border-0 md:bg-transparent md:p-0">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-2 text-sm font-medium text-text-warm md:hidden"
          aria-expanded={mobileFiltersOpen}
          onClick={() => setMobileFiltersOpen((current) => !current)}
        >
          <span>
            Filters
            {hasActiveFilters ? " (active)" : ""}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-text-muted-warm transition-transform",
              mobileFiltersOpen && "rotate-180"
            )}
            aria-hidden
          />
        </button>

        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end",
            !mobileFiltersOpen && "hidden md:grid",
            mobileFiltersOpen && "mt-4 md:mt-0"
          )}
        >
        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
          <Label htmlFor="activity-search">Search</Label>
          <ActivitySearchInput
            key={searchFilter}
            committedValue={searchFilter}
            onCommit={commitSearch}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-status">Status</Label>
          <FilterSelect
            id="activity-status"
            className="min-h-11"
            value={statusFilter}
            active={statusFilter !== ""}
            onChange={(event) =>
              updateStatusFilter(event.target.value as ActivityStatus | "")
            }
          >
            {statusFilterOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-community">Community</Label>
          <FilterSelect
            id="activity-community"
            className="min-h-11"
            value={communityFilter}
            active={communityFilter !== ""}
            onChange={(event) => updateCommunityFilter(event.target.value)}
          >
            <option value="">All communities</option>
            {communities.map((community) => (
              <option key={community.id} value={community.name}>
                {community.name}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-category">Category</Label>
          <FilterSelect
            id="activity-category"
            className="min-h-11"
            value={categoryFilter}
            active={categoryFilter !== ""}
            onChange={(event) => updateCategoryFilter(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-sort">Sort by</Label>
          <FilterSelect
            id="activity-sort"
            className="min-h-11"
            value={sortSelectValue}
            active={!isDefaultActivitySort(sortBy, sortDirection)}
            onChange={(event) =>
              updateSortFilter(
                event.target.value as `${ActivitySortBy}:${ActivitySortDirection}`
              )
            }
          >
            {sortFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </div>
        </div>
        <p className="text-xs text-text-muted-warm md:mt-1">
          Search runs on the server across all activities.
        </p>
      </div>

      {catalogError ? (
        <p role="alert" className="text-sm text-destructive">
          {catalogError}
        </p>
      ) : null}

      {conflictError ? (
        <p role="status" className="text-sm text-text-muted-warm">
          Schedule conflict check unavailable: {conflictError}
        </p>
      ) : null}

      {!initialized ? <CardGridSkeleton count={6} /> : null}

      {listState === "error" || listState === "permission" ? (
        <ProductErrorState
          title={listErrorCopy.title}
          message={error ?? listErrorCopy.message}
          onRetry={() => {
            setInitialized(false);
            setError(null);
            setErrorKind(null);
            void fetchActivities(authFetch, {
              status: statusFilter,
              category: categoryFilter,
              community: communityFilter,
              search: searchFilter || undefined,
              sortBy,
              sortDirection,
              page,
              pageSize: ACTIVITY_PAGE_SIZE,
            })
              .then((result) => {
                setActivities(result.items);
                setTotalCount(result.totalCount);
                setError(null);
                setErrorKind(null);
                setInitialized(true);
              })
              .catch((loadError) => {
                const kind = classifyActivityRequestFailure(loadError);
                setErrorKind(kind);
                setError(
                  loadError instanceof Error
                    ? loadError.message
                    : "Could not load activities."
                );
                setInitialized(true);
              });
          }}
        />
      ) : null}

      {listState === "empty" || listState === "no-match" ? (
        <div ref={activityGridRef}>
          {listState === "no-match" ? (
            <div className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center">
              <h2 className="text-section text-text-warm">
                No activities match your current filters.
              </h2>
              <p className="mt-2 text-sm text-text-muted-warm">
                Archived stays available when you choose that status filter.
              </p>
              <Button variant="outline" className="mt-4 min-h-11 min-w-11" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <ProductEmptyState
              icon={CalendarDays}
              title="No activities yet"
              description="Create your first activity to get a registration form, QR code, and shareable link for your next community event."
              primaryHref="/activities/new"
              primaryLabel="Create your first activity"
              secondaryHref="/activities/communities"
              secondaryLabel="Manage communities"
            />
          )}
        </div>
      ) : null}

      {listState === "populated" ? (
        <div ref={activityGridRef}>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                href={appendContinuityContext(`/activities/${activity.id}`, listContext)}
                registrationsHref={appendContinuityContext(
                  `/activities/${activity.id}?tab=registrations`,
                  listContext
                )}
                planRegistrationsDial={planRegistrationsDial}
                conflictingActivities={
                  conflictsReady && !conflictError
                    ? getConflictsForActivity(activity.id)
                    : []
                }
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-border-warm pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-muted-warm">
              {totalCount === 0
                ? "No activities"
                : `Showing ${(page - 1) * ACTIVITY_PAGE_SIZE + 1}-${Math.min(page * ACTIVITY_PAGE_SIZE, totalCount)} of ${totalCount}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                disabled={page <= 1}
                onClick={() => updatePage(Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-text-muted-warm">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                disabled={page >= totalPages}
                onClick={() => updatePage(Math.min(totalPages, page + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
