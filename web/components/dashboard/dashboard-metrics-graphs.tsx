import Link from "next/link";

import type { DashboardMetrics } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

type DashboardMetricsGraphsProps = {
  metrics: DashboardMetrics;
  periodLabel: string;
  isRefreshing?: boolean;
};

type MetricBarItem = {
  label: string;
  value: number;
  displayValue: string;
  href: string;
  ariaLabel: string;
  maxValue: number;
};

function formatCoveragePercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function DashboardMetricsGraphs({
  metrics,
  periodLabel,
  isRefreshing = false,
}: DashboardMetricsGraphsProps) {
  const items: MetricBarItem[] = [
    {
      label: "Total leads",
      value: metrics.totalLeads,
      displayValue: String(metrics.totalLeads),
      href: "/clients",
      ariaLabel: `View all ${metrics.totalLeads} leads`,
      maxValue: Math.max(metrics.totalLeads, 1),
    },
    {
      label: `New ${periodLabel}`,
      value: metrics.newLeadsInPeriod,
      displayValue: String(metrics.newLeadsInPeriod),
      href: `/clients?registeredWithinDays=${metrics.periodDays}`,
      ariaLabel: `View ${metrics.newLeadsInPeriod} recent leads`,
      maxValue: Math.max(metrics.newLeadsInPeriod, metrics.totalLeads, 1),
    },
    {
      label: "Active activities",
      value: metrics.activeActivitiesCount,
      displayValue: String(metrics.activeActivitiesCount),
      href: "/activities?status=published",
      ariaLabel: `View ${metrics.activeActivitiesCount} published activities`,
      maxValue: Math.max(metrics.activeActivitiesCount, 1),
    },
    {
      label: "Follow-up coverage",
      value: metrics.followUpCoveragePercent,
      displayValue: formatCoveragePercent(metrics.followUpCoveragePercent),
      href: "/clients?leadStatus=new",
      ariaLabel: `Follow-up coverage ${formatCoveragePercent(metrics.followUpCoveragePercent)}`,
      maxValue: 100,
    },
  ];

  return (
    <section aria-labelledby="dashboard-metrics-graphs-heading" className="space-y-4">
      <div>
        <h3 id="dashboard-metrics-graphs-heading" className="text-section text-text-warm">
          Key metrics
        </h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Relative bars for quick comparison across your workspace KPIs.
        </p>
      </div>

      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2",
          isRefreshing && "motion-safe:animate-pulse"
        )}
      >
        {items.map((item) => {
          const widthPercent = Math.max(8, Math.round((item.value / item.maxValue) * 100));

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.ariaLabel}
              className="rounded-xl border border-border-warm bg-card/90 p-4 transition-colors hover:border-primary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-warm">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-text-warm">
                    {item.displayValue}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
