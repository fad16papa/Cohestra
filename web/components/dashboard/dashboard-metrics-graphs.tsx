"use client";

import Link from "next/link";

import type { DashboardMetrics } from "@/lib/dashboard-api";
import { computeWowDeltaPercent } from "@/lib/dashboard-insights";
import { cn } from "@/lib/utils";

type DashboardMetricsGraphsProps = {
  metrics: DashboardMetrics;
  periodLabel: string;
  isRefreshing?: boolean;
};

type StatItem = {
  label: string;
  displayValue: string;
  caption: string;
  href: string;
  ariaLabel: string;
};

function formatCoveragePercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "no prior data";
  }

  const magnitude =
    Math.abs(value) >= 10 ? Math.round(Math.abs(value)) : Math.abs(value).toFixed(1);
  if (value > 0) {
    return `+${magnitude}% vs prior week`;
  }

  if (value < 0) {
    return `−${magnitude}% vs prior week`;
  }

  return "flat vs prior week";
}

/** Compact KPI stat band for the graphs view — values with context captions. */
export function DashboardMetricsGraphs({
  metrics,
  periodLabel,
  isRefreshing = false,
}: DashboardMetricsGraphsProps) {
  const wowDelta = computeWowDeltaPercent(
    metrics.registrationsInPeriod,
    metrics.registrationsInPreviousPeriod
  );

  const items: StatItem[] = [
    {
      label: "Total leads",
      displayValue: String(metrics.totalLeads),
      caption: "All captured contacts",
      href: "/clients",
      ariaLabel: `View all ${metrics.totalLeads} leads`,
    },
    {
      label: `Registrations ${periodLabel}`,
      displayValue: String(metrics.registrationsInPeriod),
      caption: formatSignedPercent(wowDelta),
      href: "/reports",
      ariaLabel: `${metrics.registrationsInPeriod} registrations ${periodLabel}`,
    },
    {
      label: `New leads ${periodLabel}`,
      displayValue: String(metrics.newLeadsInPeriod),
      caption: "Clients with a recent registration",
      href: `/clients?registeredWithinDays=${metrics.periodDays}`,
      ariaLabel: `View ${metrics.newLeadsInPeriod} recent leads`,
    },
    {
      label: "Active activities",
      displayValue: String(metrics.activeActivitiesCount),
      caption: "Live registration forms",
      href: "/activities?status=published",
      ariaLabel: `View ${metrics.activeActivitiesCount} published activities`,
    },
    {
      label: "Follow-up coverage",
      displayValue: formatCoveragePercent(metrics.followUpCoveragePercent),
      caption: "Leads contacted vs new",
      href: "/clients?leadStatus=new",
      ariaLabel: `Follow-up coverage ${formatCoveragePercent(metrics.followUpCoveragePercent)}`,
    },
  ];

  return (
    <section
      aria-labelledby="dashboard-metrics-graphs-heading"
      className={cn(
        "overflow-hidden rounded-xl border border-border-warm bg-card/90",
        isRefreshing && "motion-safe:animate-pulse"
      )}
    >
      <h3 id="dashboard-metrics-graphs-heading" className="sr-only">
        Key metrics
      </h3>
      <dl className="grid grid-cols-2 divide-border-warm/70 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.ariaLabel}
            className="group px-4 py-4 transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
              {item.label}
            </dt>
            <dd className="mt-1.5 tabular-nums text-2xl font-semibold text-text-warm transition-colors group-hover:text-primary">
              {item.displayValue}
            </dd>
            <dd className="mt-1 text-xs text-text-muted-warm">{item.caption}</dd>
          </Link>
        ))}
      </dl>
    </section>
  );
}
