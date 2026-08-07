"use client";

import { useEffect, useState } from "react";

import { ActivityPerformanceSection } from "@/components/dashboard/activity-performance-section";
import { DashboardActivityPerformanceGraph } from "@/components/dashboard/dashboard-activity-performance-graph";
import { DashboardActivityPerformanceTable } from "@/components/dashboard/dashboard-activity-performance-table";
import { DashboardCommunityPulse } from "@/components/dashboard/dashboard-community-pulse";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardFollowUpQueue } from "@/components/dashboard/dashboard-follow-up-queue";
import { DashboardGreetingHeader } from "@/components/dashboard/dashboard-greeting-header";
import { DashboardLeadStatusChart } from "@/components/dashboard/dashboard-lead-status-chart";
import { DashboardMetricsGraphs } from "@/components/dashboard/dashboard-metrics-graphs";
import { DashboardMetricsTable } from "@/components/dashboard/dashboard-metrics-table";
import { DashboardRegistrationsTrendChart } from "@/components/dashboard/dashboard-registrations-trend-chart";
import { DashboardTodayStrip } from "@/components/dashboard/dashboard-today-strip";
import { useDashboardMetricsRefresh } from "@/components/dashboard/dashboard-metrics-refresh-context";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardRecentCampaignsSection } from "@/components/dashboard/dashboard-recent-campaigns-section";
import { DashboardViewSwitcher } from "@/components/dashboard/dashboard-view-switcher";
import { MetricTile } from "@/components/dashboard/metric-tile";
import { useAuth } from "@/components/auth/auth-provider";
import { MetricSkeletonGrid } from "@/components/shared/list-skeleton";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { fetchActivities } from "@/lib/activities-api";
import { fetchDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard-api";
import { computeWowDeltaPercent } from "@/lib/dashboard-insights";
import {
  readDashboardViewMode,
  writeDashboardViewMode,
  type DashboardViewMode,
} from "@/lib/dashboard-view-mode";

const METRICS_POLL_INTERVAL_MS = 60_000;

function formatCoveragePercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function DashboardPageClient() {
  const { authFetch, status } = useAuth();
  const refreshContext = useDashboardMetricsRefresh();
  const setLastUpdatedAt = refreshContext?.setLastUpdatedAt;
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [hasActivities, setHasActivities] = useState<boolean | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [viewMode, setViewMode] = useState<DashboardViewMode>("overview");

  useEffect(() => {
    setViewMode(readDashboardViewMode());
  }, []);

  function handleViewModeChange(mode: DashboardViewMode) {
    setViewMode(mode);
    writeDashboardViewMode(mode);
  }

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    async function loadInitial() {
      try {
        const [metricsResult, activitiesResult] = await Promise.all([
          fetchDashboardMetrics(authFetch),
          fetchActivities(authFetch, { page: 1, pageSize: 1 }),
        ]);

        if (cancelled) {
          return;
        }

        setMetrics(metricsResult);
        setHasActivities(activitiesResult.totalCount > 0);
        setError(null);
        setInitialized(true);
        setLastUpdatedAt?.(new Date(metricsResult.computedAt));
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load dashboard data."
        );
        setInitialized(true);
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [authFetch, reloadToken, setLastUpdatedAt, status]);

  useEffect(() => {
    if (status !== "authenticated" || !initialized || error) {
      return;
    }

    let cancelled = false;

    const interval = window.setInterval(() => {
      setIsRefreshing(true);
      void fetchDashboardMetrics(authFetch)
        .then((result) => {
          if (cancelled) {
            return;
          }

          setMetrics(result);
          setLastUpdatedAt?.(new Date(result.computedAt));
        })
        .catch(() => {
          // Keep showing the last successful metrics during background polls.
        })
        .finally(() => {
          if (!cancelled) {
            window.setTimeout(() => setIsRefreshing(false), 400);
          }
        });
    }, METRICS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authFetch, error, initialized, setLastUpdatedAt, status]);

  if (status === "loading" || !initialized) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted/70" />
        </div>
        <MetricSkeletonGrid />
      </div>
    );
  }

  if (error) {
    return (
      <ProductErrorState
        message={error}
        onRetry={() => {
          setInitialized(false);
          setError(null);
          setReloadToken((current) => current + 1);
        }}
      />
    );
  }

  if (hasActivities === false) {
    return <DashboardEmptyState />;
  }

  if (!metrics) {
    return null;
  }

  const periodLabel =
    metrics.periodDays === 7 ? "this week" : `last ${metrics.periodDays} days`;

  const registrationsWowDelta = computeWowDeltaPercent(
    metrics.registrationsInPeriod,
    metrics.registrationsInPreviousPeriod
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <DashboardGreetingHeader />

      <section className="rounded-xl border border-border-warm bg-card/60 p-4 sm:p-5">
        <DashboardViewSwitcher value={viewMode} onChange={handleViewModeChange} />
      </section>

      {viewMode === "overview" ? (
        <>
          <DashboardTodayStrip metrics={metrics} periodLabel={periodLabel} />
          <DashboardFollowUpQueue />
          <DashboardQuickActions />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Total leads"
              value={String(metrics.totalLeads)}
              href="/clients"
              ariaLabel={`View all ${metrics.totalLeads} leads`}
              hint="All captured contacts"
              animationDelayMs={0}
              isRefreshing={isRefreshing}
            />
            <MetricTile
              label={`Registrations ${periodLabel}`}
              value={String(metrics.registrationsInPeriod)}
              href="/reports"
              ariaLabel={`${metrics.registrationsInPeriod} registrations ${periodLabel} — open reports`}
              delta={{
                percent: registrationsWowDelta,
                label: `vs previous ${metrics.periodDays} days (${metrics.registrationsInPreviousPeriod})`,
              }}
              animationDelayMs={60}
              isRefreshing={isRefreshing}
            />
            <MetricTile
              label="Active activities"
              value={String(metrics.activeActivitiesCount)}
              href="/activities?status=published"
              ariaLabel={`View ${metrics.activeActivitiesCount} published activities`}
              hint="Live registration forms"
              animationDelayMs={120}
              isRefreshing={isRefreshing}
            />
            <MetricTile
              label="Follow-up coverage"
              value={formatCoveragePercent(metrics.followUpCoveragePercent)}
              href="/clients?leadStatus=new"
              ariaLabel={`View clients needing follow-up — ${formatCoveragePercent(metrics.followUpCoveragePercent)} coverage`}
              hint="Leads contacted vs new"
              animationDelayMs={180}
              isRefreshing={isRefreshing}
            />
          </div>

          <DashboardRegistrationsTrendChart
            points={metrics.registrationsTrend}
            trendDays={metrics.trendDays}
            compact
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-start">
            <ActivityPerformanceSection
              items={metrics.activityPerformance}
              periodLabel={periodLabel}
            />
            <DashboardCommunityPulse variant="overview" />
          </div>

          <DashboardRecentCampaignsSection />
        </>
      ) : null}

      {viewMode === "graphs" ? (
        <>
          <DashboardMetricsGraphs
            metrics={metrics}
            periodLabel={periodLabel}
            isRefreshing={isRefreshing}
          />
          <DashboardRegistrationsTrendChart
            points={metrics.registrationsTrend}
            trendDays={metrics.trendDays}
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
            <DashboardActivityPerformanceGraph
              items={metrics.activityPerformance}
              periodLabel={periodLabel}
            />
            <DashboardLeadStatusChart breakdown={metrics.leadStatusBreakdown} />
          </div>
          <DashboardCommunityPulse variant="graphs" />
        </>
      ) : null}

      {viewMode === "tables" ? (
        <>
          <DashboardMetricsTable metrics={metrics} periodLabel={periodLabel} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-start">
            <DashboardActivityPerformanceTable
              items={metrics.activityPerformance}
              periodLabel={periodLabel}
            />
            <DashboardCommunityPulse variant="tables" />
          </div>
        </>
      ) : null}
    </div>
  );
}
