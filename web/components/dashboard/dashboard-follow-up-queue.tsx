"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  fetchClients,
  formatLastActivityCaption,
  formatNextFollowUpDate,
  isFollowUpDue,
  type ClientListItem,
} from "@/lib/clients-api";
import { cn } from "@/lib/utils";

const QUEUE_SIZE = 5;

type QueueEntry = ClientListItem & {
  queueReason: "new" | "follow_up_due";
};

export function DashboardFollowUpQueue() {
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [dueTotalCount, setDueTotalCount] = useState(0);
  const [newTotalCount, setNewTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      fetchClients(authFetch, {
        followUpDue: true,
        sortBy: "lastRegistrationDate",
        sortDirection: "asc",
        page: 1,
        pageSize: QUEUE_SIZE,
      }),
      fetchClients(authFetch, {
        leadStatus: "new",
        withoutOutreach: true,
        sortBy: "lastRegistrationDate",
        sortDirection: "desc",
        page: 1,
        pageSize: QUEUE_SIZE,
      }),
    ])
      .then(([dueResult, newResult]) => {
        if (cancelled) {
          return;
        }

        const merged = new Map<string, QueueEntry>();

        for (const client of dueResult.items) {
          merged.set(client.id, { ...client, queueReason: "follow_up_due" });
        }

        for (const client of newResult.items) {
          if (!merged.has(client.id)) {
            merged.set(client.id, { ...client, queueReason: "new" });
          }
        }

        const queueEntries = Array.from(merged.values()).slice(0, QUEUE_SIZE);
        setEntries(queueEntries);
        setDueTotalCount(dueResult.totalCount);
        setNewTotalCount(newResult.totalCount);
        setError(null);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setEntries([]);
          setDueTotalCount(0);
          setNewTotalCount(0);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load people who need follow-up."
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, reloadToken]);

  const subtitle = useMemo(() => {
    if (dueTotalCount === 0 && newTotalCount === 0) {
      return "No new leads or overdue follow-ups.";
    }

    const parts: string[] = [];
    if (dueTotalCount > 0) {
      parts.push(
        `${dueTotalCount} follow-up${dueTotalCount === 1 ? "" : "s"} due`
      );
    }
    if (newTotalCount > 0) {
      parts.push(`${newTotalCount} new lead${newTotalCount === 1 ? "" : "s"}`);
    }

    return parts.join(" · ");
  }, [dueTotalCount, newTotalCount]);

  const showReviewMore =
    dueTotalCount + newTotalCount > QUEUE_SIZE ||
    entries.length >= QUEUE_SIZE;

  if (loading) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading follow-up queue"
        className="rounded-2xl border border-border-warm bg-card/80 p-5 shadow-sm"
      >
        <div className="motion-safe:animate-pulse space-y-3">
          <div className="h-5 w-40 rounded-md bg-muted" />
          <div className="h-12 rounded-xl bg-muted/70" />
          <div className="h-12 rounded-xl bg-muted/70" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-labelledby="follow-up-queue-heading"
        className="rounded-xl border border-border-warm bg-card/80 p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="follow-up-queue-heading" className="text-section text-text-warm">
            Needs follow-up
          </h2>
          <Link
            href="/follow-up"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11 min-w-11")}
          >
            View all
          </Link>
        </div>
        <div role="alert" className="rounded-xl border border-destructive/20 bg-background/70 p-4">
          <p className="text-sm text-text-warm">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11 min-w-11"
            onClick={() => {
              setLoading(true);
              setError(null);
              setReloadToken((current) => current + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </section>
    );
  }

  if (dueTotalCount === 0 && newTotalCount === 0) {
    return (
      <section
        aria-labelledby="follow-up-queue-heading"
        className="rounded-xl border border-border-warm bg-card/80 p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-surface-success text-text-success">
              <UserRound className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id="follow-up-queue-heading" className="text-section text-text-warm">
                Needs follow-up
              </h2>
              <p className="mt-1 text-sm text-text-muted-warm">
                No new leads or overdue follow-ups.
              </p>
            </div>
          </div>
          <Link
            href="/follow-up"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11 min-w-11")}
          >
            View all
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="follow-up-queue-heading"
      className="rounded-2xl border border-border-warm bg-card/80 p-5 shadow-sm backdrop-blur-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="follow-up-queue-heading" className="text-section text-text-warm">
            Needs follow-up
          </h2>
          <p className="mt-1 text-sm text-text-muted-warm">{subtitle}</p>
        </div>
        <Link
          href="/follow-up"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11 min-w-11 gap-1")}
        >
          View all
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="space-y-2">
        {entries.map((client) => (
          <li key={client.id}>
            <Link
              href={`/clients/${client.id}`}
              className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 motion-press hover:border-border-warm hover:bg-muted/40"
            >
              <PersonAvatar name={client.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text-warm group-hover:text-text-link">
                  {client.fullName}
                </p>
                <p className="truncate text-xs text-text-muted-warm">
                  {client.queueReason === "follow_up_due"
                    ? `Follow-up due · ${formatNextFollowUpDate(client.nextFollowUpAt, shell?.registrationTimeZoneId)}`
                    : formatLastActivityCaption(client)}
                </p>
              </div>
              {client.queueReason === "follow_up_due" ||
              isFollowUpDue(client.nextFollowUpAt, shell?.registrationTimeZoneId) ? (
                <span className="rounded-full bg-surface-warning px-2 py-0.5 text-[0.6875rem] font-medium text-foreground">
                  Due
                </span>
              ) : (
                <LeadStatusBadge status={client.leadStatus} />
              )}
            </Link>
          </li>
        ))}
      </ul>

      {showReviewMore ? (
        <Link
          href="/follow-up"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 min-h-11 w-full")}
        >
          Open Follow-up
        </Link>
      ) : null}
    </section>
  );
}
