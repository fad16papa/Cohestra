"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartTooltipFrame,
  DashboardChartCard,
} from "@/components/dashboard/dashboard-chart-card";
import type { ReportFollowUpStatus } from "@/lib/reports-api";

const STATUS_COLORS = [
  "var(--chart-4)",
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
] as const;

type ReportFollowUpChartProps = {
  followUpStatus: ReportFollowUpStatus;
};

type FollowUpTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: { label: string; count: number } }>;
};

function FollowUpTooltip({ active, payload }: FollowUpTooltipProps) {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <ChartTooltipFrame
      title={row.label}
      rows={[{ label: "Clients", value: String(row.count) }]}
    />
  );
}

export function ReportFollowUpChart({ followUpStatus }: ReportFollowUpChartProps) {
  const data = [
    { label: "New", count: followUpStatus.newCount },
    { label: "Contacted", count: followUpStatus.contactedCount },
    { label: "Active", count: followUpStatus.activeCount },
    { label: "Inactive", count: followUpStatus.inactiveCount },
  ];

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <DashboardChartCard
      headingId="report-follow-up-chart-heading"
      title="Follow-up pipeline"
      description="Current lead status for clients in this report cohort."
      headerAside={
        <p className="text-right text-sm font-semibold text-text-warm">
          {total} clients
        </p>
      }
    >
      {total === 0 ? (
        <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No clients in this cohort yet.
        </p>
      ) : (
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid
                stroke="var(--border-warm)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border-warm)" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<FollowUpTooltip />} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((item, index) => (
                  <Cell key={item.label} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardChartCard>
  );
}
