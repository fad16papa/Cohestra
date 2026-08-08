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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
        setTotalCount(dueResult.totalCount + newResult.totalCount);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setTotalCount(0);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const subtitle = useMemo(() => {
    if (totalCount === 0) {
      return "No new leads or overdue follow-ups.";
    }

    return `${totalCount} item${totalCount === 1 ? "" : "s"} need attention`;
  }, [totalCount]);

  if (loading) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading follow-up queue"
        className="rounded-2xl border border-border-warm bg-card/80 p-5 shadow-sm"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded-md bg-muted" />
          <div className="h-12 rounded-xl bg-muted/70" />
          <div className="h-12 rounded-xl bg-muted/70" />
        </div>
      </section>
    );
  }

  if (totalCount === 0) {
    return (
      <section className="rounded-2xl border border-border-warm bg-card/80 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserRound className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-section text-text-warm">Follow-up queue clear</h3>
            <p className="mt-1 text-sm text-text-muted-warm">
              No new leads or overdue follow-ups — great job staying on top of outreach.
            </p>
          </div>
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
          <h3 id="follow-up-queue-heading" className="text-section text-text-warm">
            Needs follow-up
          </h3>
          <p className="mt-1 text-sm text-text-muted-warm">{subtitle}</p>
        </div>
        <Link
          href="/clients?leadStatus=new"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          View queue
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="space-y-2">
        {entries.map((client) => (
          <li key={client.id}>
            <Link
              href={`/clients/${client.id}`}
              className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border-warm hover:bg-muted/40"
            >
              <PersonAvatar name={client.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text-warm group-hover:text-primary">
                  {client.fullName}
                </p>
                <p className="truncate text-xs text-text-muted-warm">
                  {client.queueReason === "follow_up_due"
                    ? `Follow-up due · ${formatNextFollowUpDate(client.nextFollowUpAt)}`
                    : formatLastActivityCaption(client)}
                </p>
              </div>
              {client.queueReason === "follow_up_due" ||
              isFollowUpDue(client.nextFollowUpAt, shell?.registrationTimeZoneId) ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-700 dark:text-amber-300">
                  Due
                </span>
              ) : (
                <LeadStatusBadge status={client.leadStatus} />
              )}
            </Link>
          </li>
        ))}
      </ul>

      {totalCount > QUEUE_SIZE ? (
        <Link
          href="/clients?followUpDue=true"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}
        >
          Review {totalCount - QUEUE_SIZE} more
        </Link>
      ) : null}
    </section>
  );
}
