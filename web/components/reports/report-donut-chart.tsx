"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { ChartTooltipFrame } from "@/components/dashboard/dashboard-chart-card";
import { formatSharePercent } from "@/components/reports/report-visual-primitives";
import { cn } from "@/lib/utils";

export type ReportDonutSlice = {
  id: string;
  label: string;
  /** Full name for hover tooltip; defaults to `label`. */
  fullLabel?: string;
  value: number;
  color: string;
};

type ReportDonutChartProps = {
  slices: ReportDonutSlice[];
  centerValue: string;
  centerLabel: string;
  /** Metric label in hover tooltip rows (e.g. Registrations, Clients). */
  valueLabel?: string;
  size?: "md" | "lg";
  emptyMessage?: string;
};

type ActiveSlice = ReportDonutSlice & { total: number };

export function ReportDonutChart({
  slices,
  centerValue,
  centerLabel,
  valueLabel = "Registrations",
  size = "md",
  emptyMessage = "No data yet.",
}: ReportDonutChartProps) {
  const [activeSlice, setActiveSlice] = useState<ActiveSlice | null>(null);
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
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            innerRadius="54%"
            outerRadius="88%"
            paddingAngle={chartData.length > 1 ? 2 : 0}
            strokeWidth={0}
            onMouseEnter={(_data, index) => {
              const slice = chartData[index];
              if (slice) {
                setActiveSlice(slice);
              }
            }}
            onMouseLeave={() => setActiveSlice(null)}
          >
            {chartData.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-1">
        {activeSlice ? (
          <ChartTooltipFrame
            className="min-w-0 max-w-full px-2.5 py-2 shadow-lg [&>p]:line-clamp-2"
            title={activeSlice.fullLabel ?? activeSlice.label}
            rows={[
              {
                label: valueLabel,
                value: String(activeSlice.value),
                color: activeSlice.color,
              },
              {
                label: "Share",
                value: formatSharePercent(activeSlice.value, activeSlice.total),
              },
            ]}
          />
        ) : (
          <div className="flex flex-col items-center px-3 text-center">
            <span className={cn("tabular-nums font-semibold text-text-warm", valueClass)}>
              {centerValue}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-text-muted-warm">
              {centerLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
