"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ActivityCard } from "@/components/activities/activity-card";
import { useAuth } from "@/components/auth/auth-provider";
import { CardGridSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchActivities,
  type Activity,
  type ActivityStatus,
} from "@/lib/activities-api";
import { fetchCategories } from "@/lib/categories-api";
import { fetchCommunities } from "@/lib/communities-api";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const ACTIVITY_PAGE_SIZE = 25;
const ACTIVITY_SEARCH_DEBOUNCE_MS = 400;

const filterSelectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const statusFilterOptions: Array<{ value: ActivityStatus | ""; label: string }> =
  [
    { value: "", label: "All statuses" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
  ];

function parseStatusFilter(value: string | null): ActivityStatus | "" {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  return "";
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
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

export function ActivitiesListPage() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "">(() =>
    parseStatusFilter(searchParams.get("status"))
  );
  const [categoryFilter, setCategoryFilter] = useState(
    () => searchParams.get("category") ?? ""
  );
  const [communityFilter, setCommunityFilter] = useState(
    () => searchParams.get("community") ?? ""
  );
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / ACTIVITY_PAGE_SIZE));

  const commitSearch = useCallback((value: string) => {
    setSearch(value.trim());
    setPage(1);
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    void fetchActivities(authFetch, {
      status: statusFilter,
      category: categoryFilter,
      community: communityFilter,
      search: search || undefined,
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
          setTotalCount(result.totalCount);
          setError(null);
          setInitialized(true);
          setPage(nextTotalPages);
          return;
        }

        setActivities(result.items);
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
            : "Could not load activities."
        );
        setInitialized(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, categoryFilter, communityFilter, page, search, statusFilter]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setCategoryFilter("");
    setCommunityFilter("");
    setPage(1);
  }

  function updateStatusFilter(nextStatus: ActivityStatus | "") {
    setStatusFilter(nextStatus);
    setPage(1);
  }

  function updateCategoryFilter(nextCategory: string) {
    setCategoryFilter(nextCategory);
    setPage(1);
  }

  function updateCommunityFilter(nextCommunity: string) {
    setCommunityFilter(nextCommunity);
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(statusFilter) ||
    Boolean(categoryFilter) ||
    Boolean(communityFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Launch and manage your lead engines."
        actions={
          <Link href="/activities/new" className={cn(buttonVariants())}>
            New activity
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 sm:col-span-2 xl:col-span-1">
          <Label htmlFor="activity-search">Search</Label>
          <ActivitySearchInput
            key={search}
            committedValue={search}
            onCommit={commitSearch}
          />
          <p className="text-xs text-text-muted-warm">
            Search runs on the server across all activities.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-status">Status</Label>
          <select
            id="activity-status"
            value={statusFilter}
            onChange={(event) =>
              updateStatusFilter(event.target.value as ActivityStatus | "")
            }
            className={filterSelectClassName}
          >
            {statusFilterOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-community">Community</Label>
          <select
            id="activity-community"
            value={communityFilter}
            onChange={(event) => updateCommunityFilter(event.target.value)}
            className={filterSelectClassName}
          >
            <option value="">All communities</option>
            {communities.map((community) => (
              <option key={community.id} value={community.name}>
                {community.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-category">Category</Label>
          <select
            id="activity-category"
            value={categoryFilter}
            onChange={(event) => updateCategoryFilter(event.target.value)}
            className={filterSelectClassName}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {catalogError ? (
        <p role="alert" className="text-sm text-destructive">
          {catalogError}
        </p>
      ) : null}

      {!initialized ? <CardGridSkeleton count={6} /> : null}

      {initialized && error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {initialized && !error && activities.length === 0 ? (
        hasActiveFilters ? (
          <div className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center">
            <p className="text-sm text-text-muted-warm">
              No activities match your current filters.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
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
        )
      ) : null}

      {initialized && !error && activities.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
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
                size="sm"
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
                size="sm"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
