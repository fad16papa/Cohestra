import Link from "next/link";

import type { DashboardMetrics } from "@/lib/dashboard-api";
import { computeWowDeltaPercent } from "@/lib/dashboard-insights";

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
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-xl border border-border-warm bg-card/90"
    >
      <div className="border-b border-border-warm px-4 py-3 sm:px-5">
        <h3 id={headingId} className="text-section text-text-warm">
          {title}
        </h3>
        <p className="mt-1 text-sm text-text-muted-warm">{description}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] text-left text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-text-muted-warm">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium sm:px-5">
                Metric
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">
                Value
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell sm:px-5">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-warm">
            {rows.map((row) => (
              <tr key={row.metric} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-text-warm sm:px-5">
                  <Link
                    href={row.href}
                    className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {row.metric}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-warm sm:px-5">
                  {row.value}
                </td>
                <td className="hidden px-4 py-3 text-text-muted-warm sm:table-cell sm:px-5">
                  {row.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
