"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ActivityPerformanceSection } from "@/components/dashboard/activity-performance-section";
import { DashboardActivityPerformanceGraph } from "@/components/dashboard/dashboard-activity-performance-graph";
import { DashboardActivityPerformanceTable } from "@/components/dashboard/dashboard-activity-performance-table";
import { DashboardCommunityPulse } from "@/components/dashboard/dashboard-community-pulse";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardFollowUpQueue } from "@/components/dashboard/dashboard-follow-up-queue";
import { DashboardGreetingHeader } from "@/components/dashboard/dashboard-greeting-header";
import { DashboardIntelligenceBrief } from "@/components/dashboard/dashboard-intelligence-brief";
import { DashboardLeadStatusChart } from "@/components/dashboard/dashboard-lead-status-chart";
import { DashboardMetricsGraphs } from "@/components/dashboard/dashboard-metrics-graphs";
import { DashboardMetricsTable } from "@/components/dashboard/dashboard-metrics-table";
import { DashboardRegistrationsTrendChart } from "@/components/dashboard/dashboard-registrations-trend-chart";
import { DashboardTodayStrip } from "@/components/dashboard/dashboard-today-strip";
import { useDashboardMetricsRefresh } from "@/components/dashboard/dashboard-metrics-refresh-context";
import { DashboardOnboardingChecklist } from "@/components/dashboard/dashboard-onboarding-checklist";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardRecentCampaignsSection } from "@/components/dashboard/dashboard-recent-campaigns-section";
import { DashboardViewSwitcher } from "@/components/dashboard/dashboard-view-switcher";
import { MetricTile } from "@/components/dashboard/metric-tile";
import { useAuth } from "@/components/auth/auth-provider";
import { MetricSkeletonGrid } from "@/components/shared/list-skeleton";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { ANALYTICS_PATH } from "@/lib/admin-canonical-routes";
import { fetchActivities } from "@/lib/activities-api";
import { fetchDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard-api";
import { computeWowDeltaPercent } from "@/lib/dashboard-insights";
import {
  DASHBOARD_VIEW_QUERY_KEY,
  dashboardHrefForView,
  readDashboardViewMode,
  resolveDashboardView,
  writeDashboardViewMode,
  type DashboardViewMode,
} from "@/lib/dashboard-view-mode";
import {
  buildDashboardOnboardingItems,
  isDashboardOnboardingDismissed,
  shouldShowDashboardOnboarding,
} from "@/lib/dashboard-onboarding";

const METRICS_POLL_INTERVAL_MS = 60_000;

function formatCoveragePercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function DashboardPageClient() {
  const { authFetch, status } = useAuth();
  const refreshContext = useDashboardMetricsRefresh();
  const setLastUpdatedAt = refreshContext?.setLastUpdatedAt;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [preference, setPreference] = useState<DashboardViewMode>("overview");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [hasActivities, setHasActivities] = useState<boolean | null>(null);
  const [totalActivityCount, setTotalActivityCount] = useState(0);
  const [showOnboardingChecklist, setShowOnboardingChecklist] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const sessionRef = useRef(`dashboard-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    setPreference(readDashboardViewMode());
  }, []);

  const viewMode = resolveDashboardView(
    searchParams.get(DASHBOARD_VIEW_QUERY_KEY),
    preference
  );

  function handleViewModeChange(mode: DashboardViewMode) {
    setPreference(mode);
    writeDashboardViewMode(mode);
    if (pathname !== "/dashboard") {
      return;
    }
    router.push(dashboardHrefForView(mode, searchParams.toString()), { scroll: false });
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
        setTotalActivityCount(activitiesResult.totalCount);
        setShowOnboardingChecklist(
          shouldShowDashboardOnboarding(
            metricsResult,
            activitiesResult.totalCount,
            isDashboardOnboardingDismissed()
          )
        );
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
          setShowOnboardingChecklist(
            shouldShowDashboardOnboarding(
              result,
              totalActivityCount,
              isDashboardOnboardingDismissed()
            )
          );
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
  }, [authFetch, error, initialized, setLastUpdatedAt, status, totalActivityCount]);

  const shell = (
    <>
      <DashboardGreetingHeader />
      <DashboardViewSwitcher value={viewMode} onChange={handleViewModeChange} />
    </>
  );

  if (status === "loading" || !initialized) {
    return (
      <div
        className="mx-auto w-full min-w-0 max-w-6xl space-y-8"
        data-testid="dashboard-session"
        data-dashboard-session={sessionRef.current}
      >
        {shell}
        <MetricSkeletonGrid />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="mx-auto w-full min-w-0 max-w-6xl space-y-8"
        data-testid="dashboard-session"
        data-dashboard-session={sessionRef.current}
      >
        {shell}
        <div
          id="dashboard-view-panel"
          role="tabpanel"
          aria-labelledby={`dashboard-view-${viewMode}`}
        >
          <ProductErrorState
            message={error}
            onRetry={() => {
              setInitialized(false);
              setError(null);
              setReloadToken((current) => current + 1);
            }}
          />
        </div>
      </div>
    );
  }

  const periodLabel =
    metrics && metrics.periodDays === 7 ? "this week" : `last ${metrics?.periodDays ?? 7} days`;
  const registrationsWowDelta = metrics
    ? computeWowDeltaPercent(metrics.registrationsInPeriod, metrics.registrationsInPreviousPeriod)
    : 0;

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl space-y-8"
      data-testid="dashboard-session"
      data-dashboard-session={sessionRef.current}
    >
      {shell}
      <DashboardIntelligenceBrief />
      <DashboardFollowUpQueue />

      <div
        id="dashboard-view-panel"
        role="tabpanel"
        aria-labelledby={`dashboard-view-${viewMode}`}
        className="space-y-8"
      >
        {hasActivities === false ? <DashboardEmptyState /> : null}

        {hasActivities !== false && !metrics ? <MetricSkeletonGrid /> : null}

        {metrics && hasActivities !== false ? (
          <>
            {showOnboardingChecklist ? (
              <DashboardOnboardingChecklist
                items={buildDashboardOnboardingItems(metrics, totalActivityCount)}
                onDismiss={() => setShowOnboardingChecklist(false)}
              />
            ) : null}
            <DashboardTodayStrip metrics={metrics} periodLabel={periodLabel} />

            {viewMode === "overview" ? (
              <>
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
                    href={ANALYTICS_PATH}
                    ariaLabel={`${metrics.registrationsInPeriod} registrations ${periodLabel} — open analytics`}
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
                    href="/follow-up"
                    ariaLabel={`View follow-up coverage — ${formatCoveragePercent(metrics.followUpCoveragePercent)} coverage`}
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
                <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-start">
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
                <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-stretch">
                  <DashboardActivityPerformanceGraph
                    items={metrics.activityPerformance}
                    periodLabel={periodLabel}
                    className="h-full min-w-0"
                  />
                  <DashboardLeadStatusChart
                    breakdown={metrics.leadStatusBreakdown}
                    className="h-full min-w-0"
                    fill
                  />
                </div>
                <DashboardCommunityPulse variant="graphs" />
              </>
            ) : null}

            {viewMode === "table" ? (
              <>
                <DashboardMetricsTable metrics={metrics} periodLabel={periodLabel} />
                <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-start">
                  <DashboardActivityPerformanceTable
                    items={metrics.activityPerformance}
                    periodLabel={periodLabel}
                  />
                  <DashboardCommunityPulse variant="table" />
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
