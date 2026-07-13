"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ClientRow } from "@/components/clients/client-row";
import {
  clientsTableGridClassName,
  clientsTableStatusColumnClassName,
} from "@/components/clients/clients-table-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchCommunityById,
  fetchCommunityClients,
  type CommunityDetail,
} from "@/lib/communities-api";
import { leadStatusOptions } from "@/lib/clients-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type CommunityDetailPageProps = {
  id: string;
};

export function CommunityDetailPage({ id }: CommunityDetailPageProps) {
  const { authFetch } = useAuth();
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [search, setSearch] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [clients, setClients] = useState<Awaited<ReturnType<typeof fetchCommunityClients>>["items"]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetchCommunityById(authFetch, id)
      .then((result) => {
        if (!cancelled) {
          setCommunity(result);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Could not load community."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetchCommunityClients(authFetch, id, {
      page,
      pageSize: PAGE_SIZE,
      search: search.trim() || undefined,
      leadStatus: leadStatus || undefined,
      sortBy: "name",
      sortDirection: "asc",
    })
      .then((result) => {
        if (!cancelled) {
          setClients(result.items);
          setTotalCount(result.totalCount);
          setError(null);
          setLoading(false);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Could not load community leads."
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, id, leadStatus, page, search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (error && !community) {
    return (
      <div className="space-y-4">
        <Link href="/activities/communities" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to communities
        </Link>
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  if (!community) {
    return <p className="text-sm text-text-muted-warm">Loading community…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/activities/communities"
          className="text-sm text-text-muted-warm transition-colors hover:text-text-warm"
        >
          ← Back to communities
        </Link>
        <h2 className="mt-3 text-display-sm text-text-warm">{community.name}</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          {community.leadCount} lead{community.leadCount === 1 ? "" : "s"} ·{" "}
          {community.activityCount} activit{community.activityCount === 1 ? "y" : "ies"}
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border border-border-warm bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="community-lead-search">Search leads</Label>
          <Input
            id="community-lead-search"
            type="search"
            value={search}
            placeholder="Search by name or nationality…"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="community-lead-status">Lead status</Label>
          <select
            id="community-lead-status"
            value={leadStatus}
            onChange={(event) => {
              setLeadStatus(event.target.value);
              setPage(1);
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

      <div className="overflow-hidden rounded-xl border border-border-warm bg-card">
        <div
          className={cn(
            clientsTableGridClassName,
            "hidden border-b border-border-warm bg-muted/30 py-3 md:grid"
          )}
          role="row"
        >
          <span className="min-w-0 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            Name
          </span>
          <span className="min-w-0 text-center text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            Nationality
          </span>
          <span
            className={cn(
              clientsTableStatusColumnClassName,
              "text-xs font-medium uppercase tracking-wide text-text-muted-warm"
            )}
          >
            Status
          </span>
          <span className="min-w-0 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            Last registration
          </span>
          <span className="sr-only">Open profile</span>
        </div>

        {error ? (
          <p role="alert" className="px-4 py-6 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted-warm">Loading leads…</p>
        ) : clients.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted-warm">
            No leads found for this community yet.
          </p>
        ) : (
          clients.map((client) => <ClientRow key={client.id} client={client} />)
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted-warm">
          {totalCount === 0
            ? "0 leads"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount}`}
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
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
