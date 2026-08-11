"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartTooltipFrame,
  DashboardChartCard,
} from "@/components/dashboard/dashboard-chart-card";
import type { ReportActivityRankingItem } from "@/lib/reports-api";

type ReportActivityRankingChartProps = {
  items: ReportActivityRankingItem[];
};

type RankingTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: { name: string; count: number } }>;
};

function RankingTooltip({ active, payload }: RankingTooltipProps) {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <ChartTooltipFrame
      title={row.name}
      rows={[{ label: "Registrations", value: String(row.count) }]}
    />
  );
}

export function ReportActivityRankingChart({ items }: ReportActivityRankingChartProps) {
  const chartItems = items.slice(0, 6).map((item) => ({
    id: item.activityId,
    name: item.activityName,
    count: item.registrationCount,
  }));

  return (
    <DashboardChartCard
      headingId="report-activity-ranking-chart-heading"
      title="Top activities"
      description="Registration volume by activity in this report."
    >
      {chartItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          Rankings unlock on Core when activities receive registrations.
        </p>
      ) : (
        <>
          <div style={{ height: Math.max(180, chartItems.length * 42) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartItems}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
              >
                <CartesianGrid
                  stroke="var(--border-warm)"
                  strokeDasharray="4 4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<RankingTooltip />} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 space-y-2">
            {items.slice(0, 5).map((item, index) => (
              <li key={item.activityId}>
                <Link
                  href={`/activities/${item.activityId}`}
                  className="flex items-center justify-between rounded-lg border border-border-warm px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="text-text-warm">
                    #{index + 1} {item.activityName}
                  </span>
                  <span className="text-text-muted-warm">{item.registrationCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardChartCard>
  );
}
