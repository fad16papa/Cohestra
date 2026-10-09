"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { PlatformKpiTile } from "@/components/platform/platform-kpi-tile";
import {
  PlatformDataTable,
  PlatformDataTableBody,
  PlatformDataTableCell,
  PlatformDataTableHead,
  PlatformDataTableHeaderCell,
  PlatformDataTableRow,
} from "@/components/platform/platform-data-table";
import {
  getPlatformOpsOutboxList,
  getPlatformOpsOutboxSummary,
  PLATFORM_OUTBOX_STATUSES,
  type PlatformOpsOutboxList,
  type PlatformOpsOutboxSummary,
} from "@/lib/platform-api";
import {
  failedCount,
  formatOutboxTimestamp,
  NO_FAILED_OUTBOX_CAVEAT,
  NO_FAILED_OUTBOX_COPY,
  toCreatedAtFilterIso,
} from "@/lib/platform-outbox";

export function PlatformOpsOutboxSection() {
  const { authFetch } = useAuth();
  const [summary, setSummary] = useState<PlatformOpsOutboxSummary | null>(null);
  const [list, setList] = useState<PlatformOpsOutboxList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Failed");
  const [messageType, setMessageType] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({
    status: "Failed",
    messageType: "",
    tenantId: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const requestSeq = useRef(0);

  const load = useCallback(
    (nextPage: number) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      setSummary(null);
      setList(null);

      const fromIso = applied.from ? toCreatedAtFilterIso(applied.from) : undefined;
      const toIso = applied.to ? toCreatedAtFilterIso(applied.to) : undefined;

      void Promise.all([
        getPlatformOpsOutboxSummary(authFetch),
        getPlatformOpsOutboxList(authFetch, {
          status: applied.status || undefined,
          messageType: applied.messageType || undefined,
          tenantId: applied.tenantId || undefined,
          from: fromIso,
          to: toIso,
          page: nextPage,
          pageSize: 25,
        }),
      ])
        .then(([nextSummary, nextList]) => {
          if (seq !== requestSeq.current) {
            return;
          }
          setSummary(nextSummary);
          setList(nextList);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (seq !== requestSeq.current) {
            return;
          }
          setSummary(null);
          setList(null);
          setError(
            err instanceof Error
              ? `${err.message} Refresh Outbox or try again.`
              : "Could not load outbox data. Refresh the page or try again."
          );
          setLoading(false);
        });
    },
    [applied, authFetch]
  );

  useEffect(() => {
    load(page);
    return () => {
      requestSeq.current += 1;
    };
  }, [load, page]);

  const totalPages = useMemo(() => {
    if (!list) {
      return 1;
    }
    return Math.max(1, Math.ceil(list.totalCount / list.pageSize));
  }, [list]);

  const failed = summary ? failedCount(summary.countsByStatus.value) : null;
  const showFailedEmpty =
    !loading &&
    !error &&
    list != null &&
    list.items.length === 0 &&
    (applied.status === "Failed" || failed === 0);

  return (
    <section className="space-y-4" aria-labelledby="ops-outbox-heading">
      <div className="space-y-2">
        <h2
          id="ops-outbox-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]"
        >
          Outbox
        </h2>
        <p className="min-w-0 break-words text-sm leading-relaxed text-[var(--plat-stone)]">
          Queue metadata only. This list does not include customer payloads, email bodies, or
          recipients, and it cannot requeue work. Zero Failed rows is not email health.
        </p>
      </div>

      {loading ? (
        <p role="status" aria-live="polite" className="text-sm text-[var(--plat-stone)]">
          Loading outbox…
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-[var(--plat-danger)]/30 bg-[var(--plat-danger-bg)] px-4 py-5"
        >
          <h3 className="text-base font-semibold text-[var(--plat-danger)]">
            Outbox data unavailable
          </h3>
          <p className="mt-2 text-sm text-[var(--plat-ink)]">{error}</p>
          <button
            type="button"
            onClick={() => load(page)}
            className="mt-4 inline-flex min-h-11 items-center rounded-[10px] bg-[var(--plat-ink)] px-4 text-sm font-semibold text-[var(--plat-paper)]"
          >
            Try again
          </button>
        </div>
      ) : null}

      {summary && !loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PlatformKpiTile
            title="Jobs by status"
            source={summary.countsByStatus.source}
            observedAt={summary.countsByStatus.observedAt}
            freshness={summary.countsByStatus.freshness}
          >
            <ul className="space-y-1 text-sm">
              {summary.countsByStatus.value.map((row) => (
                <li key={row.key} className="flex justify-between gap-3">
                  <span>{row.key}</span>
                  <span className="tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </PlatformKpiTile>
          <PlatformKpiTile
            title="Jobs by message type"
            source={summary.countsByMessageType.source}
            observedAt={summary.countsByMessageType.observedAt}
            freshness={summary.countsByMessageType.freshness}
          >
            {summary.countsByMessageType.value.length === 0 ? (
              <p className="text-sm text-[var(--plat-stone)]">No outbox jobs are recorded.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {summary.countsByMessageType.value.map((row) => (
                  <li key={row.key} className="flex justify-between gap-3">
                    <span className="min-w-0 break-words">{row.key}</span>
                    <span className="tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </PlatformKpiTile>
        </div>
      ) : null}

      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({
            status,
            messageType: messageType.trim(),
            tenantId: tenantId.trim(),
            from,
            to,
          });
          setPage(1);
        }}
      >
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          >
            <option value="">All statuses</option>
            {PLATFORM_OUTBOX_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Message type</span>
          <input
            value={messageType}
            onChange={(event) => setMessageType(event.target.value)}
            placeholder="Exact type, e.g. campaign.recipient"
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Tenant id</span>
          <input
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="Optional GUID"
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 font-mono text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Created from (UTC filter)</span>
          <input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Created to (UTC filter)</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-5 text-sm font-semibold text-[var(--plat-lagoon-fg)]"
          >
            Apply filters
          </button>
        </div>
      </form>

      {showFailedEmpty ? (
        <div
          role="status"
          className="rounded-[10px] border border-[var(--plat-line)] bg-white/70 px-4 py-5"
        >
          <p className="text-sm font-medium text-[var(--plat-ink)]">{NO_FAILED_OUTBOX_COPY}</p>
          <p className="mt-2 min-w-0 break-words text-sm leading-relaxed text-[var(--plat-stone)]">
            {NO_FAILED_OUTBOX_CAVEAT}
          </p>
        </div>
      ) : null}

      {list && !loading && !error && list.items.length > 0 ? (
        <>
          <PlatformDataTable minWidthClassName="min-w-[720px]">
            <PlatformDataTableHead>
              <PlatformDataTableHeaderCell>Status</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Type</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Tenant</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Attempts</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Created</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Next attempt</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Sanitized error</PlatformDataTableHeaderCell>
            </PlatformDataTableHead>
            <PlatformDataTableBody>
              {list.items.map((item) => (
                <PlatformDataTableRow key={item.id}>
                  <PlatformDataTableCell>
                    <span className="font-medium text-[var(--plat-ink)]">{item.status}</span>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <span className="min-w-0 break-words">{item.messageType}</span>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <span className="font-mono text-xs">{item.tenantId}</span>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <span className="tabular-nums">{item.attemptCount}</span>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <time dateTime={item.createdAt}>{formatOutboxTimestamp(item.createdAt)}</time>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <time dateTime={item.nextAttemptAt}>
                      {formatOutboxTimestamp(item.nextAttemptAt)}
                    </time>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <span className="min-w-0 break-words text-[var(--plat-stone)]">
                      {item.lastErrorSanitized ?? "—"}
                    </span>
                  </PlatformDataTableCell>
                </PlatformDataTableRow>
              ))}
            </PlatformDataTableBody>
          </PlatformDataTable>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--plat-stone)]">
              Showing {list.items.length} of {list.totalCount} jobs · page {list.page} of{" "}
              {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] px-3 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] px-3 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}

      {list && !loading && !error && list.items.length === 0 && !showFailedEmpty ? (
        <p role="status" className="text-sm text-[var(--plat-stone)]">
          No outbox jobs match these filters.
        </p>
      ) : null}
    </section>
  );
}
