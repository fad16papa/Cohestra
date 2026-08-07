import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  DashboardPanelHeader,
  DashboardPanelSection,
} from "@/components/dashboard/dashboard-matched-panel";
import type { DashboardMetrics } from "@/lib/dashboard-api";
import { computeWowDeltaPercent } from "@/lib/dashboard-insights";
import { cn } from "@/lib/utils";

type DashboardMetricsTableProps = {
  metrics: DashboardMetrics;
  periodLabel: string;
};

type MetricRow = {
  metric: string;
  value: string;
  detail: string;
  href: string;
};

function formatCoveragePercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatWowDetail(current: number, previous: number): string {
  const delta = computeWowDeltaPercent(current, previous);
  if (delta === null) {
    return `Previous week: ${previous}`;
  }

  const magnitude =
    Math.abs(delta) >= 10 ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1);
  const direction = delta > 0 ? `up ${magnitude}%` : delta < 0 ? `down ${magnitude}%` : "flat";
  return `${direction} vs previous week (${previous})`;
}

export function DashboardMetricsTable({
  metrics,
  periodLabel,
}: DashboardMetricsTableProps) {
  const breakdown = metrics.leadStatusBreakdown;

  const kpiRows: MetricRow[] = [
    {
      metric: "Total leads",
      value: String(metrics.totalLeads),
      detail: "All captured contacts",
      href: "/clients",
    },
    {
      metric: `Registrations ${periodLabel}`,
      value: String(metrics.registrationsInPeriod),
      detail: formatWowDetail(
        metrics.registrationsInPeriod,
        metrics.registrationsInPreviousPeriod
      ),
      href: "/reports",
    },
    {
      metric: `New leads ${periodLabel}`,
      value: String(metrics.newLeadsInPeriod),
      detail: "Clients with a recent registration",
      href: `/clients?registeredWithinDays=${metrics.periodDays}`,
    },
    {
      metric: "Active activities",
      value: String(metrics.activeActivitiesCount),
      detail: "Live registration forms",
      href: "/activities?status=published",
    },
    {
      metric: "Follow-up coverage",
      value: formatCoveragePercent(metrics.followUpCoveragePercent),
      detail: "Leads contacted vs new",
      href: "/clients?leadStatus=new",
    },
  ];

  const pipelineRows: MetricRow[] = [
    {
      metric: "New",
      value: String(breakdown.newCount),
      detail: "Waiting for first follow-up",
      href: "/clients?leadStatus=new",
    },
    {
      metric: "Contacted",
      value: String(breakdown.contactedCount),
      detail: "Outreach started",
      href: "/clients?leadStatus=contacted",
    },
    {
      metric: "Active",
      value: String(breakdown.activeCount),
      detail: "Engaged and participating",
      href: "/clients?leadStatus=active",
    },
    {
      metric: "Inactive",
      value: String(breakdown.inactiveCount),
      detail: "No recent engagement",
      href: "/clients?leadStatus=inactive",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <MetricsTableCard
        headingId="dashboard-metrics-table-heading"
        title="Key metrics"
        description="Scan KPIs in a compact table — tap a row to drill down."
        rows={kpiRows}
      />
      <MetricsTableCard
        headingId="dashboard-pipeline-table-heading"
        title="Lead pipeline"
        description="Client list by lead status."
        rows={pipelineRows}
      />
    </div>
  );
}

function MetricsTableCard({
  headingId,
  title,
  description,
  rows,
}: {
  headingId: string;
  title: string;
  description: string;
  rows: MetricRow[];
}) {
  return (
    <DashboardPanelSection aria-labelledby={headingId}>
      <DashboardPanelHeader
        headingId={headingId}
        title={title}
        description={description}
      />

      <div className="overflow-hidden rounded-xl border border-border-warm bg-card/90">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-warm bg-muted/30 text-xs uppercase tracking-wide text-text-muted-warm">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">
                Metric
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium sm:px-5">
                Value
              </th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell sm:px-5">
                Detail
              </th>
              <th scope="col" className="w-8 px-2 py-2.5 sm:px-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-warm">
            {rows.map((row) => (
              <tr key={row.metric} className="group transition-colors hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium text-text-warm sm:px-5">
                  <Link
                    href={row.href}
                    className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {row.metric}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-text-warm sm:px-5">
                  {row.value}
                </td>
                <td className="hidden px-4 py-2.5 text-text-muted-warm sm:table-cell sm:px-5">
                  {row.detail}
                </td>
                <td className="px-2 py-2.5 sm:px-3">
                  <Link
                    href={row.href}
                    aria-label={`Open ${row.metric}`}
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-md text-text-muted-warm",
                      "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
                      "hover:bg-muted/60 hover:text-text-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanelSection>
  );
}
