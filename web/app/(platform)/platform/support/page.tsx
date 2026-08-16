"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import {
  PlatformDataTable,
  PlatformDataTableBody,
  PlatformDataTableCell,
  PlatformDataTableHead,
  PlatformDataTableHeaderCell,
  PlatformDataTableRow,
} from "@/components/platform/platform-data-table";
import {
  listPlatformSupportIssues,
  PLATFORM_SUPPORT_STATUSES,
  type PlatformSupportIssueListItem,
} from "@/lib/platform-api";

export default function PlatformSupportInboxPage() {
  const { authFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PlatformSupportIssueListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    void listPlatformSupportIssues(authFetch, {
      search: query,
      status: statusFilter || undefined,
      page,
      pageSize: 25,
    })
      .then((result) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setItems(result.items);
        setTotalCount(result.totalCount);
        setPageSize(result.pageSize);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load support issues.");
        setItems([]);
        setTotalCount(0);
        setLoading(false);
      });
  }, [authFetch, page, query, statusFilter]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  function handleStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setPage(1);
    setStatusFilter(event.target.value);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-[var(--plat-ink)]"
            style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
          >
            Support inbox
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--plat-stone)]">
            Match Gmail <code className="text-[var(--plat-ink-soft)]">[SUP…]</code> subjects to the
            correct tenant and operator.
          </p>
        </div>
        <Link
          href="/platform/support/report"
          className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[var(--plat-line-strong)] px-4 text-sm font-semibold text-[var(--plat-ink)] transition-colors hover:bg-white"
        >
          Volume report
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="sr-only" htmlFor="support-search">
          Search support issues
        </label>
        <input
          id="support-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Issue number, tenant slug, or operator email"
          className="min-h-11 flex-1 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
        />
        <label className="sr-only" htmlFor="support-status">
          Filter by status
        </label>
        <select
          id="support-status"
          value={statusFilter}
          onChange={handleStatusChange}
          className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
        >
          <option value="">All statuses</option>
          {PLATFORM_SUPPORT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatStatusLabel(status)}
            </option>
          ))}
        </select>
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
        <p className="text-sm text-[var(--plat-stone)]">Loading support issues…</p>
      ) : (
        <PlatformDataTable>
          <PlatformDataTableHead>
            <PlatformDataTableHeaderCell>Issue</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Tenant</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Operator</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Subject</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Status</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell className="pr-0">Created</PlatformDataTableHeaderCell>
          </PlatformDataTableHead>
          <PlatformDataTableBody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-[var(--plat-stone)]">
                  No support issues match this search.
                </td>
              </tr>
            ) : (
              items.map((issue) => (
                <PlatformDataTableRow key={issue.id}>
                  <PlatformDataTableCell>
                    <Link
                      href={`/platform/support/${issue.id}`}
                      className="font-semibold text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
                    >
                      {issue.issueNumber}
                    </Link>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell className="text-[var(--plat-ink-soft)]">
                    {issue.tenantSlug}
                  </PlatformDataTableCell>
                  <PlatformDataTableCell className="text-[var(--plat-ink-soft)]">
                    {issue.operatorEmail}
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>{issue.subject}</PlatformDataTableCell>
                  <PlatformDataTableCell>{formatStatusLabel(issue.status)}</PlatformDataTableCell>
                  <PlatformDataTableCell className="tabular-nums pr-0 text-[var(--plat-stone)]">
                    {formatDate(issue.createdAt)}
                  </PlatformDataTableCell>
                </PlatformDataTableRow>
              ))
            )}
          </PlatformDataTableBody>
        </PlatformDataTable>
      )}

      <div className="flex items-center justify-between gap-4 text-sm text-[var(--plat-stone)]">
        <p>
          {totalCount} issue{totalCount === 1 ? "" : "s"}
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

function formatStatusLabel(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}
