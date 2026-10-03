"use client";

import { useEffect, useMemo, useState } from "react";
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
import { CLIENTS_PATH, DASHBOARD_PATH } from "@/lib/admin-canonical-routes";
import type { ClientListItem } from "@/lib/clients-api";
import {
  FOLLOW_UP_CATEGORY_QUERY_KEY,
  classifyFollowUpFetchFailure,
  classifyFollowUpListState,
  commitFollowUpCategoryChange,
  countFollowUpCategories,
  emptyFollowUpCategoryCounts,
  followUpCategoryLabel,
  loadFollowUpClients,
  needsAttentionCount,
  resolveFollowUpCategory,
  resolveFollowUpCategoryParam,
  type FollowUpCategory,
} from "@/lib/follow-up-category";

export function FollowUpPageClient() {
  const { authFetch, status } = useAuth();
  const { shell } = useTenantShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = resolveFollowUpCategoryParam(
    searchParams.get(FOLLOW_UP_CATEGORY_QUERY_KEY)
  );
  const timeZoneId = shell?.registrationTimeZoneId ?? null;

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<"none" | "recoverable" | "permission">(
    "none"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorKind("none");
    setErrorMessage(null);

    void loadFollowUpClients(authFetch)
      .then((items) => {
        if (cancelled) {
          return;
        }
        setClients(items);
        setErrorKind("none");
        setErrorMessage(null);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        const kind = classifyFollowUpFetchFailure(loadError);
        setClients([]);
        setErrorKind(kind);
        setErrorMessage(
          kind === "permission"
            ? "You don’t have access to Follow-up."
            : loadError instanceof Error && loadError.message.trim()
              ? loadError.message
              : "Could not load Follow-up."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, reloadToken, status]);

  const counts = useMemo(
    () => (loading || errorKind !== "none" ? emptyFollowUpCategoryCounts() : countFollowUpCategories(clients, timeZoneId)),
    [clients, errorKind, loading, timeZoneId]
  );
  const attentionCount = needsAttentionCount(counts);
  const categorized = useMemo(
    () =>
      clients
        .map((client) => ({
          ...client,
          category: resolveFollowUpCategory(client, timeZoneId),
        }))
        .filter((client) => client.category === category),
    [category, clients, timeZoneId]
  );
  const listState = classifyFollowUpListState({
    loading: status !== "authenticated" || loading,
    errorKind,
    needsAttentionCount: attentionCount,
    selectedCount: categorized.length,
  });

  function handleCategoryChange(next: FollowUpCategory) {
    const liveSearch =
      typeof window !== "undefined" ? window.location.search : searchParams.toString();
    commitFollowUpCategoryChange({
      category: next,
      currentCategory: category,
      liveSearch,
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
    <div className="space-y-6">
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
          onRetry={() => {
            setLoading(true);
            setErrorKind("none");
            setReloadToken((current) => current + 1);
          }}
          retryLabel="Try again"
          backHref={DASHBOARD_PATH}
          backLabel="Back to Dashboard"
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

      {listState === "populated" ? (
        <FollowUpResults results={categorized} timeZoneId={timeZoneId} />
      ) : null}
    </div>
  );
}
