"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  getPlatformOpsPaddleConfig,
  getPlatformOpsPaddleDeliveries,
  PLATFORM_PADDLE_DISPOSITIONS,
  type PlatformOpsPaddleConfig,
  type PlatformOpsPaddleDeliveryList,
} from "@/lib/platform-api";
import {
  environmentLabel,
  FILTERED_EMPTY_COPY,
  formatPaddleTimestamp,
  MISSING_INSTRUMENTATION_CAVEAT,
  MISSING_INSTRUMENTATION_COPY,
  toObservedAtFilterIso,
} from "@/lib/platform-paddle";

export function PlatformOpsPaddleSection() {
  const { authFetch } = useAuth();
  const [config, setConfig] = useState<PlatformOpsPaddleConfig | null>(null);
  const [list, setList] = useState<PlatformOpsPaddleDeliveryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disposition, setDisposition] = useState("");
  const [eventType, setEventType] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({
    disposition: "",
    eventType: "",
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
      setConfig(null);
      setList(null);

      const fromIso = applied.from ? toObservedAtFilterIso(applied.from) : undefined;
      const toIso = applied.to ? toObservedAtFilterIso(applied.to) : undefined;

      void Promise.all([
        getPlatformOpsPaddleConfig(authFetch),
        getPlatformOpsPaddleDeliveries(authFetch, {
          disposition: applied.disposition || undefined,
          eventType: applied.eventType || undefined,
          tenantId: applied.tenantId || undefined,
          from: fromIso,
          to: toIso,
          page: nextPage,
          pageSize: 25,
        }),
      ])
        .then(([nextConfig, nextList]) => {
          if (seq !== requestSeq.current) {
            return;
          }
          setConfig(nextConfig);
          setList(nextList);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (seq !== requestSeq.current) {
            return;
          }
          setConfig(null);
          setList(null);
          setError(
            err instanceof Error
              ? `${err.message} Refresh Billing or try again.`
              : "Could not load Paddle diagnostics. Refresh the page or try again."
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

  const filtersActive =
    Boolean(applied.disposition) ||
    Boolean(applied.eventType) ||
    Boolean(applied.tenantId) ||
    Boolean(applied.from) ||
    Boolean(applied.to);

  const showMissingInstrumentation =
    !loading && !error && list != null && list.totalCount === 0 && !filtersActive;

  const showFilteredEmpty =
    !loading && !error && list != null && list.items.length === 0 && filtersActive;

  return (
    <section className="space-y-4" aria-labelledby="ops-billing-heading">
      <div className="space-y-2">
        <h2
          id="ops-billing-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]"
        >
          Billing / Paddle
        </h2>
        <p className="min-w-0 break-words text-sm leading-relaxed text-[var(--plat-stone)]">
          Read-only webhook disposition diagnostics. This is not a Paddle health check and cannot
          replay webhooks, edit BillingStatus, or reveal secrets.
        </p>
      </div>

      {loading ? (
        <p role="status" aria-live="polite" className="text-sm text-[var(--plat-stone)]">
          Loading billing diagnostics…
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-[var(--plat-danger)]/30 bg-[var(--plat-danger-bg)] px-4 py-5"
        >
          <h3 className="text-base font-semibold text-[var(--plat-danger)]">
            Billing diagnostics unavailable
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

      {config && !loading && !error ? (
        <div className="rounded-[10px] border border-[var(--plat-line)] bg-white/70 px-4 py-4">
          <p className="text-sm text-[var(--plat-ink)]">
            <span className="font-semibold">
              {config.isConfigured ? "Paddle is configured" : "Paddle is not configured"}
            </span>
            <span className="mt-1 block min-w-0 break-words text-sm text-[var(--plat-stone)]">
              {environmentLabel(config.environment, config.allowLive)}. API host {config.apiHost}.
              Configuration is not webhook health.
            </span>
          </p>
        </div>
      ) : null}

      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({
            disposition,
            eventType: eventType.trim(),
            tenantId: tenantId.trim(),
            from,
            to,
          });
          setPage(1);
        }}
      >
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Disposition</span>
          <select
            value={disposition}
            onChange={(event) => setDisposition(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          >
            <option value="">All dispositions</option>
            {PLATFORM_PADDLE_DISPOSITIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Event type</span>
          <input
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            placeholder="Exact type, e.g. transaction.completed"
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Tenant id</span>
          <input
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="Optional GUID when known"
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 font-mono text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Observed from (UTC filter)</span>
          <input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--plat-ink-soft)]">Observed to (UTC filter)</span>
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

      {showMissingInstrumentation ? (
        <div
          role="status"
          className="rounded-[10px] border border-[var(--plat-line)] bg-white/70 px-4 py-5"
        >
          <p className="text-sm font-medium text-[var(--plat-ink)]">{MISSING_INSTRUMENTATION_COPY}</p>
          <p className="mt-2 min-w-0 break-words text-sm leading-relaxed text-[var(--plat-stone)]">
            {MISSING_INSTRUMENTATION_CAVEAT}
          </p>
        </div>
      ) : null}

      {showFilteredEmpty ? (
        <p role="status" className="text-sm text-[var(--plat-stone)]">
          {FILTERED_EMPTY_COPY}
        </p>
      ) : null}

      {list && !loading && !error && list.items.length > 0 ? (
        <>
          <PlatformDataTable minWidthClassName="min-w-[720px]">
            <PlatformDataTableHead>
              <PlatformDataTableHeaderCell>Disposition</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Event type</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>HTTP</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Tenant</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Observed</PlatformDataTableHeaderCell>
              <PlatformDataTableHeaderCell>Sanitized detail</PlatformDataTableHeaderCell>
            </PlatformDataTableHead>
            <PlatformDataTableBody>
              {list.items.map((item) => (
                <PlatformDataTableRow key={item.id}>
                  <PlatformDataTableCell>
                    <span className="font-medium text-[var(--plat-ink)]">{item.disposition}</span>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <span className="min-w-0 break-words">{item.eventType ?? "—"}</span>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <span className="tabular-nums">HTTP {item.httpStatus}</span>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <span className="font-mono text-xs">{item.tenantId ?? "—"}</span>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <time dateTime={item.observedAt}>{formatPaddleTimestamp(item.observedAt)}</time>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>
                    <span className="min-w-0 break-words text-[var(--plat-stone)]">
                      {item.detailSanitized ?? "—"}
                    </span>
                  </PlatformDataTableCell>
                </PlatformDataTableRow>
              ))}
            </PlatformDataTableBody>
          </PlatformDataTable>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--plat-stone)]">
              Showing {list.items.length} of {list.totalCount} deliveries · page {list.page} of{" "}
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
    </section>
  );
}
