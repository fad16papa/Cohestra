"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { listPlatformTenants, type TenantListItem } from "@/lib/platform-api";

export default function PlatformTenantDirectoryPage() {
  const { authFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TenantListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void listPlatformTenants(authFetch, { search: query, page, pageSize: 25 })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setItems(result.items);
        setTotalCount(result.totalCount);
        setPageSize(result.pageSize);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load tenants.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, page, query]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-3xl tracking-tight text-[var(--plat-ink)]"
          style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
        >
          Tenant directory
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--plat-stone)]">
          Search workspaces by slug or name. Counts are aggregates only — no client export.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="tenant-search">
          Search tenants
        </label>
        <input
          id="tenant-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Slug or organization name"
          className="min-h-11 flex-1 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
        />
        <button
          type="submit"
          className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-5 text-sm font-semibold text-[var(--plat-lagoon-fg)] transition-colors hover:bg-[#08554F]"
        >
          Search
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-[var(--plat-danger)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--plat-stone)]">Loading directory…</p>
      ) : (
        <div className="overflow-x-auto border-y border-[var(--plat-line)]">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--plat-line)] text-xs uppercase tracking-[0.06em] text-[var(--plat-stone)]">
                <th className="py-3 pr-4 font-semibold">Slug</th>
                <th className="py-3 pr-4 font-semibold">Name</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Created</th>
                <th className="py-3 pr-4 font-semibold">Admin</th>
                <th className="py-3 pr-4 font-semibold">Activities</th>
                <th className="py-3 font-semibold">Clients</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-[var(--plat-stone)]">
                    No tenants match this search.
                  </td>
                </tr>
              ) : (
                items.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-[var(--plat-line)]/80 transition-colors hover:bg-white/60"
                  >
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/platform/tenants/${tenant.id}`}
                        className="font-semibold text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
                      >
                        {tenant.slug}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4 text-[var(--plat-ink-soft)]">{tenant.name}</td>
                    <td className="py-3.5 pr-4">{tenant.status}</td>
                    <td className="py-3.5 pr-4 tabular-nums text-[var(--plat-stone)]">
                      {formatDate(tenant.createdAt)}
                    </td>
                    <td className="py-3.5 pr-4 text-[var(--plat-ink-soft)]">
                      {tenant.adminContactEmail ?? "—"}
                    </td>
                    <td className="py-3.5 pr-4 tabular-nums">{tenant.activityCount}</td>
                    <td className="py-3.5 tabular-nums">{tenant.clientCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 text-sm text-[var(--plat-stone)]">
        <p>
          {totalCount} tenant{totalCount === 1 ? "" : "s"}
          {totalCount > 0 ? ` · page ${page} of ${totalPages}` : null}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="min-h-10 rounded-[10px] border border-[var(--plat-line-strong)] px-3 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="min-h-10 rounded-[10px] border border-[var(--plat-line-strong)] px-3 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 10);
}
