"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltipFrame } from "@/components/dashboard/dashboard-chart-card";
import { formatSharePercent } from "@/components/reports/report-visual-primitives";
import { cn } from "@/lib/utils";

export type ReportDonutSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type DonutTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: ReportDonutSlice & { total: number } }>;
};

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) {
    return null;
  }

  return (
    <ChartTooltipFrame
      title={slice.label}
      rows={[
        { label: "Count", value: String(slice.value), color: slice.color },
        { label: "Share", value: formatSharePercent(slice.value, slice.total) },
      ]}
    />
  );
}

type ReportDonutChartProps = {
  slices: ReportDonutSlice[];
  centerValue: string;
  centerLabel: string;
  size?: "md" | "lg";
  emptyMessage?: string;
};

export function ReportDonutChart({
  slices,
  centerValue,
  centerLabel,
  size = "md",
  emptyMessage = "No data yet.",
}: ReportDonutChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const chartData = slices.filter((slice) => slice.value > 0).map((slice) => ({ ...slice, total }));
  const dimension = size === "lg" ? "h-52 w-52" : "h-40 w-40";
  const valueClass = size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl";

  if (total === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-warm px-4 py-8 text-center text-sm text-text-muted-warm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={`relative mx-auto shrink-0 ${dimension}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<DonutTooltip />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            innerRadius="54%"
            outerRadius="88%"
            paddingAngle={chartData.length > 1 ? 2 : 0}
            strokeWidth={0}
          >
            {chartData.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("tabular-nums font-semibold text-text-warm", valueClass)}>
          {centerValue}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-text-muted-warm">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}
