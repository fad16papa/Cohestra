import Link from "next/link";

import type { DashboardMetrics } from "@/lib/dashboard-api";

type DashboardMetricsTableProps = {
  metrics: DashboardMetrics;
  periodLabel: string;
};

function formatCoveragePercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function DashboardMetricsTable({
  metrics,
  periodLabel,
}: DashboardMetricsTableProps) {
  const rows = [
    {
      metric: "Total leads",
      value: String(metrics.totalLeads),
      detail: "All captured contacts",
      href: "/clients",
    },
    {
      metric: `New ${periodLabel}`,
      value: String(metrics.newLeadsInPeriod),
      detail: "Recent sign-ups",
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

  return (
    <section aria-labelledby="dashboard-metrics-table-heading" className="overflow-hidden rounded-xl border border-border-warm bg-card/90">
      <div className="border-b border-border-warm px-4 py-3 sm:px-5">
        <h3 id="dashboard-metrics-table-heading" className="text-section text-text-warm">
          Key metrics
        </h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Scan KPIs in a compact table — tap a row to drill down.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-text-muted-warm">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium sm:px-5">
                Metric
              </th>
              <th scope="col" className="px-4 py-3 font-medium sm:px-5">
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
                  <Link href={row.href} className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {row.metric}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums text-text-warm sm:px-5">{row.value}</td>
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
