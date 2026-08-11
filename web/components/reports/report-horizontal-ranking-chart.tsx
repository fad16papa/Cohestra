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

import { ChartTooltipFrame } from "@/components/dashboard/dashboard-chart-card";

export type ReportRankingChartItem = {
  id: string;
  shortLabel: string;
  fullLabel: string;
  value: number;
  color: string;
};

type RankingTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: ReportRankingChartItem & { total: number } }>;
};

function RankingTooltip({ active, payload }: RankingTooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) {
    return null;
  }

  const share =
    row.total > 0
      ? `${row.total >= 10 || Number.isInteger((row.value / row.total) * 100) ? Math.round((row.value / row.total) * 100) : ((row.value / row.total) * 100).toFixed(1)}%`
      : "0%";

  return (
    <ChartTooltipFrame
      title={row.fullLabel}
      rows={[
        { label: "Registrations", value: String(row.value), color: row.color },
        { label: "Share", value: share },
      ]}
    />
  );
}

type ReportHorizontalRankingChartProps = {
  items: ReportRankingChartItem[];
  emptyMessage?: string;
  height?: number;
};

export function ReportHorizontalRankingChart({
  items,
  emptyMessage = "No data for this period.",
  height,
}: ReportHorizontalRankingChartProps) {
  const visibleItems = items.slice(0, 6);
  const total = visibleItems.reduce((sum, item) => sum + item.value, 0);
  const chartData = visibleItems.map((item) => ({ ...item, total }));
  const chartHeight = height ?? Math.max(160, visibleItems.length * 36);

  if (visibleItems.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-warm px-4 py-8 text-center text-sm text-text-muted-warm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
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
            dataKey="shortLabel"
            width={36}
            tick={{ fill: "var(--text-muted-warm)", fontSize: 11, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<RankingTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
            {chartData.map((item) => (
              <Cell key={item.id} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
