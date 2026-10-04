"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListTodo } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { FollowUpCategoryFilters } from "@/components/follow-up/follow-up-category-filters";
import { FollowUpResults } from "@/components/follow-up/follow-up-results";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { Button } from "@/components/ui/button";
import { CLIENTS_PATH, DASHBOARD_PATH } from "@/lib/admin-canonical-routes";
import type { ClientListItem } from "@/lib/clients-api";
import {
  FOLLOW_UP_CATEGORY_QUERY_KEY,
  FOLLOW_UP_DEFAULT_PAGE,
  FOLLOW_UP_PAGE_QUERY_KEY,
  classifyFollowUpFetchFailure,
  classifyFollowUpListState,
  commitFollowUpCategoryChange,
  commitFollowUpPageChange,
  emptyFollowUpCategoryCounts,
  followUpCategoryLabel,
  followUpHrefForCategory,
  followUpPageCount,
  loadFollowUpPage,
  needsAttentionCount,
  reconcileFollowUpPage,
  resolveFollowUpCategoryParam,
  resolveFollowUpPageParam,
  type FollowUpCategory,
  type FollowUpCategoryCounts,
} from "@/lib/follow-up-category";

export function FollowUpPageClient() {
  const { authFetch, status } = useAuth();
  const { shell, loading: shellLoading } = useTenantShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = resolveFollowUpCategoryParam(
    searchParams.get(FOLLOW_UP_CATEGORY_QUERY_KEY)
  );
  const page = resolveFollowUpPageParam(searchParams.get(FOLLOW_UP_PAGE_QUERY_KEY));
  const timeZoneId = shell?.registrationTimeZoneId ?? null;

  const [items, setItems] = useState<ClientListItem[]>([]);
  const [counts, setCounts] = useState<FollowUpCategoryCounts>(emptyFollowUpCategoryCounts());
  const [pageSize, setPageSize] = useState(25);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"none" | "recoverable" | "permission">(
    "none"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const fetchKey = `${category}:${page}:${reloadToken}`;
  const waitingForPage = activeKey !== fetchKey;

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    void loadFollowUpPage(authFetch, { category, page })
      .then((result) => {
        if (cancelled) {
          return;
        }

        const reconciled = reconcileFollowUpPage(page, result.totalCount, result.pageSize);
        if (result.items.length === 0 && page > FOLLOW_UP_DEFAULT_PAGE) {
          const nextPage = reconciled === page ? FOLLOW_UP_DEFAULT_PAGE : reconciled;
          const currentSearch = window.location.search;
          router.replace(
            followUpHrefForCategory(category, currentSearch, nextPage),
            { scroll: false }
          );
          return;
        }

        setItems(result.items);
        setCounts(result.counts);
        setPageSize(result.pageSize);
        setErrorKind("none");
        setErrorMessage(null);
        setActiveKey(fetchKey);
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        const kind = classifyFollowUpFetchFailure(loadError);
        setItems([]);
        setCounts(emptyFollowUpCategoryCounts());
        setErrorKind(kind);
        setErrorMessage(
          kind === "permission"
            ? "You don’t have access to Follow-up."
            : "We couldn’t load Follow-up. Your list wasn’t changed. Try again."
        );
        setActiveKey(fetchKey);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, category, fetchKey, page, reloadToken, router, status]);

  const attentionCount = needsAttentionCount(counts);
  const initialLoading = activeKey === null;
  const listState = classifyFollowUpListState({
    loading:
      status !== "authenticated" ||
      (initialLoading && waitingForPage) ||
      (shellLoading && !shell) ||
      (waitingForPage && !initialLoading && errorKind === "none" && counts[category] === 0),
    errorKind,
    needsAttentionCount: attentionCount,
    selectedCount: counts[category],
  });
  const resultsLoading = !initialLoading && waitingForPage && errorKind === "none";
  const selectedTotal = counts[category];
  const pageCount = followUpPageCount(selectedTotal, pageSize);
  const categorized = items.map((client) => ({
    ...client,
    category,
  }));

  function liveSearch() {
    return typeof window !== "undefined" ? window.location.search : searchParams.toString();
  }

  function handleCategoryChange(next: FollowUpCategory) {
    commitFollowUpCategoryChange({
      category: next,
      currentCategory: category,
      liveSearch: liveSearch(),
      replace: (href) => {
        router.replace(href, { scroll: false });
      },
    });
  }

  function handlePageChange(nextPage: number) {
    commitFollowUpPageChange({
      page: nextPage,
      currentPage: page,
      category,
      liveSearch: liveSearch(),
      replace: (href) => {
        router.replace(href, { scroll: false });
      },
    });
  }

  const supporting =
    listState === "populated" || listState === "filter-empty" || listState === "global-empty"
      ? attentionCount === 1
        ? "1 person needs follow-up."
        : `${attentionCount} people need follow-up.`
      : undefined;

  return (
    <div className="space-y-6 pb-20 md:pb-24">
      <PageHeader title="Follow-up" description={supporting} />

      {listState === "loading" ? (
        <div aria-busy="true" aria-label="Loading Follow-up">
          <ListSkeleton rows={6} />
        </div>
      ) : null}

      {listState === "error" ? (
        <ProductErrorState
          title="Could not load Follow-up"
          message={
            errorMessage ??
            "We couldn’t load Follow-up. Your list wasn’t changed. Try again."
          }
          backHref={DASHBOARD_PATH}
          backLabel="Back to Dashboard"
          className="[&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11 [&_a]:min-w-11"
          actions={
            <Button
              type="button"
              variant="outline"
              className="min-h-11 min-w-11"
              onClick={() => {
                setErrorKind("none");
                setActiveKey(null);
                setReloadToken((current) => current + 1);
              }}
            >
              Try again
            </Button>
          }
        />
      ) : null}

      {listState === "permission" ? (
        <ProductErrorState
          title="You don’t have access to Follow-up"
          message="This room is available to tenant operators. Ask a tenant admin if you need access."
          backHref={DASHBOARD_PATH}
          backLabel="Back to Dashboard"
        />
      ) : null}

      {listState === "global-empty" ||
      listState === "filter-empty" ||
      listState === "populated" ? (
        <FollowUpCategoryFilters
          value={category}
          counts={counts}
          onChange={handleCategoryChange}
        />
      ) : null}

      {listState === "global-empty" ? (
        <ProductEmptyState
          icon={ListTodo}
          title="No one needs follow-up."
          description="Healthy relationships stay listable. This view does not change client records."
          primaryHref={DASHBOARD_PATH}
          primaryLabel="Back to Dashboard"
          secondaryHref={CLIENTS_PATH}
          secondaryLabel="View clients"
        />
      ) : null}

      {listState === "filter-empty" ? (
        <ProductEmptyState
          icon={ListTodo}
          title={`No one in ${followUpCategoryLabel(category)}.`}
          description="Try another category. This filter does not change client records."
          primaryHref={DASHBOARD_PATH}
          primaryLabel="Back to Dashboard"
          secondaryHref={CLIENTS_PATH}
          secondaryLabel="View clients"
        />
      ) : null}

      {listState === "populated" && resultsLoading ? (
        <div aria-busy="true" aria-label="Loading Follow-up page">
          <ListSkeleton rows={4} />
        </div>
      ) : null}

      {listState === "populated" && !resultsLoading ? (
        <>
          <FollowUpResults results={categorized} timeZoneId={timeZoneId} />
          {selectedTotal > pageSize || page > FOLLOW_UP_DEFAULT_PAGE ? (
            <nav
              aria-label="Follow-up pages"
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-h-[44px] min-w-11 min-w-[44px]"
                aria-label="Previous page"
                disabled={page <= FOLLOW_UP_DEFAULT_PAGE}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              <p className="text-sm text-text-muted-warm">
                Page {page} of {pageCount}
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-h-[44px] min-w-11 min-w-[44px]"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
