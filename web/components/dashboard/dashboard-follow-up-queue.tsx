"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  fetchClients,
  formatLastActivityCaption,
  type ClientListItem,
} from "@/lib/clients-api";
import { cn } from "@/lib/utils";

const QUEUE_SIZE = 5;

export function DashboardFollowUpQueue() {
  const { authFetch } = useAuth();
  const [leads, setLeads] = useState<ClientListItem[]>([]);
  const [totalNew, setTotalNew] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetchClients(authFetch, {
      leadStatus: "new",
      sortBy: "lastRegistrationDate",
      sortDirection: "desc",
      page: 1,
      pageSize: QUEUE_SIZE,
    })
      .then((result) => {
        if (!cancelled) {
          setLeads(result.items);
          setTotalNew(result.totalCount);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLeads([]);
          setTotalNew(0);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

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

  if (totalNew === 0) {
    return (
      <section className="rounded-2xl border border-border-warm bg-card/80 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserRound className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-section text-text-warm">Follow-up queue clear</h3>
            <p className="mt-1 text-sm text-text-muted-warm">
              No new leads waiting — great job staying on top of outreach.
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
          <p className="mt-1 text-sm text-text-muted-warm">
            {totalNew} new lead{totalNew === 1 ? "" : "s"} waiting for first contact
          </p>
        </div>
        <Link
          href="/clients?leadStatus=new"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          View all
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="space-y-2">
        {leads.map((client) => (
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
                  {formatLastActivityCaption(client)}
                </p>
              </div>
              <LeadStatusBadge status={client.leadStatus} />
            </Link>
          </li>
        ))}
      </ul>

      {totalNew > QUEUE_SIZE ? (
        <Link
          href="/clients?leadStatus=new"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}
        >
          Review {totalNew - QUEUE_SIZE} more
        </Link>
      ) : null}
    </section>
  );
}
