"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  PLATFORM_AUDIT_ACTIONS,
  exportPlatformAudits,
  listPlatformAudits,
  type PlatformAuditEntry,
  type PlatformAuditSearchFilters,
} from "@/lib/platform-api";

function readFilters(params: URLSearchParams): PlatformAuditSearchFilters {
  return {
    action: params.get("action") ?? "",
    tenantId: params.get("tenantId") ?? "",
    actorEmail: params.get("actorEmail") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    page: Number(params.get("page") ?? "1") || 1,
    pageSize: 25,
  };
}

function filtersToQuery(filters: PlatformAuditSearchFilters): string {
  const params = new URLSearchParams();
  if (filters.action?.trim()) params.set("action", filters.action.trim());
  if (filters.tenantId?.trim()) params.set("tenantId", filters.tenantId.trim());
  if (filters.actorEmail?.trim()) params.set("actorEmail", filters.actorEmail.trim());
  if (filters.from?.trim()) params.set("from", filters.from.trim());
  if (filters.to?.trim()) params.set("to", filters.to.trim());
  if ((filters.page ?? 1) > 1) params.set("page", String(filters.page));
  return params.toString();
}

function hasActiveFilters(filters: PlatformAuditSearchFilters): boolean {
  return Boolean(
    filters.action?.trim() ||
      filters.tenantId?.trim() ||
      filters.actorEmail?.trim() ||
      filters.from?.trim() ||
      filters.to?.trim()
  );
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-GB", { timeZone: "UTC", hour12: false }) + " UTC";
}

export default function PlatformAuditsRoute() {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-sm text-[var(--plat-stone)]">
          Loading platform audits
        </p>
      }
    >
      <PlatformAuditsPage />
    </Suspense>
  );
}

function PlatformAuditsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const queryKey = searchParams.toString();
  const filters = useMemo(() => readFilters(new URLSearchParams(queryKey)), [queryKey]);

  const [draft, setDraft] = useState(filters);
  const [items, setItems] = useState<PlatformAuditEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setItems([]);

    void listPlatformAudits(authFetch, filters)
      .then((result) => {
        if (seq !== requestSeq.current) {
          return;
        }
        setItems(result.items);
        setTotalCount(result.totalCount);
        setPageSize(result.pageSize);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) {
          return;
        }
        setItems([]);
        setError(
          err instanceof Error
            ? `${err.message} Audits are unavailable.`
            : "Audits are unavailable. Refresh or adjust filters."
        );
        setLoading(false);
      });

    return () => {
      requestSeq.current += 1;
    };
  }, [authFetch, queryKey, filters]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    router.replace(`/platform/audits?${filtersToQuery({ ...draft, page: 1 })}`);
  };

  const clear = () => {
    setDraft({ action: "", tenantId: "", actorEmail: "", from: "", to: "", page: 1 });
    router.replace("/platform/audits");
  };

  const goToPage = useCallback(
    (next: number) => {
      router.replace(`/platform/audits?${filtersToQuery({ ...filters, page: next })}`);
    },
    [filters, router]
  );

  const downloadExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const blob = await exportPlatformAudits(authFetch, filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cohestra-platform-audits.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : "Could not export audits. Narrow the filters and try again."
      );
    } finally {
      setExporting(false);
    }
  };

  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const filtered = hasActiveFilters(filters);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--plat-stone)]">
          Platform
        </p>
        <h1
          className="text-3xl tracking-tight text-[var(--plat-ink)] sm:text-4xl"
          style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
        >
          Audits
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--plat-stone)]">
          Who acted, what changed, which tenant, why, and when. This is platform operational
          history — not a raw JSON inspector.
        </p>
      </header>

      <form
        className="grid gap-3 rounded-[12px] border border-[var(--plat-line)] p-4 sm:grid-cols-2"
        onSubmit={apply}
      >
        <label className="space-y-1 text-sm">
          <span className="font-medium text-[var(--plat-ink)]">Action</span>
          <select
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line)] bg-white px-3"
            value={draft.action ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))}
          >
            <option value="">All actions</option>
            {PLATFORM_AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-[var(--plat-ink)]">Tenant ID</span>
          <input
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line)] px-3"
            value={draft.tenantId ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, tenantId: event.target.value }))}
            autoComplete="off"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-[var(--plat-ink)]">Actor email</span>
          <input
            type="email"
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line)] px-3"
            value={draft.actorEmail ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, actorEmail: event.target.value }))}
            autoComplete="off"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--plat-ink)]">From (UTC)</span>
            <input
              className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line)] px-3"
              value={draft.from ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
              placeholder="2026-10-01T00:00:00Z"
              autoComplete="off"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--plat-ink)]">To (UTC)</span>
            <input
              className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line)] px-3"
              value={draft.to ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
              placeholder="2026-10-31T23:59:59Z"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--plat-ink)] px-4 text-sm font-semibold text-white"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-[var(--plat-line)] px-4 text-sm"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => void downloadExport()}
            disabled={exporting}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-[var(--plat-line)] px-4 text-sm"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </form>

      {exportError ? (
        <p role="alert" className="text-sm text-[var(--plat-lagoon)]">
          {exportError}
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="text-sm text-[var(--plat-stone)]">
          Loading platform audits
        </p>
      ) : error ? (
        <p role="alert" className="text-sm text-[var(--plat-lagoon)]">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p role="status" className="text-sm text-[var(--plat-stone)]">
          {filtered
            ? "No audit entries match these filters."
            : "No platform audit entries are recorded."}
        </p>
      ) : (
        <>
          <div className="hidden sm:block">
            <PlatformDataTable minWidthClassName="min-w-[640px]">
              <PlatformDataTableHead>
                <PlatformDataTableHeaderCell>Time</PlatformDataTableHeaderCell>
                <PlatformDataTableHeaderCell>Action</PlatformDataTableHeaderCell>
                <PlatformDataTableHeaderCell>Tenant</PlatformDataTableHeaderCell>
                <PlatformDataTableHeaderCell>Actor</PlatformDataTableHeaderCell>
                <PlatformDataTableHeaderCell>Reason</PlatformDataTableHeaderCell>
              </PlatformDataTableHead>
              <PlatformDataTableBody>
                {items.map((item) => (
                  <PlatformDataTableRow key={item.id}>
                    <PlatformDataTableCell>
                      <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                    </PlatformDataTableCell>
                    <PlatformDataTableCell>{item.action}</PlatformDataTableCell>
                    <PlatformDataTableCell className="break-all font-mono text-xs">
                      {item.tenantId}
                    </PlatformDataTableCell>
                    <PlatformDataTableCell>
                      {item.actorEmail?.trim()
                        ? item.actorEmail
                        : `Unknown actor email (${item.actorUserId})`}
                    </PlatformDataTableCell>
                    <PlatformDataTableCell className="max-w-xs whitespace-pre-wrap break-words">
                      {item.reason ?? "—"}
                    </PlatformDataTableCell>
                  </PlatformDataTableRow>
                ))}
              </PlatformDataTableBody>
            </PlatformDataTable>
          </div>

          <ol className="space-y-3 sm:hidden">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-[12px] border border-[var(--plat-line)] p-3 text-sm"
              >
                <p className="font-semibold text-[var(--plat-ink)]">{item.action}</p>
                <p>
                  <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                </p>
                <p className="break-all font-mono text-xs">Tenant {item.tenantId}</p>
                <p>
                  {item.actorEmail?.trim()
                    ? item.actorEmail
                    : `Unknown actor email (${item.actorUserId})`}
                </p>
                <p className="whitespace-pre-wrap break-words">{item.reason ?? "—"}</p>
              </li>
            ))}
          </ol>
        </>
      )}

      <nav className="flex flex-wrap items-center gap-3 text-sm" aria-label="Audit pagination">
        <p>
          {totalCount} {totalCount === 1 ? "entry" : "entries"}
        </p>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-[var(--plat-line)] px-3 disabled:opacity-50"
          onClick={() => goToPage(page - 1)}
          disabled={loading || page <= 1}
        >
          Previous
        </button>
        <p>
          Page {page} of {totalPages}
        </p>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-[var(--plat-line)] px-3 disabled:opacity-50"
          onClick={() => goToPage(page + 1)}
          disabled={loading || page >= totalPages}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
