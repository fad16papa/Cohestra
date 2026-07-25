"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  fetchActivityRegistrations,
  type ActivityRegistrationListItem,
} from "@/lib/activities-api";
import { cn } from "@/lib/utils";

const REGISTRATION_PAGE_SIZE = 25;

type ActivityRegistrationsTabProps = {
  activityId: string;
};

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ActivityRegistrationsTab({
  activityId,
}: ActivityRegistrationsTabProps) {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<ActivityRegistrationListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / REGISTRATION_PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);

    void fetchActivityRegistrations(authFetch, activityId, {
      page,
      pageSize: REGISTRATION_PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        const nextTotalPages = Math.max(
          1,
          Math.ceil(result.totalCount / REGISTRATION_PAGE_SIZE)
        );
        if (page > nextTotalPages) {
          setTotalCount(result.totalCount);
          setError(null);
          setInitialized(true);
          setIsFetching(false);
          setPage(nextTotalPages);
          return;
        }

        setItems(result.items);
        setTotalCount(result.totalCount);
        setError(null);
        setInitialized(true);
        setIsFetching(false);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load registrations."
        );
        setInitialized(true);
        setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activityId, authFetch, page]);

  useEffect(() => {
    setPage(1);
    setInitialized(false);
    setIsFetching(true);
    setItems([]);
    setTotalCount(0);
    setError(null);
  }, [activityId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-section text-text-warm">Registrations</h3>
        {initialized && !error ? (
          <p className="text-sm text-text-muted-warm">
            {totalCount === 0
              ? "No sign-ups yet"
              : `${totalCount} total`}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border-warm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-muted/30 text-left">
              <th
                scope="col"
                className="px-4 py-2.5 text-xs font-medium text-text-muted-warm"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-xs font-medium text-text-muted-warm"
              >
                Registrant
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-xs font-medium text-text-muted-warm"
              >
                Submitted
              </th>
            </tr>
          </thead>
          <tbody
            className={cn(isFetching && initialized && "opacity-60")}
            aria-busy={isFetching}
          >
            {!initialized ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center">
                  <Loader2
                    className="mx-auto size-5 animate-spin text-text-muted-warm"
                    aria-label="Loading registrations"
                  />
                </td>
              </tr>
            ) : null}

            {initialized && error ? (
              <tr>
                <td colSpan={3} className="px-4 py-6">
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                </td>
              </tr>
            ) : null}

            {initialized && !error && items.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-12 text-center text-text-muted-warm"
                >
                  No registrations yet.
                </td>
              </tr>
            ) : null}

            {initialized && !error
              ? items.map((item) => (
                  <tr
                    key={item.registrationId}
                    className="border-b border-border-warm last:border-b-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-text-warm">
                      {item.registrationNumber}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${item.clientId}`}
                        className={cn(
                          "font-medium text-text-warm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        )}
                      >
                        {item.clientFullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted-warm">
                      <time dateTime={item.submittedAt}>
                        {formatSubmittedAt(item.submittedAt)}
                      </time>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>

        {initialized && !error && totalCount > 0 ? (
          <div className="flex flex-col gap-3 border-t border-border-warm px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-muted-warm">
              {`${(page - 1) * REGISTRATION_PAGE_SIZE + 1}–${Math.min(page * REGISTRATION_PAGE_SIZE, totalCount)} of ${totalCount}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-text-muted-warm">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
