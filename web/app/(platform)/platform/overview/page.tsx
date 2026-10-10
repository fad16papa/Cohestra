"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { PlatformKpiTile } from "@/components/platform/platform-kpi-tile";
import { PlatformOpsVersionSection } from "@/components/platform/platform-ops-version";
import {
  getPlatformOpsOverview,
  type PlatformOpsOverview,
} from "@/lib/platform-api";
import {
  describePlatformBillingStatus,
  describePlatformTenantStatus,
} from "@/lib/platform-status-copy";
import { healthStatusLabel, stackHealthSummary } from "@/lib/platform-health";
import { sumCounts } from "@/lib/platform-overview";

export default function PlatformOverviewPage() {
  const { authFetch } = useAuth();
  const [hideLoadTest, setHideLoadTest] = useState(true);
  const [overview, setOverview] = useState<PlatformOpsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setOverview(null);

    void getPlatformOpsOverview(authFetch, { hideLoadTest })
      .then((result) => {
        if (seq !== requestSeq.current) {
          return;
        }
        setOverview(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) {
          return;
        }
        setOverview(null);
        setError(
          err instanceof Error
            ? `${err.message} Refresh overview or try again.`
            : "Could not load overview. Refresh the page or try again."
        );
        setLoading(false);
      });
  }, [authFetch, hideLoadTest]);

  useEffect(() => {
    load();
    return () => {
      requestSeq.current += 1;
    };
  }, [load]);

  const tenantTotal = overview ? sumCounts(overview.tenantStatusCounts.value) : null;
  const billingTotal = overview ? sumCounts(overview.billingStatusCounts.value) : null;

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
          Overview
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--plat-stone)]">
          Fleet pulse from PostgreSQL. Each figure states its source and freshness.
          Infrastructure health is the authenticated postgres, redis, and default-tenant probe —
          not outbox, Paddle, or email.
        </p>
      </header>

      <label className="inline-flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hideLoadTest}
          onChange={(event) => setHideLoadTest(event.target.checked)}
          className="size-4"
        />
        Hide load-test and default fixtures
      </label>

      {loading ? (
        <p role="status" aria-live="polite" className="text-sm text-[var(--plat-stone)]">
          Loading overview…
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-[var(--plat-danger)]/30 bg-[var(--plat-danger-bg)] px-4 py-5"
        >
          <h2 className="text-base font-semibold text-[var(--plat-danger)]">Could not load overview</h2>
          <p className="mt-2 text-sm text-[var(--plat-ink)]">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-4 inline-flex min-h-11 items-center rounded-[10px] bg-[var(--plat-ink)] px-4 text-sm font-semibold text-[var(--plat-paper)]"
          >
            Try again
          </button>
        </div>
      ) : null}

      {overview && !loading && !error ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <PlatformKpiTile
            title="Tenant status"
            source={overview.tenantStatusCounts.source}
            observedAt={overview.tenantStatusCounts.observedAt}
            freshness={overview.tenantStatusCounts.freshness}
          >
            {tenantTotal === 0 ? (
              <p>No tenants in this view.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {overview.tenantStatusCounts.value.map((row) => (
                  <li key={row.key} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words">{describePlatformTenantStatus(row.key).label}</span>
                    <span className="shrink-0 tabular-nums font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </PlatformKpiTile>

          <PlatformKpiTile
            title="Billing status"
            source={overview.billingStatusCounts.source}
            observedAt={overview.billingStatusCounts.observedAt}
            freshness={overview.billingStatusCounts.freshness}
          >
            {billingTotal === 0 ? (
              <p>No tenants in this view.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {overview.billingStatusCounts.value.map((row) => (
                  <li key={row.key} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words">{describePlatformBillingStatus(row.key).headline}</span>
                    <span className="shrink-0 tabular-nums font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </PlatformKpiTile>

          <PlatformKpiTile
            title="Open support"
            source={overview.openSupportCount.source}
            observedAt={overview.openSupportCount.observedAt}
            freshness={overview.openSupportCount.freshness}
          >
            {overview.openSupportCount.value === 0 ? (
              <p>No open support issues.</p>
            ) : (
              <p className="text-3xl font-semibold tabular-nums">{overview.openSupportCount.value}</p>
            )}
          </PlatformKpiTile>

          <PlatformKpiTile
            title="Infrastructure health"
            source={overview.stackHealth.source}
            observedAt={overview.stackHealth.observedAt}
            freshness={overview.stackHealth.freshness}
          >
            {overview.stackHealth.freshness === "unavailable" ? (
              <div className="space-y-2">
                <p className="font-semibold">Unavailable</p>
                <p className="text-sm leading-relaxed">
                  The authenticated health request could not produce data. Tenant and support
                  figures above are still from PostgreSQL. This is not a Healthy result.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold">
                  Status: {healthStatusLabel(overview.stackHealth.value ?? "")}
                </p>
                <p className="min-w-0 break-words text-sm leading-relaxed">
                  {stackHealthSummary({ overallStatus: overview.stackHealth.value ?? "" })}
                </p>
              </div>
            )}
          </PlatformKpiTile>
        </div>
      ) : null}

      <PlatformOpsVersionSection headingId="overview-version-heading" />
    </div>
  );
}
